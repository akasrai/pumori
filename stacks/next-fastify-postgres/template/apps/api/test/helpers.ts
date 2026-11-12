import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { authResponseSchema, type User } from '@app/shared';
import { buildApp } from '../src/app.ts';
import { loadEnv, type Env } from '../src/env.ts';

/** App wired to this checkout's test database (env comes from apps/api/vitest.config.ts). */
export const createTestApp = (): Promise<FastifyInstance> => {
  return buildApp({ logger: false });
};

/** App with env overrides, e.g. `{ RATE_LIMIT_AUTH_MAX: 2 }` or a production-like config. */
export const createTestAppWith = (overrides: Partial<Env>): Promise<FastifyInstance> => {
  return buildApp({ env: { ...loadEnv(), ...overrides }, logger: false });
};

/** Env as production would parse it (secure cookies, no dev-only features). */
export const productionEnv = (overrides: NodeJS.ProcessEnv = {}): Env => {
  return loadEnv({
    ...process.env,
    NODE_ENV: 'production',
    COOKIE_SECURE: 'true',
    WEB_ORIGIN: 'https://app.example.test',
    ...overrides,
  });
};

/** Unique per call, so test files can run in parallel against the same database. */
export const uniqueEmail = (prefix = 'user'): string => {
  return `${prefix}-${randomUUID()}@example.test`;
};

export interface TestUser {
  user: User;
  email: string;
  password: string;
  /** Pass as `headers: { cookie }` to act as this user. */
  cookie: string;
}

export const sessionCookie = (cookies: Array<{ name: string; value: string }>): string => {
  const sid = cookies.find((c) => c.name === 'sid');

  if (!sid) throw new Error('no sid cookie in response');

  return `sid=${sid.value}`;
};

export const signUp = async (app: FastifyInstance, email = uniqueEmail()): Promise<TestUser> => {
  const password = 'correct horse battery staple';
  const res = await app.inject({ method: 'POST', url: '/auth/signup', payload: { email, password } });

  if (res.statusCode !== 201) throw new Error(`signup failed: ${res.statusCode} ${res.body}`);

  return { user: authResponseSchema.parse(res.json()).user, email, password, cookie: sessionCookie(res.cookies) };
};
