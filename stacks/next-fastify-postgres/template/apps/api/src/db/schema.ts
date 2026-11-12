import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// After editing this file run `pnpm --filter @app/api db:generate --name <slug>` and commit the migration.

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  'sessions',
  {
    /** sha256(token) as hex; the raw token only ever lives in the user's cookie. */
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Absolute expiry: the session ends at this time even if it is in use. */
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /** Sliding idle timeout: refreshed while the session is used (see lib/session.ts). */
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId), index('sessions_expires_at_idx').on(t.expiresAt)],
);

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
