# AGENTS.md

Next.js web app (TypeScript, pnpm) + FastAPI API (Python 3.13, uv) + Postgres (SQLAlchemy 2, Alembic).
Read `docs/conventions.md` before adding a feature and `docs/design.md` before building any UI.

## Map

| Path | What lives there |
|---|---|
| `apps/api/app/contracts/` | Pydantic models: the **single source of truth** for API shapes (`Contract` base: camelCase JSON; `Email`, `Text(...)` for user input with user-facing messages) |
| `packages/shared/src/generated.ts` | zod schemas + types **generated** from the contracts by `apps/api/scripts/gen_contracts.py` (`@app/shared`); never edit by hand |
| `apps/api/app/main.py` | `create_app(settings)`: FastAPI app, middleware (security headers, body guard 413/415, global rate limit, request log), error handlers, routers |
| `apps/api/app/server.py` | serves the app with uvicorn on `API_PORT` (`uv run python -m app.server` from `apps/api`) |
| `apps/api/app/settings.py` | validated settings (server-only secrets; refuses unsafe production config). `WEB_ORIGIN` / `settings.web_origin` = the web app's public URL: build every link the API sends from it. New settings needed only by API tests go in `apps/api/test_env.py` |
| `apps/api/app/routes/` | one router per resource (`auth.py`, `health.py`: `/livez` `/readyz` `/health`, `dev_mail.py`: dev-only) |
| `apps/api/app/lib/` | `errors.py` (`AppError` helpers), `session.py` (`CurrentUser`), `password.py`, `rate_limit.py`, `http.py` (body guard, security headers), `logging_setup.py` (JSON logs, redaction), `mailer.py`, `report_error.py` |
| `apps/api/app/db.py`, `models.py` | engine + `DbSession` (one transaction per request); SQLAlchemy 2 tables. Migrations: `apps/api/migrations/versions/` (Alembic) |
| `apps/api/tests/` | pytest integration tests through HTTP (`api_client()` + real per-checkout Postgres DB); `helpers.py`, `conftest.py` |
| `apps/api/scripts/` | `gen_contracts.py`, `new_migration.py`, `testdb.py` (test DBs), `checkout_env.py` |
| `apps/web/app/` | Next.js App Router: `(app)/` signed-in pages inside the app shell (`/`, dev-only `/dev/mail`), `(auth)/` (`/login`, `/signup`), dev-only `/dev/ui` (UI gallery) and `/dev/ui/shells/<sidebar|topbar>` (shell previews), `error.tsx`, `global-error.tsx`, `not-found.tsx`; `theme.css` (every colour token, light and dark: the one file a brand replaces), `globals.css` (Tailwind v4 theme: token mapping, type, density), `fonts/` (`fontSans`, Geist by default, OFL) |
| `apps/web/components/ui/` | **the design system**: shadcn/ui components (Radix) themed by `app/theme.css` (every colour token) and `app/fonts/` (the font). Build every screen from these; see them all at `/dev/ui` |
| `apps/web/components/shell/` | `AppShell` renders the product's shell, chosen by `APP_SHELL` (`'sidebar'` \| `'topbar'`) in `lib/app-constants.ts`: `SidebarShell` (220 px left sidebar) or `TopbarShell` (Vercel-style top bar + underline tabs). Both read `SHELL_NAV` (`shell-nav-items.ts`); `ContextSwitcher` (team/project switcher slot), `UserMenu`, `AuthShell`, and `FocusShell` (full-screen document layout with independently scrolling tree and content, for reports and drafting pages). Which shell when: `docs/design.md` § Choosing a shell |
| `apps/web/components/` | feature components (by module: `components/<module>/`); `dev/` is the gallery; hooks go in `apps/web/hooks/` |
| `apps/web/lib/` | `api.ts` (browser → `/api/*`), `server-api.ts` (Server Components → API), `format-utils.ts` (numbers, money, dates), `utils.ts` (`cn`), `app-constants.ts` (`APP_NAME`, `APP_SHELL`, routes), `report-error.ts`; `instrumentation.ts` and `next.config.ts` (security headers) sit at `apps/web/` |
| `apps/web/test/` | Vitest + Testing Library component tests (jsdom) |
| `e2e/` | Playwright specs (own API + web servers, own DB, per-checkout ports) |
| `scripts/` | `env.ts` (checkout-aware env and e2e ports, the twin of `apps/api/scripts/checkout_env.py`), `lib.sh` (shell helpers) |
| `docs/architecture.md`, `docs/features/` | the product's design: the core (system, domain model, shared components, authz, decisions) and one file per feature (its REQs, routes, pages). A task's `feature_doc` names the one to read |
| `README.md` | setup, env vars (production requirements), migrations, deploy, rollback, security notes |

