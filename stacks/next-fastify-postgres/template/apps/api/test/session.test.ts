import type { FastifyInstance } from 'fastify';
import { eq, inArray, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sessions, users } from '../src/db/schema.ts';
import { hashPassword, needsRehash, PASSWORD_PARAMS, verifyPassword } from '../src/lib/password.ts';
import { purgeExpiredSessions, SESSION_IDLE_TIMEOUT_MS } from '../src/lib/session.ts';
import { createTestApp, signUp } from './helpers.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

let app: FastifyInstance;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.close();
});

const ageSessions = async (userId: string, lastSeenMsAgo: number) => {
  await app.db.update(sessions).set({ lastSeenAt: new Date(Date.now() - lastSeenMsAgo) }).where(eq(sessions.userId, userId));
};

const me = (cookie: string) => app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });

describe('session idle timeout', () => {
  it('a session unused for longer than the idle timeout is rejected', async () => {
    const a = await signUp(app);
    await ageSessions(a.user.id, SESSION_IDLE_TIMEOUT_MS + 60_000);

    expect((await me(a.cookie)).statusCode).toBe(401);
  });

  it('using a session slides last_seen_at forward', async () => {
    const a = await signUp(app);
    await ageSessions(a.user.id, SESSION_IDLE_TIMEOUT_MS - DAY_MS);

    expect((await me(a.cookie)).statusCode).toBe(200);
    const [row] = await app.db.select().from(sessions).where(eq(sessions.userId, a.user.id));

    expect(Date.now() - (row?.lastSeenAt.getTime() ?? 0)).toBeLessThan(60_000);
    expect((await me(a.cookie)).statusCode).toBe(200);
  });

  it('purge removes idle and expired sessions and keeps live ones', async () => {
    const idle = await signUp(app);
    const expired = await signUp(app);
    const live = await signUp(app);
    await ageSessions(idle.user.id, SESSION_IDLE_TIMEOUT_MS + 60_000);
    await app.db.update(sessions).set({ expiresAt: sql`now() - interval '1 minute'` }).where(eq(sessions.userId, expired.user.id));

    expect(await purgeExpiredSessions(app.db)).toBeGreaterThanOrEqual(2);
    const left = await app.db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(inArray(sessions.userId, [idle.user.id, expired.user.id, live.user.id]));

    expect(left.map((s) => s.userId)).toEqual([live.user.id]);
  });
});

describe('password hashing', () => {
  it('hashes with scrypt N=2^17 and verifies', async () => {
    const hash = await hashPassword('correct horse');

    expect(hash.startsWith(`scrypt$${2 ** 17}$8$1$`)).toBe(true);
    expect(await verifyPassword('correct horse', hash)).toBe(true);
    expect(await verifyPassword('wrong horse', hash)).toBe(false);
    expect(needsRehash(hash)).toBe(false);
  });

  it('login rehashes a password stored with older parameters', async () => {
    const a = await signUp(app);
    const legacy = await hashPassword(a.password, { N: 2 ** 14, r: 8, p: 1 });
    await app.db.update(users).set({ passwordHash: legacy }).where(eq(users.id, a.user.id));

    expect(needsRehash(legacy)).toBe(true);
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: a.email, password: a.password } });

    expect(res.statusCode).toBe(200);
    const [row] = await app.db.select().from(users).where(eq(users.id, a.user.id));

    expect(row?.passwordHash.startsWith(`scrypt$${PASSWORD_PARAMS.N}$`)).toBe(true);
    expect(await verifyPassword(a.password, row?.passwordHash ?? '')).toBe(true);
  });

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPassword('x', 'bcrypt$whatever')).toBe(false);
    expect(await verifyPassword('x', `scrypt$${2 ** 30}$8$1$c2FsdA==$aGFzaA==`)).toBe(false);
  });
});
