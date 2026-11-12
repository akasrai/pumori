import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { apiErrorSchema } from '@app/shared';
import { createTestAppWith, uniqueEmail } from './helpers.ts';

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

const login = (target: FastifyInstance, email: string, remoteAddress = '203.0.113.10') => {
  return target.inject({ method: 'POST', url: '/auth/login', remoteAddress, payload: { email, password: 'wrong-password' } });
};

describe('rate limiting', () => {
  it('login is limited per IP: the request over the limit gets 429 RATE_LIMITED with Retry-After', async () => {
    app = await createTestAppWith({ RATE_LIMIT_AUTH_MAX: 3 });

    for (let i = 0; i < 3; i++) expect((await login(app, uniqueEmail('ip'))).statusCode).toBe(401);
    const res = await login(app, uniqueEmail('ip'));

    expect(res.statusCode).toBe(429);
    expect(apiErrorSchema.parse(res.json()).error.code).toBe('RATE_LIMITED');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    // Another IP is not affected.
    expect((await login(app, uniqueEmail('ip'), '203.0.113.11')).statusCode).toBe(401);
  });

  it('login is limited per email, even when the attempts come from different IPs', async () => {
    app = await createTestAppWith({ RATE_LIMIT_LOGIN_EMAIL_MAX: 2 });
    const email = uniqueEmail('target');

    expect((await login(app, email, '198.51.100.1')).statusCode).toBe(401);
    expect((await login(app, email.toUpperCase(), '198.51.100.2')).statusCode).toBe(401);
    const res = await login(app, email, '198.51.100.3');

    expect(res.statusCode).toBe(429);
    expect(apiErrorSchema.parse(res.json()).error.code).toBe('RATE_LIMITED');
    expect((await login(app, uniqueEmail('other'), '198.51.100.3')).statusCode).toBe(401);
  });

  it('signup is limited per IP', async () => {
    app = await createTestAppWith({ RATE_LIMIT_AUTH_MAX: 1 });
    const signup = (target: FastifyInstance) => target.inject({
      method: 'POST', url: '/auth/signup', remoteAddress: '203.0.113.20', payload: { email: 'bad', password: 'x' },
    });

    expect((await signup(app)).statusCode).toBe(400);
    expect((await signup(app)).statusCode).toBe(429);
  });

  it('health checks are never rate limited', async () => {
    app = await createTestAppWith({ RATE_LIMIT_MAX: 1 });

    for (let i = 0; i < 3; i++) expect((await app.inject({ method: 'GET', url: '/livez' })).statusCode).toBe(200);
  });
});
