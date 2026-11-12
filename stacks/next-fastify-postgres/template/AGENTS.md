# AGENTS.md

pnpm monorepo: Next.js web app + Fastify API + Postgres (Drizzle ORM), TypeScript strict throughout.
Read `docs/conventions.md` before adding a feature and `docs/design.md` before building any UI.

## Map

| Path | What lives there |
|---|---|
| `packages/shared/src/` | zod schemas + inferred types: the **single source of truth** for API contracts (`@app/shared`) |
| `apps/api/src/app.ts` | `buildApp()`: Fastify instance (helmet, rate limit, body limit, timeouts), error handler, route registration (tests use `app.inject`) |
| `apps/api/src/server.ts` | listens on `API_PORT` |
| `apps/api/src/env.ts` | zod-validated env (server-only secrets; refuses unsafe production config). `WEB_ORIGIN` = the web app's public URL: build every link the API sends (invite, reset) as `${env.WEB_ORIGIN}/...`; it's already set for dev, tests, e2e and staging, so never edit test runner configs for it. New env vars needed only by API tests go in `apps/api/test-env.ts` |
| `apps/api/src/routes/` | one plugin file per resource (`auth.ts`, `health.ts`: `/livez` `/readyz` `/health`, `dev-mail.ts`: dev-only) |
| `apps/api/src/lib/` | `errors.ts` (AppError helpers), `validate.ts` (`parse(schema, input)`), `session.ts` (`requireUser`, `currentUser`), `password.ts`, `rate-limit.ts`, `logger.ts` (redaction), `mailer.ts`, `dev-only.ts`, `report-error.ts` |
| `apps/api/src/db/` | `schema.ts` (Drizzle tables; migrations generated into `apps/api/drizzle/`), `client.ts` (pool + timeouts), `migrate.ts` (also the deploy-time migrator) |
| `apps/api/test/` | Vitest integration tests (`buildApp()` + real per-checkout Postgres DB) |
| `apps/web/app/` | Next.js App Router: `(app)/` signed-in pages inside the app shell (`/`, dev-only `/dev/mail`), `(auth)/` (`/login`, `/signup`), dev-only `/dev/ui` (UI gallery) and `/dev/ui/shells/<sidebar|topbar>` (shell previews), `error.tsx`, `global-error.tsx`, `not-found.tsx`; `theme.css` (every colour token, light and dark: the one file a brand replaces), `globals.css` (Tailwind v4 theme: token mapping, type, density), `fonts/` (`fontSans`, Geist by default, OFL) |
| `apps/web/components/ui/` | **the design system**: shadcn/ui components (Radix) themed by `app/theme.css` (every colour token) and `app/fonts/` (the font). Build every screen from these; see them all at `/dev/ui` |
| `apps/web/components/shell/` | `AppShell` renders the product's shell, chosen by `APP_SHELL` (`'sidebar'` \| `'topbar'`) in `lib/app-constants.ts`: `SidebarShell` (220 px left sidebar) or `TopbarShell` (Vercel-style top bar + underline tabs). Both read `SHELL_NAV` (`shell-nav-items.ts`); `ContextSwitcher` (team/project switcher slot), `UserMenu`, `AuthShell`, and `FocusShell` (full-screen document layout with independently scrolling tree and content, for reports and drafting pages). Which shell when: `docs/design.md` § Choosing a shell |
| `apps/web/components/` | feature components (by module: `components/<module>/`); `dev/` is the gallery; hooks go in `apps/web/hooks/` |
| `apps/web/lib/` | `api.ts` (browser → `/api/*`), `server-api.ts` (Server Components → API), `format-utils.ts` (numbers, money, dates), `utils.ts` (`cn`), `app-constants.ts` (`APP_NAME`, `APP_SHELL`, routes), `report-error.ts`; `instrumentation.ts` and `next.config.ts` (security headers) sit at `apps/web/` |
| `apps/web/test/` | Vitest + Testing Library component tests (jsdom) |
| `e2e/` | Playwright specs (own API + web servers, own DB, per-checkout ports) |
| `scripts/` | `env.ts` (checkout-aware env/DB naming), `lib.sh` (shell helpers) |
| `README.md` | setup, env vars (production requirements), migrations, deploy, rollback, security notes |

Browser code calls `/api/*`; Next rewrites it to the API (`/api/auth/me` → `API /auth/me`), so cookies stay same-origin.

## Commands