Browser code calls `/api/*`; Next rewrites it to the API (`/api/auth/me` → `API /auth/me`), so cookies stay same-origin.

## Commands

| Command | Use |
|---|---|
| `./init.sh` / `./init.sh stop` / `./init.sh status` | install, create `.env` + dev DB, migrate, run api + web (logs `.run/*.log`); `--prod` = production web build |
| `./verify --quick` | typecheck (tsc, pyright, generated contracts up to date) + lint (eslint, ruff). Run after every change |
| `./verify --tests <file>...` | quick checks + only these tests (`e2e/*.spec.ts` → Playwright, `apps/web/test/*` → Vitest, `apps/api/tests/test_*.py` → pytest), all in parallel. **The command for task work**; a web source file runs the Vitest tests that import it, an API `.py` file runs the API suite |
| `./verify` | full gate: typecheck → lint → web unit → API tests → e2e → security. Run by the merge gate, the milestone check and release; don't run it (or `--e2e`) during a task, it takes minutes |
| `./verify --e2e` / `./verify --security` | all Playwright tests / gitleaks + semgrep + `pnpm audit` + `pip-audit` (if installed) |
| `./verify --release` | full gate + `next build` + e2e against the production build (before a release) |
| `uv run --project apps/api python apps/api/scripts/gen_contracts.py` | regenerate `packages/shared/src/generated.ts` after changing a contract |
| `uv run --project apps/api python apps/api/scripts/new_migration.py "<what changed>"` | create a migration after editing `models.py` (read it before committing) |
| `uv run --project apps/api <cmd>` / `corepack pnpm <cmd>` | Python tools (pytest, ruff, alembic) / always use corepack (pinned pnpm 10) |

`./verify` prints one line per passing step and only the relevant errors for a failing one;
full logs are in `.verify/<step>.log`. It works in any git worktree: it uses the main checkout's
`.env`, installs `node_modules` and `apps/api/.venv` if missing, and gives each checkout its own test DBs and ports.

## Rules

1. **Contracts first.** Every request/response shape is a Pydantic model in `apps/api/app/contracts/`; the
   web app imports the generated zod schemas from `@app/shared`. Never define an API shape in the web app,
   never edit `generated.ts` by hand: change the model and run `gen_contracts.py`.
2. **No cross-app imports**: web ↛ api (lint), and the API never imports from `apps/web`. Only the generated
   `@app/shared` is shared, via its entry point.
3. **Validate every input** by typing it: the body as a contract, path/query parameters as typed arguments
   (`note_id: uuid.UUID`). Invalid input is a 400 `VALIDATION_ERROR` with per-field details.
4. **Authorization:** every route touching user data takes `user: CurrentUser`, and every query on a
   user-owned table filters by `user.id`. Another user's resource → **404** (`not_found()`), never 403.
5. **Migrations via Alembic only.** Edit `models.py`, run `new_migration.py`, read and commit the file.
   Never edit or delete a committed migration; never run DDL elsewhere. `tests/test_migrations.py` fails
   when models and migrations disagree.
6. **Errors** are `{error:{code,message}}`: raise `AppError` helpers from `apps/api/app/lib/errors.py`
   (never `HTTPException`). Handler order: authenticate → authorize (404) → validate body →
   rate-limit-sensitive work → side effects.
7. **Secrets only server-side**: settings live in `apps/api/app/settings.py`; never put secrets in web code,
   `NEXT_PUBLIC_*` vars, contracts or responses (no password hashes/tokens in DTOs).
8. Python: typed everywhere (pyright), ruff-clean, sync `def` handlers with `db: DbSession`. TypeScript: no
   `any`, no `@ts-ignore`, no non-null `!`.
