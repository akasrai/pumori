// Checkout-aware environment helpers shared by configs and scripts (no dependencies).
// Every git worktree of the repo gets its own test databases and e2e ports, derived from
// a hash of the checkout's absolute path, so parallel agents never collide.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const here = path.dirname(fileURLToPath(import.meta.url));

const git = (args: string[], cwd: string): string | undefined => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return undefined;
  }
};

/** Absolute path of the current checkout (worktree) root. */
export const checkoutRoot = (): string => {
  return git(['rev-parse', '--show-toplevel'], here) ?? path.resolve(here, '..');
};

/** Absolute path of the main checkout (the one that owns .git), even when called from a worktree. */
export const mainRoot = (): string => {
  const common = git(['rev-parse', '--path-format=absolute', '--git-common-dir'], here);

  return common ? path.dirname(common) : checkoutRoot();
};

/** The .env to use: this checkout's, else the main checkout's (worktrees have none). */
export const envFile = (): string | undefined => {
  for (const dir of [checkoutRoot(), mainRoot()]) {
    const file = path.join(dir, '.env');

    if (existsSync(file)) return file;
  }

  return undefined;
};

/** Loads .env into process.env without overriding variables that are already set. */
export const loadEnv = (): NodeJS.ProcessEnv => {
  const file = envFile();

  if (file) {
    const parsed = parseEnv(readFileSync(file, 'utf8'));

    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined && value !== undefined) process.env[key] = value;
    }
  }

  return process.env;
};

export const requireEnv = (name: string): string => {
  const value = loadEnv()[name];

  if (!value) {
    throw new Error(`${name} is not set. Run ./init.sh in the main checkout to create .env.`);
  }

  return value;
};

/** 8-char hash of a checkout path: unique per worktree, stable across runs. */
export const hashOfCheckout = (root: string): string => {
  return createHash('sha256').update(root).digest('hex').slice(0, 8);
};

export const checkoutHash = (): string => {
  return hashOfCheckout(checkoutRoot());
};

export type TestDbKind = 't' | 'e';

/** Per-checkout database name: `${DB_NAME}_t_<hash>` (pytest) or `${DB_NAME}_e_<hash>` (e2e). */
export const testDbName = (kind: TestDbKind): string => {
  return `${requireEnv('DB_NAME')}_${kind}_${checkoutHash()}`;
};

/** Same server and credentials as DATABASE_URL, different database. */
export const databaseUrlFor = (dbName: string): string => {
  const url = new URL(requireEnv('DATABASE_URL'));
  url.pathname = `/${dbName}`;

  return url.toString();
};

/** Deterministic per-checkout e2e ports (override with E2E_API_PORT / E2E_WEB_PORT). */
export const e2ePorts = (): { api: number; web: number } => {
  const base = 20000 + (parseInt(checkoutHash(), 16) % 10000) * 2;

  return {
    api: Number(process.env.E2E_API_PORT ?? base),
    web: Number(process.env.E2E_WEB_PORT ?? base + 1),
  };
};

/** Session secret used by automated tests (never by dev/staging/prod). */
export const TEST_SESSION_SECRET = 'test-session-secret-not-for-production-use';
