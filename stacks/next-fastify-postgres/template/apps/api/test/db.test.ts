import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestAppWith } from './helpers.ts';

let app: FastifyInstance;
beforeAll(async () => {
  app = await createTestAppWith({ DB_STATEMENT_TIMEOUT_MS: 1500 });
});
afterAll(async () => {
  await app.close();
});

describe('database client', () => {
  it('every pooled connection has the configured statement_timeout', async () => {
    const rows = await app.db.execute<{ statement_timeout: string }>(sql`show statement_timeout`);

    expect(rows[0]?.statement_timeout).toBe('1500ms');
  });

  it('a statement running past the timeout is cancelled', async () => {
    await expect(app.db.execute(sql`select pg_sleep(3)`)).rejects.toThrow();
  });
});
