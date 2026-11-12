import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiErrorSchema, authResponseSchema } from '@app/shared';
import { createTestApp, sessionCookie, signUp, uniqueEmail } from './helpers.ts';

let app: FastifyInstance;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.close();
});

describe('auth', () => {
  it('GET /livez, /readyz and /health report ok', async () => {
    for (const url of ['/livez', '/readyz', '/health']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: 'ok' });
    }
  });

  it('responses carry security headers', async () => {
    const res = await app.inject({ method: 'GET', url: '/livez' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  it('signup creates a user, normalises the email and sets an httpOnly session cookie', async () => {
    const email = uniqueEmail('Signup');
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email: `  ${email.toUpperCase()} `, password: 'password123' },
    });
    expect(res.statusCode).toBe(201);
    const body = authResponseSchema.parse(res.json());
    expect(body.user.email).toBe(email.toLowerCase());
    expect(JSON.stringify(body)).not.toContain('password');
    const sid = res.cookies.find((c) => c.name === 'sid');
    expect(sid).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
  });

  it('signup rejects invalid input with VALIDATION_ERROR', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: 'nope', password: 'short' } });
    expect(res.statusCode).toBe(400);
    const body = apiErrorSchema.parse(res.json());
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details?.map((d) => d.path)).toEqual(['email', 'password']);
  });

  it('signup with an existing email returns 409 EMAIL_TAKEN', async () => {
    const { email } = await signUp(app);
    const res = await app.inject({ method: 'POST', url: '/auth/signup', payload: { email, password: 'password123' } });
    expect(res.statusCode).toBe(409);
    expect(apiErrorSchema.parse(res.json()).error.code).toBe('EMAIL_TAKEN');
  });

  it('login with correct credentials returns the user and a working session', async () => {
    const { email, password, user } = await signUp(app);
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } });
    expect(res.statusCode).toBe(200);
    expect(authResponseSchema.parse(res.json()).user).toEqual(user);

    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: sessionCookie(res.cookies) } });
    expect(me.statusCode).toBe(200);
    expect(authResponseSchema.parse(me.json()).user.id).toBe(user.id);
  });

  it('login with a wrong password or unknown email returns 401 INVALID_CREDENTIALS', async () => {
    const { email } = await signUp(app);

    for (const payload of [
      { email, password: 'wrong-password' },
      { email: uniqueEmail('ghost'), password: 'whatever123' },
    ]) {
      const res = await app.inject({ method: 'POST', url: '/auth/login', payload });
      expect(res.statusCode).toBe(401);
      expect(apiErrorSchema.parse(res.json()).error.code).toBe('INVALID_CREDENTIALS');
    }
  });

  it('GET /auth/me without a session returns 401 UNAUTHENTICATED', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
    expect(apiErrorSchema.parse(res.json()).error.code).toBe('UNAUTHENTICATED');
  });

  it('GET /auth/me rejects a tampered cookie', async () => {
    const { cookie } = await signUp(app);
    const res = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: `${cookie}x` } });
    expect(res.statusCode).toBe(401);
  });

  it('logout invalidates the session server-side', async () => {
    const { cookie } = await signUp(app);
    const out = await app.inject({ method: 'POST', url: '/auth/logout', headers: { cookie } });
    expect(out.statusCode).toBe(204);
    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(401);
  });

  it('unknown routes return the JSON error shape without echoing the URL', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope/secret-token-value' });
    expect(res.statusCode).toBe(404);
    const body = apiErrorSchema.parse(res.json());
    expect(body.error.code).toBe('NOT_FOUND');
    expect(res.body).not.toContain('secret-token-value');
  });

  it('framework errors get matching codes', async () => {
    const tooLarge = await app.inject({
      method: 'POST', url: '/auth/login', payload: { email: 'a@example.test', password: 'x'.repeat(300 * 1024) },
    });
    expect(tooLarge.statusCode).toBe(413);
    expect(apiErrorSchema.parse(tooLarge.json()).error.code).toBe('PAYLOAD_TOO_LARGE');

    const badType = await app.inject({ method: 'POST', url: '/auth/login', headers: { 'content-type': 'text/x-nope' }, payload: 'x' });
    expect(badType.statusCode).toBe(415);
    expect(apiErrorSchema.parse(badType.json()).error.code).toBe('UNSUPPORTED_MEDIA_TYPE');

    const malformed = await app.inject({ method: 'POST', url: '/auth/login', headers: { 'content-type': 'application/json' }, payload: '{' });
    expect(malformed.statusCode).toBe(400);
    expect(apiErrorSchema.parse(malformed.json()).error.code).toBe('BAD_REQUEST');
  });
});
