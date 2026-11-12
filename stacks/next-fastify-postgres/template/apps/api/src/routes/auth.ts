import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { ErrorCode, emailSchema, loginInputSchema, signupInputSchema, type AuthResponse } from '@app/shared';
import { users } from '../db/schema.ts';
import { AppError, conflict } from '../lib/errors.ts';
import { hashPassword, needsRehash, verifyAgainstDummy, verifyPassword } from '../lib/password.ts';
import { AUTH_WINDOW_MS, authIpRateLimit, createKeyedLimiter } from '../lib/rate-limit.ts';
import { currentUser, endSession, purgeExpiredSessions, requireUser, startSession, toUserDto } from '../lib/session.ts';
import { parse } from '../lib/validate.ts';

/** Expired sessions are purged on startup and, at most this often, after a successful login. */
const PURGE_INTERVAL_MS = 60 * 60 * 1000;

const loginEmailKey = (body: unknown): string => {
  const email = typeof body === 'object' && body !== null && 'email' in body ? body.email : undefined;
  const parsed = emailSchema.safeParse(email);

  return parsed.success ? parsed.data : '';
};

export const authRoutes: FastifyPluginAsync = async (app) => {
  const limitLoginEmail = createKeyedLimiter(app, {
    name: 'login-email',
    max: app.env.RATE_LIMIT_LOGIN_EMAIL_MAX,
    timeWindow: AUTH_WINDOW_MS,
    keyOf: (request) => loginEmailKey(request.body),
  });
  let lastPurgeAt = Date.now();

  const purgeOccasionally = async (): Promise<void> => {
    if (Date.now() - lastPurgeAt < PURGE_INTERVAL_MS) return;
    lastPurgeAt = Date.now();

    try {
      await purgeExpiredSessions(app.db);
    } catch (err) {
      app.log.warn({ err }, 'session purge failed');
    }
  };

  app.post('/auth/signup', { config: authIpRateLimit(app) }, async (request, reply): Promise<AuthResponse> => {
    const input = parse(signupInputSchema, request.body);
    const passwordHash = await hashPassword(input.password);
    const [row] = await app.db
      .insert(users)
      .values({ email: input.email, passwordHash })
      .onConflictDoNothing({ target: users.email })
      .returning();

    if (!row) throw conflict(ErrorCode.EmailTaken, 'An account with this email already exists');
    await startSession(request, reply, row.id);
    reply.status(201);

    return { user: toUserDto(row) };
  });

  app.post('/auth/login', { config: authIpRateLimit(app) }, async (request, reply): Promise<AuthResponse> => {
    const input = parse(loginInputSchema, request.body);
    // Per-email limit (on top of the per-IP one): slows password guessing spread over many IPs.
    await limitLoginEmail(request, reply);
    const [row] = await app.db.select().from(users).where(eq(users.email, input.email)).limit(1);
    const ok = row ? await verifyPassword(input.password, row.passwordHash) : await verifyAgainstDummy(input.password);

    if (!row || !ok) throw new AppError(401, ErrorCode.InvalidCredentials, 'Invalid email or password');

    // Upgrade hashes made with older scrypt parameters while the plain password is at hand.
    if (needsRehash(row.passwordHash)) {
      await app.db.update(users).set({ passwordHash: await hashPassword(input.password) }).where(eq(users.id, row.id));
    }
    await startSession(request, reply, row.id);
    await purgeOccasionally();

    return { user: toUserDto(row) };
  });

  app.post('/auth/logout', async (request, reply) => {
    await endSession(request, reply);

    return reply.status(204).send();
  });

  app.get('/auth/me', { preHandler: requireUser }, async (request): Promise<AuthResponse> => {
    return { user: currentUser(request) };
  });
};
