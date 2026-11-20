# Conventions

## Adding a resource end-to-end

Order matters: contract → storage → API → UI → tests. Example: a user-owned `notes` resource.
Run `./verify --quick` after each step.

### 1. Contract — `apps/api/app/contracts/notes.py` (+ list it in `contracts/__init__.py`)

Pydantic models are the **single source of truth** for API shapes. The web app gets them as zod schemas
generated into `packages/shared/src/generated.ts`: after changing a contract, run

```sh
uv run --project apps/api python apps/api/scripts/gen_contracts.py
```

and commit both files (`./verify --quick` fails while the generated file is stale). Field names are
snake_case in Python and camelCase on the wire (`created_at` → `createdAt`).

```python
from datetime import datetime
from typing import Annotated
from uuid import UUID

from .base import Contract, Text


class NoteInput(Contract):
    title: Annotated[str, Text(1, 200, too_short="Title is required", trim=True)]
    body: Annotated[str, Text(0, 10_000)] = ""


class Note(Contract):
    id: UUID
    title: str
    body: str
    created_at: datetime


class NoteResponse(Contract):
    note: Note


class NoteListResponse(Contract):
    notes: list[Note]
```

Use `Email` and `Annotated[str, Text(min, max, too_short=..., too_long=...)]` for user input: their messages
are what users see, and the generator copies them into the zod schemas so web forms show the same words.

### 2. Table + migration — `apps/api/app/models.py`

```python
class NoteRow(Base):
    __tablename__ = "notes"
    __table_args__ = (Index("ix_notes_user_id_created_at", "user_id", "created_at"),
                      CheckConstraint("char_length(title) between 1 and 200", name="title_length"))

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text, server_default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Then generate the migration and **read it** before committing (autogenerate misses some changes, e.g.
renames, which it writes as drop + add):

```sh
uv run --project apps/api python apps/api/scripts/new_migration.py "add notes"
```

It compares the models with a fresh, fully migrated scratch database (not your dev DB) and lands in `apps/api/migrations/versions/`. Never edit a committed migration; to change a table, edit
`models.py` and generate a new one. `tests/test_migrations.py` fails when models and migrations disagree.
Test databases pick a new migration up automatically (the template DB is rebuilt when `migrations/`
changes); `./init.sh` applies it to the dev DB.

### 3. Routes — `apps/api/app/routes/notes.py`, included in `app/main.py`

Handlers are plain (sync) functions: FastAPI runs them in a thread pool, and `db: DbSession` is one
transaction per request (committed before the response is sent, rolled back on any error).

```python
import uuid

from fastapi import APIRouter
from sqlalchemy import delete, select, update

from app.contracts import Note, NoteInput, NoteListResponse, NoteResponse
from app.db import DbSession
from app.lib.errors import not_found
from app.lib.session import CurrentUser
from app.models import NoteRow

router = APIRouter(prefix="/notes", tags=["notes"])


def to_dto(row: NoteRow) -> Note:
    return Note(id=row.id, title=row.title, body=row.body, created_at=row.created_at)


@router.get("")
def list_notes(user: CurrentUser, db: DbSession) -> NoteListResponse:
    rows = db.scalars(select(NoteRow)
                      .where(NoteRow.user_id == user.id)                 # ownership filter: ALWAYS
                      .order_by(NoteRow.created_at.desc(), NoteRow.id.desc())
                      .limit(100))                                       # growing lists: keyset-paginate
    return NoteListResponse(notes=[to_dto(r) for r in rows])


@router.post("", status_code=201)
def create_note(body: NoteInput, user: CurrentUser, db: DbSession) -> NoteResponse:
    row = NoteRow(user_id=user.id, title=body.title, body=body.body)    # owner from the session, never the input
    db.add(row)
    db.flush()
    db.refresh(row)
    return NoteResponse(note=to_dto(row))


@router.get("/{note_id}")
def get_note(note_id: uuid.UUID, user: CurrentUser, db: DbSession) -> NoteResponse:
    row = db.scalar(select(NoteRow).where(NoteRow.id == note_id, NoteRow.user_id == user.id))
    if row is None:
        raise not_found("Note")                                          # missing OR someone else's: same 404
    return NoteResponse(note=to_dto(row))


@router.patch("/{note_id}")
def update_note(note_id: uuid.UUID, body: NoteInput, user: CurrentUser, db: DbSession) -> NoteResponse:
    row = db.scalar(update(NoteRow).where(NoteRow.id == note_id, NoteRow.user_id == user.id)
                    .values(title=body.title, body=body.body).returning(NoteRow))
    if row is None:
        raise not_found("Note")
    return NoteResponse(note=to_dto(row))


@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    deleted = db.execute(delete(NoteRow).where(NoteRow.id == note_id, NoteRow.user_id == user.id)
                         .returning(NoteRow.id)).first()
    if deleted is None:
        raise not_found("Note")