| Command | Use |
|---|---|
| `./init.sh` / `./init.sh stop` / `./init.sh status` | install, create `.env` + dev DB, migrate, run api + web (logs `.run/*.log`); `--prod` = production web build |
| `./verify --quick` | typecheck + lint/architecture rules. Run after every change |
| `./verify --tests <file>...` | quick checks + only these tests (`e2e/*.spec.ts` → Playwright, `apps/*/test/*` → Vitest), all run in parallel. **The command for task work**; a source file runs the unit tests that import it |
| `./verify` | full gate: typecheck → lint → unit → e2e → security. Run by the merge gate, the milestone check and release; don't run it (or `--e2e`) during a task, it takes minutes |
| `./verify --e2e` / `./verify --security` | all Playwright tests / gitleaks + semgrep + `pnpm audit` |
| `./verify --release` | full gate + `next build` + e2e against the production build (before a release) |
| `corepack pnpm --filter @app/api db:generate --name <slug>` | create a migration after editing `schema.ts` |
| `corepack pnpm <cmd>` | always use corepack (pinned pnpm 10); a global `pnpm` may be too old |

`./verify` prints one line per passing step and only the relevant errors for a failing one;
full logs are in `.verify/<step>.log`. It works in any git worktree: it uses the main checkout's
`.env`, installs `node_modules` if missing, and gives each checkout its own test DBs and ports.

## Rules

1. **Shared schemas first.** Every request/response shape is a zod schema in `packages/shared` and is
   imported by both apps. Never duplicate a type in an app.
2. **No cross-app imports** (enforced by lint): web ↛ api, api ↛ web. Only `@app/shared` is shared, and
   only via its entry point. `packages/shared` stays framework-free (zod only).
3. **Validate every input** (body, params, query) with `parse(sharedSchema, request.X)`.
4. **Authorization:** every route touching user data uses `{ preHandler: requireUser }`, and every
   query on a user-owned table filters by `currentUser(request).id`. Another user's resource → **404**
   (`notFound()`), never 403, never the data.
5. **Migrations via drizzle-kit only.** Edit `schema.ts`, run `db:generate`, commit the SQL + `meta/`.
   Never edit or delete an existing migration; never hand-write DDL elsewhere.
6. **Errors** are `{error:{code,message}}`: throw `AppError` helpers from `apps/api/src/lib/errors.ts`.
   Handler order: authenticate → authorize (404) → validate body → rate-limit-sensitive work → side effects.
7. **Secrets only server-side**: env lives in `apps/api/src/env.ts`; never put secrets in web code,
   `NEXT_PUBLIC_*` vars, shared schemas or responses (no password hashes/tokens in DTOs).
8. No `any`, no `@ts-ignore`, no non-null `!`. Relative imports in api/shared use the `.ts` extension
   (Node runs TypeScript natively; typecheck enforces it).
9. Do not edit `.env` (gitignored, shared by worktrees), `pnpm-lock.yaml` by hand, or committed migrations.
10. **Coding rules (frontend and backend): read `docs/coding-rules.md` before writing code.** In short:
   arrow functions only; named exports (except Next pages/layouts and configs); `interface` for shapes; no
   enums (`as const` + union); no `any`; zod-parse every input; API functions → hooks → components; a
   blank line before return/if/loops; single quotes and semicolons. `./verify` lints most of these.
11. **UI: follow `docs/design.md`.** Build pages only from `@/components/ui/*` and the shell (look them up
   at `/dev/ui`, source in `apps/web/components/dev/`); every view handles loading, empty, error and success.
   Colours are semantic tokens (`bg-primary`, `text-muted-foreground`, `bg-success-subtle`), never raw
   Tailwind shades or hex (lint), and only `components/ui` imports Radix, sonner or cva (lint). A missing
   generic component goes into `components/ui/` and the gallery, not into a feature folder.

## Tests

- Task tests: `apps/api/test/<TASK-ID>-<slug>.test.ts`, `apps/web/test/<TASK-ID>-<slug>.test.tsx`,
  `e2e/<TASK-ID>-<slug>.spec.ts`. No `.only`, `.skip`, `.todo`, `xit`; every test asserts with `expect`.
- Accessibility in e2e: `import AxeBuilder from '@axe-core/playwright'` →
  `expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])` on key screens
  (`e2e/design-system.spec.ts` does it for login, signup, the signed-in shell, both shell previews and the gallery).
- Log out is in the shell's account menu: `getByRole('button', { name: /^Account menu/ })` →
  `getByRole('menuitem', { name: 'Log out' })`.
- Playwright `locator.evaluate(fn)` takes a FUNCTION, never a string of code (a string is evaluated as an
  expression and the function is never called: the test can never pass). Prefer web-first assertions
  (`toHaveText`, `toHaveCSS`, `toBeVisible`) over `evaluate`.
- API tests: `createTestApp()` + `signUp()` from `apps/api/test/helpers.ts`; use `uniqueEmail()` because
  test files run in parallel on one DB. Every new protected route gets a 401 test and an
  "user B cannot read/modify user A's resource → 404" test. Rate limits are off in the test env;
  `createTestAppWith({ ... })` builds an app with env overrides (strict limits, production config).
- Dev-only features (`/dev/*`): `registerDevOnly()`, login-only, recipient-only, never in production
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
- `docs/coding-rules.md` § Data safety: CHECK constraints, snapshots, partial unique indexes, idempotency
  keys, keyset pagination, timeouts, no secrets/PII in logs.
