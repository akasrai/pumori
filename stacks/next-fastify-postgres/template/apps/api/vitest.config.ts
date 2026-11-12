import { defineProject } from 'vitest/config';
import { databaseUrlFor, loadEnv, testDbName, TEST_SESSION_SECRET } from '../../scripts/env.ts';

import { TEST_ENV_EXTRA } from './test-env.ts';

loadEnv();

export default defineProject({
  test: {
    name: 'api',
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // Creates this checkout's test DB (<DB_NAME>_t_<hash>) fresh from the migrated template DB.
    globalSetup: ['./test/global-setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrlFor(testDbName('t')),
      SESSION_SECRET: TEST_SESSION_SECRET,
      API_PORT: '0',
      COOKIE_SECURE: 'false',
      LOG_LEVEL: 'silent',
      WEB_ORIGIN: 'http://localhost:3000',
      // Test files sign up many users from one IP; rate-limit.test.ts builds its own strict app.
      RATE_LIMIT_MAX: '100000',
      RATE_LIMIT_AUTH_MAX: '100000',
      RATE_LIMIT_LOGIN_EMAIL_MAX: '100000',
      ...TEST_ENV_EXTRA,
    },
    // scrypt at N=2^17 costs ~0.3 s per hash.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
