# Conventions

## Adding a resource end-to-end

Order matters: contract → storage → API → UI → tests. Example: a user-owned `notes` resource.
Run `./verify --quick` after each step.

### 1. Shared schema — `packages/shared/src/notes.ts` (+ `export * from './notes.ts'` in `index.ts`)

```ts
import { z } from 'zod';

export const noteInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  body: z.string().max(10_000).default(''),
});
export type NoteInput = z.infer<typeof noteInputSchema>;

export const noteSchema = noteInputSchema.extend({
  id: z.uuid(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type Note = z.infer<typeof noteSchema>;

export const noteIdParamsSchema = z.object({ id: z.uuid() });
export const noteResponseSchema = z.object({ note: noteSchema });
export const noteListResponseSchema = z.object({ notes: z.array(noteSchema) });
```

### 2. Table + migration — `apps/api/src/db/schema.ts`

```ts
export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('notes_user_id_idx').on(t.userId)]);
```

Then `corepack pnpm --filter @app/api db:generate --name notes` and commit `apps/api/drizzle/*`.
Never edit an existing migration; to change a table, edit `schema.ts` and generate a new one.
Test databases pick the new migration up automatically (template DB is rebuilt when `drizzle/` changes);
apply it to the dev DB with `./init.sh` (or `corepack pnpm db:migrate`).

### 3. Routes — `apps/api/src/routes/notes.ts`, registered in `app.ts`

```ts
import type { FastifyPluginAsync } from 'fastify';
import { and, desc, eq } from 'drizzle-orm';
import { noteIdParamsSchema, noteInputSchema, type Note } from '@app/shared';
import { notes } from '../db/schema.ts';
import { notFound } from '../lib/errors.ts';
import { currentUser, requireUser } from '../lib/session.ts';
import { parse } from '../lib/validate.ts';

const toDto = (row: typeof notes.$inferSelect): Note => ({
  id: row.id, title: row.title, body: row.body, createdAt: row.createdAt.toISOString(),
});

export const noteRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireUser); // every route in this plugin needs a session

  app.get('/notes', async (request) => {
    const user = currentUser(request);
    const rows = await app.db.select().from(notes)
      .where(eq(notes.userId, user.id))              // ownership filter: ALWAYS
      .orderBy(desc(notes.createdAt), desc(notes.id))
      .limit(100);                                   // growing lists: keyset-paginate (coding-rules: Data safety)

    return { notes: rows.map(toDto) };
  });

  app.post('/notes', async (request, reply) => {
    const input = parse(noteInputSchema, request.body);
    const [row] = await app.db.insert(notes)
      .values({ ...input, userId: currentUser(request).id }) // owner from session, never from input
      .returning();

    if (!row) throw new Error('insert returned no row');
    reply.status(201);

    return { note: toDto(row) };
  });

  app.get('/notes/:id', async (request) => {
    const { id } = parse(noteIdParamsSchema, request.params);
    const [row] = await app.db.select().from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, currentUser(request).id)));

    if (!row) throw notFound('Note');                 // missing OR someone else's: same 404

    return { note: toDto(row) };
  });
};
```

Updates and deletes follow the same pattern: `where(and(eq(table.id, id), eq(table.userId, user.id)))`
and `.returning()`; zero rows → `notFound()`.

### 4. Web page — `apps/web/app/notes/page.tsx`

- Server Components: add a fetch helper next to `getCurrentUser()` in `apps/web/lib/server-api.ts`
  (forwards the cookie), parse with the shared response schema, `redirect('/login')` when unauthenticated.
- Client Components: `apiRequest('/api/notes', { method: 'POST', body }, noteResponseSchema)` from
  `apps/web/lib/api.ts` (never throws: timeouts, network errors and schema mismatches come back as
  `{ ok: false, error }`); pre-validate forms with the same shared input schema; show `result.error.message`
  in a `role="alert"` element inside the form.
- UI from the design system only (`docs/design.md`, `/dev/ui`): `PageHeader`, `DataTable`, `EmptyState`,
  `FormField` + `Input`, `Sheet` for create/edit, `AlertDialog` to confirm deletes, `toast` for results.
  Signed-in pages go under `app/(app)/` (the layout adds the app shell); add list pages to `SHELL_NAV`.
- Accessible markup: every input has a label (`FormField`), buttons have text, forms have `aria-label`.
- Arrow components with a props `interface`. Components export by name; only Next's route files
  (`page`, `layout`, `error`, `global-error`, `loading`, `not-found`, `template`, `default`) use a default export.
- Folders sit at the web app root (no `src/`): `app/` routes, `components/`, `lib/`, `hooks/`; `@/x` is `apps/web/x`.

```tsx
// apps/web/components/notes/note-list.tsx
import { NotebookIcon } from 'lucide-react';
import type { Note } from '@app/shared';

import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/format-utils';

const COLUMNS: DataTableColumn<Note>[] = [
  { id: 'title', header: 'Title', cell: (note) => note.title },
  { id: 'created', header: 'Created', cell: (note) => formatDate(note.createdAt), hideOnMobile: true },
];

export interface NoteListProps {
  notes: Note[];
}

export const NoteList = ({ notes }: NoteListProps) => (
  <DataTable
    label="Notes"
    columns={COLUMNS}
    rows={notes}
    getRowKey={(note) => note.id}
    empty={<EmptyState icon={NotebookIcon} title="No notes yet" description="Notes you write appear here." />}
  />
);

// apps/web/app/(app)/notes/page.tsx   (the (app) layout wraps it in the app shell)
import { redirect } from 'next/navigation';

import { NewNoteSheet } from '@/components/notes/new-note-sheet';
import { NoteList } from '@/components/notes/note-list';
import { PageHeader } from '@/components/ui/page-header';
import { getCurrentUser, getNotes } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

const NotesPage = async () => {
  const user = await getCurrentUser();

  if (!user) redirect('/login');

  return (
    <>
      <PageHeader title="Notes" description="Everything you have written down." actions={<NewNoteSheet />} />
      <NoteList notes={await getNotes()} />
    </>
  );
};

export default NotesPage;
```

