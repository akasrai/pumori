import { defineConfig } from 'vitest/config';

// Web unit and component tests: `./verify --tests apps/web/test/<file>`. API tests are pytest (apps/api/tests).
export default defineConfig({
  test: {
    projects: ['apps/web'],
  },
});
