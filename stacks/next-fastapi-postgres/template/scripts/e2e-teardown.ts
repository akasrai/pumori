import { execFileSync } from 'node:child_process';

import { checkoutRoot } from './env.ts';

/** Playwright global teardown: the e2e DB is throwaway, so drop it once the run ends. */
const teardown = (): void => {
  execFileSync('uv', ['run', '--project', 'apps/api', 'python', 'apps/api/scripts/testdb.py', 'drop', 'e'], {
    cwd: checkoutRoot(),
    stdio: 'inherit',
  });
};

export default teardown;
