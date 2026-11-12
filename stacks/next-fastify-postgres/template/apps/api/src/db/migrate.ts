import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { loadMigrateEnv } from '../env.ts';

export const MIGRATIONS_DIR = fileURLToPath(new URL('../../drizzle', import.meta.url));

const CONNECT_TIMEOUT_S = 10;
/** DDL waits at most this long for a lock instead of queueing behind live traffic indefinitely. */
const LOCK_TIMEOUT_MS = 10_000;

/** Applies pending drizzle-kit migrations from apps/api/drizzle. Idempotent; forward-only. */
export const runMigrations = async (databaseUrl: string): Promise<void> => {
  const client = postgres(databaseUrl, {
    max: 1,
    connect_timeout: CONNECT_TIMEOUT_S,
    connection: { lock_timeout: LOCK_TIMEOUT_MS },
    onnotice: () => {},
  });

  try {
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_DIR });
  } finally {
    await client.end({ timeout: 5 });
  }
};

// Deploy entry point (the API image's `migrate` command): `node src/db/migrate.ts` with
// DATABASE_URL in the environment. Dev uses `pnpm db:migrate`, which also reads .env.
if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.filename) {
  const { DATABASE_URL } = loadMigrateEnv();
  await runMigrations(DATABASE_URL);
  process.stdout.write(`migrations applied to ${new URL(DATABASE_URL).pathname.slice(1)}\n`);
}
