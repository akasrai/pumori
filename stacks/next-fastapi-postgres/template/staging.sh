#!/usr/bin/env bash
# Staging = production Docker images (compose.staging.yml) against a separate database on the
# HOST Postgres (<DB_NAME>_staging), reached from containers via host.docker.internal.
# Migrations run the way they run in production: the API image's one-shot `migrate` service
# applies them before the API starts.
#
#   ./staging.sh up       create the staging DB on the host, build images, migrate, start, wait for health
#   ./staging.sh down     stop and remove the containers
#   ./staging.sh status   docker compose ps
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/scripts/lib.sh"
cd "$ROOT"

docker info >/dev/null 2>&1 || die "Docker is not running. Start Docker Desktop (open -a Docker), wait until it is ready, then retry."

check_node
setup_pnpm
ensure_env >/dev/null

export PROJECT DB_NAME
export STAGING_DB_NAME="${DB_NAME}_staging"
export STAGING_API_PORT=$((API_PORT + 1000))
export STAGING_WEB_PORT=$((WEB_PORT + 1000))
DB_USER_FROM_URL="$(node -e 'process.stdout.write(decodeURIComponent(new URL(process.argv[1]).username))' "$DATABASE_URL")"
export STAGING_DB_USER="${DB_USER_FROM_URL:-$(whoami)}"
SECRET_FILE="$(main_root)/.run/staging-session-secret"
mkdir -p "$(dirname "$SECRET_FILE")"
[ -s "$SECRET_FILE" ] || node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))' >"$SECRET_FILE"
STAGING_SESSION_SECRET="$(cat "$SECRET_FILE")"
export STAGING_SESSION_SECRET

compose() { docker compose -p "${PROJECT}-staging" -f compose.staging.yml "$@"; }

wait_url() {
  local i=0
  while [ "$i" -lt 120 ]; do curl -fs -o /dev/null --max-time 5 "$1" 2>/dev/null && return 0; sleep 1; i=$((i + 1)); done
  return 1
}

case "${1:-}" in
  up)
    [ -d node_modules/.pnpm ] || pnpm install --frozen-lockfile --prefer-offline
    ensure_py_deps || die "uv sync failed in apps/api"
    $UV python apps/api/scripts/testdb.py create "$STAGING_DB_NAME"
    compose up -d --build || { compose logs --tail 40 migrate; die "staging failed to start (migrate log above)"; }
    echo "migrate: $(compose logs --no-log-prefix migrate 2>/dev/null | tail -n 1)"
    wait_url "http://localhost:$STAGING_API_PORT/readyz" \
      || { compose logs --tail 40 api; die "staging api not healthy. If it cannot reach Postgres, see the pack README (host.docker.internal access)."; }
    wait_url "http://localhost:$STAGING_WEB_PORT/login" || { compose logs --tail 40 web; die "staging web not healthy"; }
    echo "staging web: http://localhost:$STAGING_WEB_PORT"
    echo "staging api: http://localhost:$STAGING_API_PORT"
    ;;
  down) compose down --remove-orphans ;;
  status) compose ps ;;
  *) die "usage: ./staging.sh up|down|status" ;;
esac
