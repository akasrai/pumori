// Applies migrations to DATABASE_URL (from the environment or .env): pnpm --filter @app/api db:migrate
import { runMigrations } from '../src/db/migrate.ts';
import { requireEnv } from '../../../scripts/env.ts';

const url = requireEnv('DATABASE_URL');
await runMigrations(url);
console.log(`migrated ${new URL(url).pathname.slice(1)}`);
