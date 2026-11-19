# Stack pack: next-fastapi-postgres

Golden-path template for Pumori products with a Python API: Next.js 16 (App Router) web app + FastAPI
(Python 3.13, uv) + Postgres 16 (SQLAlchemy 2, Alembic). Pydantic models are the single source of truth for
API contracts; `apps/api/scripts/gen_contracts.py` generates the zod schemas the web app imports from
`@app/shared`, and `./verify --quick` fails when they are stale. Email/password session auth scaffold.

The web app, design system, app shells, brand targets, Playwright e2e setup and the ./verify output format
are the same as `next-fastify-postgres`, so the Designer, frontend developers and QA work exactly as there.
Only the API, its tests and the contract source differ.

- `stack.json` – contract Pumori reads (commands, URLs, test globs/naming, placeholders, areas). It also
  sets `broad_change_regex` (Python dependency and test-setup files run the whole suite at the merge gate)
  and `risky_regex` (files that get the stricter review).
- `template/` – the repo copied into each new product. Placeholders `{{PROJECT}}`, `{{DB_NAME}}`,
  `{{API_PORT}}`, `{{WEB_PORT}}` appear **only** in `template/.env.example`.
- Agent-facing docs live in the template: `AGENTS.md` (map, commands, rules), `docs/conventions.md` (adding
  a resource end to end, in Python), `docs/coding-rules.md` (TypeScript and Python rules).

## Host requirements

- Node ≥ 22.18 (Homebrew `node@22` is put first on PATH by the scripts); pnpm pinned via `packageManager`
  and run through corepack.
- uv (`brew install uv`). The API's venv lives in `apps/api/.venv` (`uv sync --frozen`, done by `./verify`
  and `./init.sh`); uv downloads Python 3.13 if the machine has none. `[tool.uv] exclude-newer = "14 days"`
  is the Python twin of pnpm's `minimumReleaseAge`.
- Local Postgres reachable at `localhost:5432` by the current user without password (Homebrew default).
  Test DBs: `<DB_NAME>_tpl` (migrated template), `<DB_NAME>_t_<hash>` (pytest), `<DB_NAME>_e_<hash>` (e2e),
  `<DB_NAME>_m_<hash>` (scratch DB of `new_migration.py`), per checkout.
- Type checking: pyright (npm devDependency, `standard` mode). Lint/format: ruff. Optional: gitleaks,
  semgrep (`p/typescript` + `p/python`), pip-audit; each is skipped with a note when missing.

## How Pumori runs it

| Pumori step | What runs |
|---|---|
| `./verify --quick` | tsc (root, shared, web) + pyright + `gen_contracts.py --check`; eslint + ruff check + ruff format --check |
| `./verify --tests <files>` | Vitest for `apps/web/test/*`, pytest for `apps/api/tests/test_*.py`, Playwright for `e2e/*.spec.ts`; a changed API `.py` file runs the whole API suite (API tests go through HTTP, so imports don't say what they cover) |
| Test naming | `apps/api/tests/test_<TASK>_<slug>.py`, `apps/web/test/<TASK>-<slug>.test.tsx`, `e2e/<TASK>-<slug>.spec.ts` |
| Protected test setup | `apps/api/tests/conftest.py`, `helpers.py`; extra test settings go in `apps/api/test_env.py` (editable) |
| Contract area | `apps/api/app/contracts/**`, `packages/shared/**`, `models.py`, `migrations/**` |

## Staging (Docker)

`./staging.sh up|down|status`, as in the TypeScript pack: the API image is `python:3.13-slim` with the
locked venv, migrations run as the one-shot `migrate` service (`alembic upgrade head`), then the API and web.

## Status

Verified on macOS (Node 22, Python 3.13.2, uv 0.11, Postgres 16) on a project created with `pumori new`:
`./verify` full pass (typecheck, lint, 12 web unit tests, 39 API tests, Playwright e2e, gitleaks, semgrep,
pnpm audit), `./init.sh` start/status/stop with sign-up through the web `/api` rewrite, and the
`docs/conventions.md` notes example built end to end (contract → generated zod → migration → routes →
authorization test). **Not yet exercised:** the Docker images and `staging.sh up`, pip-audit, and a full
`/pumori:factory` run (the benchmark PRDs have not been run on this pack yet).
