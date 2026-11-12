# App

A pnpm monorepo: Next.js 16 web app (`apps/web`), Fastify 5 API (`apps/api`), shared zod contracts
(`packages/shared`), Postgres 16 through Drizzle ORM. Email/password sessions, rate limiting, security
headers and health checks are built in. Agents: read `AGENTS.md` first.

The web app has a design system: Tailwind CSS v4 + shadcn/ui components (Radix) in
`apps/web/components/ui/`, themed by `apps/web/app/theme.css` (colours) and `apps/web/app/fonts/` (Geist by default), an app
shell (sidebar or Vercel-style top bar, picked by `APP_SHELL`) in `apps/web/components/shell/`, and light/dark tokens in
`apps/web/app/globals.css`. Guide: `docs/design.md`. In development, every component is shown at
`/dev/ui` (a 404 in production).

## Local setup

Needs Node 22.18+, a local Postgres 16 and corepack (ships with Node).

```sh
./init.sh            # install, create .env + dev DB, migrate, start api + web (logs in .run/)
./init.sh --prod     # same, with a production web build (next build && next start)
./init.sh stop       # stop both
```

## Environment

`.env` is created from `.env.example` on first run; `apps/api/src/env.ts` validates every variable and
the API refuses to start on a bad value.

| Variable | Default | Production |
|---|---|---|
| `DATABASE_URL` | – | **required** |
| `SESSION_SECRET` | `change-me` (init.sh generates one) | **required**, 32+ random bytes, never `change-me` |
| `COOKIE_SECURE` | `false` | **must be `true`** (https); refused otherwise |
| `ALLOW_INSECURE_COOKIES` | `false` | never; only for local http staging |
| `NODE_ENV` | `development` | `production` (disables `/dev/*` routes and the dev mail outbox) |
| `API_PORT`, `HOST` | –, `localhost` | `HOST=0.0.0.0` in containers |
| `TRUST_PROXY` | `false` | hop count or proxy CIDRs, e.g. `1` behind the web `/api` rewrite |
| `DB_POOL_MAX`, `DB_STATEMENT_TIMEOUT_MS` | `10`, `10000` | size the pool to `max_connections / instances` |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_LOGIN_EMAIL_MAX` | `300`/min, `20`/15 min, `10`/15 min | tune per product |
| `MAIL_TRANSPORT` | `dev` (dev), `log` (prod) | `log` until a real transport exists (see `apps/api/src/lib/mailer.ts`) |
| `WEB_ORIGIN` | `http://localhost:$WEB_PORT` | **required, https**: the public URL of the web app; links the API writes into emails and responses (`env.WEB_ORIGIN`) |
| `LOG_LEVEL` | `info` | `info` |
| `API_URL` (web) | `http://localhost:$API_PORT` | the API's internal address; baked into the `/api` rewrite at build time |

## Verify

```sh
./verify --quick     # typecheck + lint (after every change)
./verify             # full gate: typecheck, lint, unit, e2e, security
./verify --release   # full gate + production build + e2e against `next start`
```

CI (`.github/workflows/ci.yml`) runs `./verify` against a `postgres:16` service plus `next build`.

## Migrations

- Change `apps/api/src/db/schema.ts`, then `corepack pnpm --filter @app/api db:generate --name <slug>`
  and commit `apps/api/drizzle/`. Never edit a committed migration.
- Dev: `./init.sh` (or `corepack pnpm db:migrate`) applies pending migrations.
- Deploy: run the API image once with the migrator **before** starting the new version:
  `docker run --rm -e DATABASE_URL=… <api-image> node --disable-warning=ExperimentalWarning src/db/migrate.ts`.
  It is idempotent and waits at most 10 s for table locks.

## Staging and deploy

`./staging.sh up|down|status` builds the production images (`Dockerfile.api`, `Dockerfile.web`) and runs
`compose.staging.yml` against the host Postgres database `<DB_NAME>_staging`: the one-shot `migrate`
service runs first, then the API (healthy on `/readyz`), then the web app. Web: `WEB_PORT+1000`, API:
`API_PORT+1000`.

A production deploy follows the same order: back up, migrate, roll out API, roll out web. Probes:
`/livez` (process up; use for liveness/restarts) and `/readyz` (database reachable; use for traffic).
`/health` is an alias of `/readyz`. Expose only the web app; keep the API private.

## Rollback

Migrations are **forward-only**: there are no down migrations.

1. Take a database backup (or snapshot) before every migrate.
2. If a release is bad but its migration is compatible with the old code (additive changes), roll back
   the images only.
3. Otherwise restore the backup and deploy the previous images, or ship a new forward migration that
   fixes the schema. Write migrations so the previous release still works (add columns nullable or with
   a default; drop columns one release after the code stops using them).

## Security notes

- Sessions: random 256-bit tokens in a signed, httpOnly, SameSite=Lax cookie; only a sha256 of the token
  is stored. 30-day absolute lifetime, 7-day idle timeout; expired sessions are purged.
- Passwords: scrypt (N=2^17, r=8, p=1), rehashed at login when the parameters change.
- Rate limits: global per IP, stricter on `/auth/login` (per IP and per email) and `/auth/signup`. The
  store is in memory (per process); use a shared store (Redis) when running several API instances. Set
  `TRUST_PROXY` correctly, or every client shares the proxy's IP.
- Headers: CSP with `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy, HSTS in
  production (`apps/web/next.config.ts`, helmet on the API). The CSP allows inline scripts because Next
  needs them without nonces; see the comment in `next.config.ts` to move to nonces.
- Logs: URLs have token-like segments and query strings redacted; cookie and authorization headers are
  censored. Never log tokens or personal data.
- Errors: no stack traces or input echoed to clients; `reportError` hooks (web and API) are stubs to wire
  to Sentry or OpenTelemetry.
- Dev stand-ins (`/dev/*`, dev mail outbox) are never registered when `NODE_ENV=production`.
