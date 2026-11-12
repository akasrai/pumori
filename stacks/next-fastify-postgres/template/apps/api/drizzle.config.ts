import { defineConfig } from 'drizzle-kit';

// Generate a migration after editing src/db/schema.ts:  pnpm --filter @app/api db:generate --name <slug>
// Never edit or delete a committed migration; add a new one instead.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  strict: true,
  verbose: false,
});
