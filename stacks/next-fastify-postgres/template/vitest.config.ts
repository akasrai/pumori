import { defineConfig } from 'vitest/config';

// Single entry point for all unit/integration tests: `pnpm test` or `./verify --tests <file>`.
export default defineConfig({
  test: {
    projects: ['apps/api', 'apps/web'],
  },
});
