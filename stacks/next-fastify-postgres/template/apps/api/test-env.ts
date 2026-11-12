/**
 * Extra env vars for API tests. Add a new required env var here (e.g. `WEB_ORIGIN`), not in
 * vitest.config.ts: the runner config and everything under test/ are protected (changing them stops
 * the task for a human). This file sits outside test/ so the contract or backend task may edit it.
 */
export const TEST_ENV_EXTRA: Record<string, string> = {};