```

- Order inside a handler: authenticate (`CurrentUser`, 401) → authorize (owner filter, 404) → validate the
  body (FastAPI does it from the type; 400 `VALIDATION_ERROR`) → rate-limit-sensitive work → side effects.
- Path and query parameters are typed (`note_id: uuid.UUID`): a malformed id is a 400, never a 500.
- Return contract models, never ORM rows or dicts: the response shape is then exactly the contract.
- Keep handlers thin; move logic that several routes share into `app/services/<module>.py` (plain
  functions that take `db: Session` and the user).

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

### 5. API test — `apps/api/tests/test_<TASK-ID>_notes.py`

Cover: happy path, validation (400 `VALIDATION_ERROR`), unauthenticated (401), and authorization (below).
Tests go through HTTP with `api_client()` and `sign_up()` from `tests/helpers.py`, not through internals.

### 6. e2e test — `e2e/<TASK-ID>-notes.spec.ts`

One user journey through the UI (sign up → create note → see it in the list). Use `getByRole`/`getByLabel`.

## Error handling

- API responses for errors are always `{ "error": { "code", "message", "details"? } }` (`ApiError`).
- Raise helpers from `apps/api/app/lib/errors.py`: `bad_request`, `unauthenticated`, `not_found`,
  `conflict(code, msg)`, or `AppError(status, code, message)`. Add new codes to `ErrorCode` in
  `apps/api/app/contracts/errors.py` (never rename existing ones) and regenerate the contracts.
- Unknown errors become `500 INTERNAL` with a generic message; details go to the server log only, and
  `report_error()` (`apps/api/app/lib/report_error.py`, web: `apps/web/lib/report-error.ts`) is the hook for
  an error tracker. Framework errors keep their status with a matching code (`PAYLOAD_TOO_LARGE`,
  `UNSUPPORTED_MEDIA_TYPE`, `RATE_LIMITED`, `METHOD_NOT_ALLOWED`, ...); 404s never echo the URL.
- Web: `app/error.tsx`, `app/global-error.tsx` and `app/not-found.tsx` render generic, accessible pages;
  server errors reach `onRequestError` in `apps/web/instrumentation.ts`.

## Rate limits

- Every route has the global per-IP limit (`RATE_LIMIT_MAX`/min; health checks excluded). Endpoints that
  are expensive or guessable (login, signup, password reset, invites, sends) get a stricter per-IP limit
  (`dependencies=[Depends(auth_ip_limit)]`) and, where an attacker can rotate IPs, a second limit keyed by
  the target (a `SlidingWindowLimiter`, e.g. per email, `.hit(key)` after validation). See
  `apps/api/app/routes/auth.py`. Limits live in process memory: one API instance, or move them to Postgres.
- Tests: `api_client(RATE_LIMIT_AUTH_MAX=2)` gives a strict app; the default test env disables the limits
  so many users can sign up from one IP.

## Dev-only stand-ins

Features that fake an external service in development (mail outbox, fake payment provider, SMS
codes) follow three rules:

1. **Never registered in production.** Include their router only outside production, under `/dev/*`
   (see `dev_mail` in `app/main.py`), so in production the routes do not exist (404). Their settings are
   refused in production (e.g. `MAIL_TRANSPORT=dev`), and the web page for one calls `notFound()` there.
2. **Login-only.** Every dev route takes `user: CurrentUser`.
3. **Recipient-only.** A user sees only what was addressed to them (their own mail, their own codes),
   never anyone else's, exactly like the real service would behave.

Mail goes through `request.app.state.mailer.send(to, subject, text)` (`apps/api/app/lib/mailer.py`): `dev`
keeps it for `/dev/mail` (web: `/dev/mail`), `log` is the production placeholder until a real provider is added.
- Unique-constraint races: prefer `insert(...).on_conflict_do_nothing(...).returning(...)` and map "no row" to `409`.

## Authorization tests

Every user-owned resource needs a test proving user B cannot read **or** modify user A's data, and that
the response is indistinguishable from "does not exist":

```python
def test_user_b_cannot_read_or_change_user_a_note() -> None:
    with api_client() as client:
        a, b = sign_up(client), sign_up(client)
        created = client.post("/notes", json={"title": "secret"}, headers={"cookie": a.cookie})
        note_id = created.json()["note"]["id"]

        for method, url, body in [("GET", f"/notes/{note_id}", None), ("PATCH", f"/notes/{note_id}", {"title": "x"}),
                                  ("DELETE", f"/notes/{note_id}", None)]:
            res = client.request(method, url, json=body, headers={"cookie": b.cookie})
            assert res.status_code == 404
            assert res.json()["error"]["code"] == "NOT_FOUND"

        assert client.get("/notes", headers={"cookie": b.cookie}).json()["notes"] == []
        still = client.get(f"/notes/{note_id}", headers={"cookie": a.cookie})
        assert still.json()["note"]["title"] == "secret"
```

## Test databases and ports

- pytest: `<DB_NAME>_t_<hash>`; Playwright: `<DB_NAME>_e_<hash>` (hash = 8 chars of the checkout path).
  Both are recreated from `<DB_NAME>_tpl` on every run, so tests start from an empty, migrated schema.
- Each test file starts on a fresh copy of the migrated DB, but tests within one file share it: create your own users/data (`unique_email()`), never assume empty tables, and never rely on rows another test file wrote.
- New settings that API tests need go in `apps/api/test_env.py` (`tests/conftest.py` is protected).
- e2e servers use free ports chosen by `./verify` (`E2E_API_PORT`, `E2E_WEB_PORT`) and Next's
  `.next-e2e` build dir, so they can run next to `./init.sh` and in parallel worktrees.
  `./verify --release` builds into `.next-release` and reruns e2e against `next start`.
