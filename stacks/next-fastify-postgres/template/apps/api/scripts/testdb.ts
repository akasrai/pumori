// Database lifecycle helpers used by tests, e2e, init.sh and staging.sh.
//
//   node apps/api/scripts/testdb.ts prepare <t|e>   fresh per-checkout test DB, prints its URL
//   node apps/api/scripts/testdb.ts ensure <name>   create DB if missing + apply migrations
//   node apps/api/scripts/testdb.ts create <name>   create DB if missing (staging: the image migrates it)
//   node apps/api/scripts/testdb.ts drop-test       drop this checkout's test DBs
//   node apps/api/scripts/testdb.ts sweep [--all]   drop test DBs of checkouts that no longer exist
//                                                   (--all: every test DB of this project, at handover)
//
// Test DBs are throwaway: each test run recreates its DB and drops it when the run ends. Only the
// app DB (<DB_NAME>), the template (<DB_NAME>_tpl) and staging (<DB_NAME>_staging) are kept.
//
// Test DBs are cloned (CREATE DATABASE ... TEMPLATE, i.e. `createdb -T`) from <DB_NAME>_tpl,
// which is rebuilt only when the contents of apps/api/drizzle change (hash stored as the
// database comment). An advisory lock serialises parallel worktrees.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { MIGRATIONS_DIR, runMigrations } from '../src/db/migrate.ts';
import { databaseUrlFor, hashOfCheckout, mainRoot, requireEnv, testDbName, type TestDbKind } from '../../../scripts/env.ts';

type Sql = postgres.Sql;

const assertDbName = (name: string): string => {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(name)) throw new Error(`Unsafe database name: ${name}`);

  return name;
};

export const migrationsHash = (): string => {
  const hash = createHash('sha256');
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) walk(full);
      else hash.update(path.relative(MIGRATIONS_DIR, full)).update('\0').update(readFileSync(full)).update('\0');
    }
  };
  walk(MIGRATIONS_DIR);

  return hash.digest('hex').slice(0, 16);
};

const withAdmin = async <T>(fn: (sql: Sql) => Promise<T>): Promise<T> => {
  const sql = postgres(databaseUrlFor('postgres'), { max: 1, onnotice: () => {} });

  try {
    return await fn(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
};

/** undefined = database missing; null = exists without comment. */
const dbComment = async (sql: Sql, name: string): Promise<string | null | undefined> => {
  const rows = await sql<{ comment: string | null }[]>`
    select shobj_description(oid, 'pg_database') as comment from pg_database where datname = ${name}`;

  return rows.length === 0 ? undefined : (rows[0]?.comment ?? null);
};

const dropDb = async (sql: Sql, name: string): Promise<void> => {
  await sql`drop database if exists ${sql(assertDbName(name))} with (force)`;
};

const createDb = async (sql: Sql, name: string, template?: string): Promise<void> => {
  for (let attempt = 0; ; attempt++) {
    try {
      if (template) await sql`create database ${sql(assertDbName(name))} template ${sql(assertDbName(template))}`;
      else await sql`create database ${sql(assertDbName(name))}`;

      return;
    } catch (err) {
      // 55006: template still has a lingering connection (e.g. a just-closed migrator).
      const code = (err as { code?: string }).code;

      if (code !== '55006' || attempt >= 20) throw err;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
};

const ensureTemplate = async (sql: Sql): Promise<string> => {
  const tpl = assertDbName(`${requireEnv('DB_NAME')}_tpl`);
  const hash = migrationsHash();
  const current = await dbComment(sql, tpl);

  if (current === hash) return tpl;

  if (current !== undefined) await dropDb(sql, tpl);
  await createDb(sql, tpl);
  await runMigrations(databaseUrlFor(tpl));
  await sql.unsafe(`comment on database "${tpl}" is '${hash}'`);

  return tpl;
};

const withTemplateLock = async <T>(sql: Sql, fn: () => Promise<T>): Promise<T> => {
  const key = `pumori-tpl:${requireEnv('DB_NAME')}`;
  await sql`select pg_advisory_lock(hashtext(${key}))`;

  try {
    return await fn();
  } finally {
    await sql`select pg_advisory_unlock(hashtext(${key}))`;
  }
};

/** Recreates this checkout's test database from the migrated template; returns its URL. */
export const prepareTestDb = async (kind: TestDbKind): Promise<string> => {
  const name = testDbName(kind);
  await withAdmin((sql) =>
    withTemplateLock(sql, async () => {
      const tpl = await ensureTemplate(sql);
      await dropDb(sql, name);
      await createDb(sql, name, tpl);
    }),
  );

  return databaseUrlFor(name);
};

/** Creates the database if it does not exist yet (no migrations). */
export const createDatabase = async (name: string): Promise<void> => {
  await withAdmin(async (sql) => {
    if ((await dbComment(sql, name)) === undefined) await createDb(sql, name);
  });
};

/** Creates the database if missing and applies pending migrations (dev). */
export const ensureDatabase = async (name: string): Promise<string> => {
  await createDatabase(name);
  const url = databaseUrlFor(name);
  await runMigrations(url);

  return url;
};

/** Drops one of this checkout's test DBs (run at the end of a test run). */
export const dropTestDb = async (kind: TestDbKind): Promise<void> => {
  await withAdmin((sql) => dropDb(sql, testDbName(kind)));
};

/** Hashes of every checkout of this repo that still exists (main + worktrees). */
const liveCheckoutHashes = (): Set<string> => {
  const out = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: mainRoot(), encoding: 'utf8' });
  const roots = out.split('\n').filter((line) => line.startsWith('worktree ')).map((line) => line.slice('worktree '.length));

  return new Set(roots.map(hashOfCheckout));
};

/**
 * Drops leftover test DBs (a crashed or killed run never reaches its teardown). Without `all`, only
 * those whose checkout is gone. Only names matching <DB_NAME>_(t|e)_<8 hex> are ever touched.
 */
export const sweepTestDbs = async (all: boolean): Promise<string[]> => {
  const pattern = new RegExp(`^${requireEnv('DB_NAME')}_(t|e)_([0-9a-f]{8})$`);
  const live = all ? new Set<string>() : liveCheckoutHashes();

  return withAdmin(async (sql) => {
    const rows = await sql<{ datname: string }[]>`select datname from pg_database`;
    const dropped: string[] = [];

    for (const { datname } of rows) {
      const match = pattern.exec(datname);

      if (!match?.[2] || live.has(match[2])) continue;
      await dropDb(sql, datname);
      dropped.push(datname);
    }

    return dropped;
  });
};

export const dropTestDbs = async (): Promise<void> => {
  await withAdmin(async (sql) => {
    for (const kind of ['t', 'e'] as const) await dropDb(sql, testDbName(kind));
  });
};

if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.filename) {
  const [command, arg] = process.argv.slice(2);

  if (command === 'prepare' && (arg === 't' || arg === 'e')) {
    console.log(await prepareTestDb(arg));
  } else if (command === 'ensure' && arg) {
    await ensureDatabase(arg);
    console.log(`ready: ${arg}`);
  } else if (command === 'create' && arg) {
    await createDatabase(arg);
    console.log(`exists: ${arg}`);
  } else if (command === 'drop-test') {
    await dropTestDbs();
  } else if (command === 'sweep') {
    const dropped = await sweepTestDbs(arg === '--all');
    console.log(JSON.stringify({ dropped }));
  } else {
    console.error('usage: testdb.ts prepare <t|e> | ensure <db-name> | create <db-name> | drop-test | sweep [--all]');
    process.exit(2);
  }
}
