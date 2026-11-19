import { defineConfig, devices } from '@playwright/test';
import { databaseUrlFor, e2ePorts, loadEnv, testDbName, TEST_SESSION_SECRET } from './scripts/env.ts';

// e2e runs against its own API + web servers on per-checkout ports and a per-checkout
// database (<DB_NAME>_e_<hash>), so parallel worktrees never collide. ./verify picks free
// ports and passes them as E2E_API_PORT / E2E_WEB_PORT.
// E2E_WEB_MODE=prod (set by `./verify --release`) serves a production build (`next start`) from
// NEXT_DIST_DIR=.next-release instead of `next dev`; the build must already exist.
loadEnv();
const prodWeb = process.env.E2E_WEB_MODE === 'prod';
const ports = e2ePorts();
process.env.E2E_API_PORT = String(ports.api);
process.env.E2E_WEB_PORT = String(ports.web);
// The API runs from apps/api with uv (Python); the test DB is cloned from the migrated template first.
const api = 'uv run --project apps/api';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  // drops this checkout's e2e DB when the run ends (test DBs are throwaway)
  globalTeardown: './scripts/e2e-teardown.ts',
  forbidOnly: true,
  fullyParallel: true,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${ports.web}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      name: 'api',
      command: `${api} python apps/api/scripts/testdb.py prepare e >/dev/null && cd apps/api && uv run python -m app.server`,
      url: `http://localhost:${ports.api}/readyz`,
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        APP_ENV: 'test',
        DATABASE_URL: databaseUrlFor(testDbName('e')),
        API_PORT: String(ports.api),
        WEB_ORIGIN: `http://localhost:${ports.web}`,
        SESSION_SECRET: TEST_SESSION_SECRET,
        LOG_LEVEL: 'warn',
        // Every e2e user signs up from 127.0.0.1; keep the auth limits out of the way.
        RATE_LIMIT_MAX: '100000',
        RATE_LIMIT_AUTH_MAX: '100000',
        RATE_LIMIT_LOGIN_EMAIL_MAX: '100000',
      },
    },
    {
      name: 'web',
      command: `./node_modules/.bin/next ${prodWeb ? 'start' : 'dev'} --port ${ports.web}`,
      cwd: 'apps/web',
      url: `http://localhost:${ports.web}/login`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        API_PORT: String(ports.api),
        NEXT_DIST_DIR: prodWeb ? '.next-release' : '.next-e2e',
        NEXT_TELEMETRY_DISABLED: '1',
      },
    },
  ],
});
