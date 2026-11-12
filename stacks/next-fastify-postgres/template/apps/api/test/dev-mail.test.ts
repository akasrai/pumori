import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiErrorSchema, devMailListResponseSchema } from '@app/shared';
import { buildApp } from '../src/app.ts';
import { createTestApp, productionEnv, signUp } from './helpers.ts';

let app: FastifyInstance;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.close();
});

describe('dev-only mail outbox', () => {
  it('requires a session', async () => {
    const res = await app.inject({ method: 'GET', url: '/dev/mail' });

    expect(res.statusCode).toBe(401);
  });

  it('shows a user only the mail sent to their own address', async () => {
    const a = await signUp(app);
    const b = await signUp(app);
    await app.mailer.send({ to: a.email, subject: 'For A', text: 'hello A' });
    await app.mailer.send({ to: b.email, subject: 'For B', text: 'hello B' });

    const res = await app.inject({ method: 'GET', url: '/dev/mail', headers: { cookie: a.cookie } });

    expect(res.statusCode).toBe(200);
    expect(devMailListResponseSchema.parse(res.json()).mail.map((m) => m.subject)).toEqual(['For A']);
  });

  it('does not exist in production', async () => {
    const prod = await buildApp({ env: productionEnv(), logger: false });

    try {
      const a = await signUp(prod);
      const res = await prod.inject({ method: 'GET', url: '/dev/mail', headers: { cookie: a.cookie } });

      expect(res.statusCode).toBe(404);
      expect(apiErrorSchema.parse(res.json()).error.code).toBe('NOT_FOUND');
    } finally {
      await prod.close();
    }
  });
});