`NewNoteSheet` is a client component: a `Sheet` with a `<form>` of `FormField`s, an `Alert` for the API
error, `Button isLoading` while saving, then `toast.success('Note created')`, close, `router.refresh()`.

### 5. API test — `apps/api/test/<TASK-ID>-notes.test.ts`

Cover: happy path, validation (400 `VALIDATION_ERROR`), unauthenticated (401), and authorization (below).

### 6. e2e test — `e2e/<TASK-ID>-notes.spec.ts`

One user journey through the UI (sign up → create note → see it in the list). Use `getByRole`/`getByLabel`.

## Error handling

- API responses for errors are always `{ "error": { "code", "message", "details"? } }` (`apiErrorSchema`).
- Throw helpers from `apps/api/src/lib/errors.ts`: `badRequest`, `unauthenticated`, `notFound`,
  `conflict(code, msg)`, or `new AppError(status, code, message)`. Add new codes to `ErrorCode` in
  `packages/shared/src/errors.ts` (never rename existing ones).
- Unknown errors become `500 INTERNAL` with a generic message; details go to the server log only, and
  `reportError()` (`apps/api/src/lib/report-error.ts`, web: `apps/web/lib/report-error.ts`) is the
  hook for an error tracker. Framework 4xx errors keep their status with a matching code
  (`PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `RATE_LIMITED`, ...); 404s never echo the URL.
- Web: `app/error.tsx`, `app/global-error.tsx` and `app/not-found.tsx` render generic, accessible pages;
  server errors reach `onRequestError` in `apps/web/instrumentation.ts`.

## Rate limits

- Every route has the global per-IP limit (`RATE_LIMIT_MAX`/min). Endpoints that are expensive or
  guessable (login, signup, password reset, invites, sends) get a stricter route limit
  (`config: authIpRateLimit(app)`) and, where an attacker can rotate IPs, a second limit keyed by the
  target (`createKeyedLimiter`, e.g. per email) checked after validation. See `apps/api/src/routes/auth.ts`.
- Tests: `createTestAppWith({ RATE_LIMIT_AUTH_MAX: 2 })` gives a strict app; the default test env
  disables the limits so many users can sign up from one IP.

## Dev-only stand-ins

Features that fake an external service in development (mail outbox, fake payment provider, SMS
codes) follow three rules:

1. **Never registered in production.** Register them with `registerDevOnly(app, plugin)`
   (`apps/api/src/lib/dev-only.ts`): under `/dev/*`, only when `NODE_ENV !== 'production'`, so in
   production the routes do not exist (404). Their env values are refused in production (e.g.
   `MAIL_TRANSPORT=dev`), and the web page for one calls `notFound()` in production.
2. **Login-only.** Every dev route requires a session (`requireUser`).
3. **Recipient-only.** A user sees only what was addressed to them (their own mail, their own codes),
   never anyone else's, exactly like the real service would behave.

Mail goes through `app.mailer.send({ to, subject, text })` (`apps/api/src/lib/mailer.ts`): `dev` keeps it
for `/dev/mail` (web: `/dev/mail`), `log` is the production placeholder until a real transport is added.
- Unique-constraint races: prefer `onConflictDoNothing().returning()` and map "no row" to `409`.

## Authorization tests

Every user-owned resource needs a test proving user B cannot read **or** modify user A's data, and that
the response is indistinguishable from "does not exist":

```ts
it('user B cannot read or modify user A\'s note (404)', async () => {
  const a = await signUp(app);
  const b = await signUp(app);
  const created = await app.inject({ method: 'POST', url: '/notes', headers: { cookie: a.cookie },
    payload: { title: 'secret' } });
  const { note } = noteResponseSchema.parse(created.json());

  for (const req of [
    { method: 'GET' as const, url: `/notes/${note.id}` },
    { method: 'PATCH' as const, url: `/notes/${note.id}`, payload: { title: 'pwned' } },
    { method: 'DELETE' as const, url: `/notes/${note.id}` },
  ]) {
    const res = await app.inject({ ...req, headers: { cookie: b.cookie } });
    expect(res.statusCode).toBe(404);
    expect(apiErrorSchema.parse(res.json()).error.code).toBe('NOT_FOUND');
  }

  const list = await app.inject({ method: 'GET', url: '/notes', headers: { cookie: b.cookie } });
  expect(noteListResponseSchema.parse(list.json()).notes).toEqual([]);

  const still = await app.inject({ method: 'GET', url: `/notes/${note.id}`, headers: { cookie: a.cookie } });
  expect(noteResponseSchema.parse(still.json()).note.title).toBe('secret');
});
```

## Test databases and ports

- Vitest: `<DB_NAME>_t_<hash>`; Playwright: `<DB_NAME>_e_<hash>` (hash = 8 chars of the checkout path).
  Both are recreated from `<DB_NAME>_tpl` on every run, so tests start from an empty, migrated schema.
- Tests within a run share the DB: create your own users/data (`uniqueEmail()`), never assume empty tables.
- e2e servers use free ports chosen by `./verify` (`E2E_API_PORT`, `E2E_WEB_PORT`) and Next's
  `.next-e2e` build dir, so they can run next to `./init.sh` and in parallel worktrees.
  `./verify --release` builds into `.next-release` and reruns e2e against `next start`.
