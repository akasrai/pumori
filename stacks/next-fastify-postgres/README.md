# Stack pack: next-fastify-postgres

Golden-path template for Pumori products: Next.js 16 (App Router) + Fastify 5 + Postgres 16 (Drizzle),
pnpm 10 workspace, TypeScript 5.9 strict, shared zod contracts, email/password session auth scaffold.

- `stack.json` – contract Pumori reads (commands, URLs, test globs/naming, placeholders).
- `template/` – the repo copied into each new product. Placeholders `{{PROJECT}}`, `{{DB_NAME}}`,
  `{{API_PORT}}`, `{{WEB_PORT}}` appear **only** in `template/.env.example`.
- Agent-facing docs live in the template: `AGENTS.md` (map, commands, rules), `docs/conventions.md`.

## Creating a project

1. Copy `template/` (including dotfiles), substitute the placeholders in `.env.example`, `git init && git add -A && git commit`.
2. `./init.sh` → creates `.env` (Postgres role = `$DB_USER` or `$(whoami)`, random `SESSION_SECRET`),
   the dev DB, runs migrations, starts api + web. `./verify` is the gate (`VERIFY PASS` / `VERIFY FAIL: <steps>`).

## Host requirements

- Node ≥ 22.18 (Homebrew `node@22` is put first on PATH by the scripts). pnpm is pinned via
  `packageManager` (`pnpm@10.34.6`) and always run through `corepack pnpm` – no global install needed.
- Local Postgres reachable at `localhost:5432` by the current user without password (Homebrew default).
  Test DBs: `<DB_NAME>_tpl` (migrated template), `<DB_NAME>_t_<hash>` / `<DB_NAME>_e_<hash>` per checkout.
- Playwright Chromium is installed on demand by `./verify` (~150 MB, once per machine).
- Optional: gitleaks, semgrep (rules `p/typescript`, needs network), skipped with a note when missing.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 20160` (no package versions younger than 14 days).

## Staging (Docker)

`./staging.sh up|down|status`: migrates `<DB_NAME>_staging` on the host, then `docker compose -f
compose.staging.yml up --build`. Web: `WEB_PORT+1000`, API: `API_PORT+1000`. Containers reach the host
Postgres via `host.docker.internal`.

Docker Desktop for Mac forwards `host.docker.internal` to the host, but Postgres sees the connection from
a non-loopback address. If the api logs `no pg_hba.conf entry` or `connection refused`, the one-time
fix (deliberately not automated) is:

```sh
# postgresql.conf: listen beyond loopback; pg_hba.conf: trust Docker Desktop's VM subnet
echo "listen_addresses = '*'" >> /opt/homebrew/var/postgresql@16/postgresql.conf
echo "host all all 192.168.65.0/24 trust" >> /opt/homebrew/var/postgresql@16/pg_hba.conf
brew services restart postgresql@16
```

(Prefer a password-protected role over `trust` on shared machines.)

## Status

Verified on macOS (Node 22.23, Postgres 16.4): `./verify` full pass incl. Playwright e2e, `./init.sh`
(dev and `--prod`), worktree `.env`/DB isolation. The Docker images and `staging.sh up` were **not**
exercised (Docker Desktop was not running when the pack was built).
