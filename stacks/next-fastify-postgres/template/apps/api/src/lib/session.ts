import { createHash, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { and, eq, gt, lt, or } from 'drizzle-orm';
import type { User } from '@app/shared';
import type { Db } from '../db/client.ts';
import { sessions, users, type UserRow } from '../db/schema.ts';
import { unauthenticated } from './errors.ts';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const SESSION_COOKIE = 'sid';
/** Absolute lifetime: a session ends 30 days after login even if it is used every day. */
export const SESSION_TTL_MS = 30 * DAY_MS;
/** Idle timeout: a session unused for 7 days ends. */
export const SESSION_IDLE_TIMEOUT_MS = 7 * DAY_MS;
/** last_seen_at is written at most this often per session (not on every request). */
const SESSION_TOUCH_INTERVAL_MS = 5 * MINUTE_MS;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const toUserDto = (row: Pick<UserRow, 'id' | 'email' | 'createdAt'>): User => {
  return { id: row.id, email: row.email, createdAt: row.createdAt.toISOString() };
};

/** Creates a session row and sets the signed, httpOnly, SameSite=Lax cookie. */
export const startSession = async (request: FastifyRequest, reply: FastifyReply, userId: string): Promise<void> => {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_MS);
  await request.server.db.insert(sessions).values({ id: hashToken(token), userId, expiresAt, lastSeenAt: new Date(now) });
  reply.setCookie(SESSION_COOKIE, token, {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    secure: request.server.env.COOKIE_SECURE,
    path: '/',
    expires: expiresAt,
  });
};

const sessionToken = (request: FastifyRequest): string | null => {
  const raw = request.cookies[SESSION_COOKIE];

  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);

  return unsigned.valid ? unsigned.value : null;
};

export const endSession = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const token = sessionToken(request);

  if (token) await request.server.db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
};

const sessionUser = async (request: FastifyRequest, now = new Date()): Promise<User | null> => {
  const token = sessionToken(request);

  if (!token) return null;
  const id = hashToken(token);
  const idleCutoff = new Date(now.getTime() - SESSION_IDLE_TIMEOUT_MS);
  const [row] = await request.server.db
    .select({ id: users.id, email: users.email, createdAt: users.createdAt, lastSeenAt: sessions.lastSeenAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now), gt(sessions.lastSeenAt, idleCutoff)))
    .limit(1);

  if (!row) return null;

  // Sliding idle timeout, throttled so an active user costs one write per interval.
  if (now.getTime() - row.lastSeenAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
    await request.server.db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, id));
  }

  return toUserDto(row);
};

/** Deletes sessions past their absolute expiry or idle timeout. Returns how many were removed. */
export const purgeExpiredSessions = async (db: Db, now = new Date()): Promise<number> => {
  const idleCutoff = new Date(now.getTime() - SESSION_IDLE_TIMEOUT_MS);
  const removed = await db
    .delete(sessions)
    .where(or(lt(sessions.expiresAt, now), lt(sessions.lastSeenAt, idleCutoff)))
    .returning({ id: sessions.id });

  return removed.length;
};

/** preHandler for protected routes: `{ preHandler: requireUser }`. Then use `currentUser(request)`. */
export const requireUser = async (request: FastifyRequest): Promise<void> => {
  const user = await sessionUser(request);

  if (!user) throw unauthenticated();
  request.user = user;
};

/** The authenticated user; only valid inside routes guarded by `requireUser`. */
export const currentUser = (request: FastifyRequest): User => {
  if (!request.user) throw unauthenticated();

  return request.user;
};