9. Do not edit `.env` (gitignored, shared by worktrees), `pnpm-lock.yaml` or `apps/api/uv.lock` by hand
   (`uv add <pkg>` from `apps/api`), or committed migrations.
10. **Coding rules (frontend and backend): read `docs/coding-rules.md` before writing code.** In short:
   TypeScript: arrow functions only; named exports (except Next pages/layouts and configs); `interface` for
   shapes; no enums (`as const` + union); no `any`; API functions → hooks → components. Python: thin handlers,
   SQLAlchemy 2 `select()` style, logic in `app/services/`, no `print`. `./verify` lints most of these.
11. **UI: follow `docs/design.md`.** Build pages only from `@/components/ui/*` and the shell (look them up
   at `/dev/ui`, source in `apps/web/components/dev/`); every view handles loading, empty, error and success.
   Colours are semantic tokens (`bg-primary`, `text-muted-foreground`, `bg-success-subtle`), never raw
   Tailwind shades or hex (lint), and only `components/ui` imports Radix, sonner or cva (lint). A missing
   generic component goes into `components/ui/` and the gallery, not into a feature folder.

## Tests

- Task tests: `apps/api/tests/test_<TASK-ID>_<slug>.py`, `apps/web/test/<TASK-ID>-<slug>.test.tsx`,
  `e2e/<TASK-ID>-<slug>.spec.ts`. No `.only`, `.skip`, `.todo`, `xit`, `pytest.mark.skip`/`skipif`/`xfail`;
  every test asserts (`expect` / `assert`).
- Accessibility in e2e: `import AxeBuilder from '@axe-core/playwright'` →
  `expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])` on key screens
  (`e2e/design-system.spec.ts` does it for login, signup, the signed-in shell, both shell previews and the gallery).
- Log out is in the shell's account menu: `getByRole('button', { name: /^Account menu/ })` →
  `getByRole('menuitem', { name: 'Log out' })`.
- Playwright `locator.evaluate(fn)` takes a FUNCTION, never a string of code (a string is evaluated as an
  expression and the function is never called: the test can never pass). Prefer web-first assertions
  (`toHaveText`, `toHaveCSS`, `toBeVisible`) over `evaluate`.
- API tests: `with api_client() as client:` + `sign_up(client)` from `apps/api/tests/helpers.py`, acting as a
  user with `headers={"cookie": user.cookie}`; use `unique_email()`: tests in one file share the DB (each file starts on a fresh copy, so never rely on another file's rows). Every new
  protected route gets a 401 test and an "user B cannot read/modify user A's resource → 404" test. Rate limits
  are off in the test env; `api_client(RATE_LIMIT_AUTH_MAX=2)` builds an app with setting overrides, and
  `production_settings()` gives a production config.
- Dev-only features (`/dev/*`): router included only outside production, login-only, recipient-only
  (`docs/conventions.md` § Dev-only stand-ins).
- e2e: use `getByRole` / `getByLabel`; scope alerts to their form (Next also renders a `role=alert`
  route announcer).

## Docs

- `docs/conventions.md`: adding a resource end-to-end (worked example), error handling, authz tests.
- `docs/design.md`: design guide (principles, layout patterns with component names, states, formatting,
  writing, accessibility). Gallery: `/dev/ui` in dev (`./init.sh`, then `http://localhost:$WEB_PORT/dev/ui`).
- Next.js 16 docs matching the installed version: `apps/web/node_modules/next/dist/docs/` (APIs differ from older
  Next.js: async `cookies()`/`headers()`, Turbopack by default, no `next lint`).
- Staging: `./staging.sh up|down|status` builds `Dockerfile.api` / `Dockerfile.web` (compose.staging.yml)
  against the host Postgres DB `<DB_NAME>_staging` (a one-shot `migrate` service runs first); web on
  `WEB_PORT+1000`, api on `API_PORT+1000`.
- FastAPI docs for the installed version: `http://localhost:$API_PORT/docs` (dev only) shows every route.
- `docs/coding-rules.md` § Data safety: CHECK constraints, snapshots, partial unique indexes, idempotency
  keys, keyset pagination, timeouts, no secrets/PII in logs.
