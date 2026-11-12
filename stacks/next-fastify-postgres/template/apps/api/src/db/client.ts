import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.ts';

export type Db = PostgresJsDatabase<typeof schema>;

export interface DbOptions {
  /** Max connections in this process's pool (env DB_POOL_MAX). */
  poolMax: number;
  /** Postgres cancels any statement running longer than this (env DB_STATEMENT_TIMEOUT_MS). */
  statementTimeoutMs: number;
}

/** Close idle connections after this many seconds. */
const IDLE_TIMEOUT_S = 30;
/** Give up opening a connection after this many seconds. */
const CONNECT_TIMEOUT_S = 10;
/** Recycle connections every 30 minutes (picks up DNS/failover changes). */
const MAX_LIFETIME_S = 30 * 60;

export const createDb = (databaseUrl: string, options: DbOptions): { db: Db; close: () => Promise<void> } => {
  const client = postgres(databaseUrl, {
    max: options.poolMax,
    idle_timeout: IDLE_TIMEOUT_S,
    connect_timeout: CONNECT_TIMEOUT_S,
    max_lifetime: MAX_LIFETIME_S,
    // Startup parameters: applied to every connection in the pool.
    connection: {
      statement_timeout: options.statementTimeoutMs,
      idle_in_transaction_session_timeout: options.statementTimeoutMs * 3,
    },
    onnotice: () => {},
  });
  const db = drizzle(client, { schema });

  return { db, close: () => client.end({ timeout: 5 }) };
};
