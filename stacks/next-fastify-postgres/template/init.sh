#!/usr/bin/env bash
# Idempotent local bootstrap: deps, .env, dev database + migrations, API + web dev servers.
#
#   ./init.sh            start (or confirm running) api + web; logs in .run/*.log
#   ./init.sh --prod     same, but `next build && next start` instead of `next dev`
#   ./init.sh stop       stop both servers
#   ./init.sh status     show what is running
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/scripts/lib.sh"
cd "$ROOT"

RUN="$ROOT/.run"
mkdir -p "$RUN"

pid_alive() { [ -f "$RUN/$1.pid" ] && kill -0 "$(cat "$RUN/$1.pid")" 2>/dev/null; }

stop_one() {
  local name="$1" pid
  if pid_alive "$name"; then
    pid="$(cat "$RUN/$name.pid")"
    # Each server runs in its own process group (set -m below); stop the whole group.
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$pid" 2>/dev/null || break; sleep 0.5; done
    kill -KILL -- "-$pid" 2>/dev/null || true
    echo "stopped $name (pid $pid)"
  else
    echo "$name not running"
  fi
  rm -f "$RUN/$name.pid"
}

status() {
  ensure_env >/dev/null
  local name port
  for name in api web; do
    if [ "$name" = api ]; then port="$API_PORT"; else port="$WEB_PORT"; fi
    if pid_alive "$name"; then
      echo "$name: running (pid $(cat "$RUN/$name.pid")) http://localhost:$port  log: .run/$name.log"
    else
      echo "$name: stopped"
    fi
  done
}

wait_for() { # <url> <name> <seconds>
  local url="$1" name="$2" secs="$3" i=0
  while [ "$i" -lt $((secs * 2)) ]; do
    if curl -fs -o /dev/null --max-time 5 "$url" 2>/dev/null; then return 0; fi
    pid_alive "$name" || { echo "error: $name exited; last log lines:" >&2; tail -n 30 "$RUN/$name.log" >&2; exit 1; }
    sleep 0.5; i=$((i + 1))
  done
  echo "error: $name did not answer $url within ${secs}s; see .run/$name.log" >&2
  exit 1
}

port_busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

start() {
  local prod="${1:-}"
  check_node
  setup_pnpm
  ensure_env
  if [ ! -d node_modules/.pnpm ] || [ pnpm-lock.yaml -nt node_modules/.pnpm/lock.yaml ]; then
    echo "installing dependencies…"
    pnpm install --frozen-lockfile --prefer-offline
  fi

  echo "database: $DB_NAME"
  $NODE apps/api/scripts/testdb.ts ensure "$DB_NAME"

  set -m # background jobs get their own process group so `stop` can kill children too
  if pid_alive api; then
    echo "api already running (pid $(cat "$RUN/api.pid"))"
  else
    port_busy "$API_PORT" && die "port $API_PORT is in use by another process (lsof -iTCP:$API_PORT)"
    (cd apps/api && exec $NODE src/server.ts) >"$RUN/api.log" 2>&1 &
    echo $! >"$RUN/api.pid"
  fi
  wait_for "http://localhost:$API_PORT/health" api 30

  if pid_alive web; then
    echo "web already running (pid $(cat "$RUN/web.pid"))"
  else
    port_busy "$WEB_PORT" && die "port $WEB_PORT is in use by another process (lsof -iTCP:$WEB_PORT)"
    if [ "$prod" = --prod ]; then
      echo "building web (next build)…"
      (cd apps/web && ./node_modules/.bin/next build) >"$RUN/web-build.log" 2>&1 \
        || { tail -n 40 "$RUN/web-build.log" >&2; die "next build failed; see .run/web-build.log"; }
      (cd apps/web && exec ./node_modules/.bin/next start --port "$WEB_PORT") >"$RUN/web.log" 2>&1 &
    else
      (cd apps/web && exec ./node_modules/.bin/next dev --port "$WEB_PORT") >"$RUN/web.log" 2>&1 &
    fi
    echo $! >"$RUN/web.pid"
  fi
  set +m
  wait_for "http://localhost:$WEB_PORT/login" web 120

  echo
  echo "web:    http://localhost:$WEB_PORT"
  echo "api:    http://localhost:$API_PORT  (health: /health; browser calls go through web /api/*)"
  echo "logs:   .run/api.log .run/web.log   stop: ./init.sh stop"
}

case "${1:-}" in
  "" | --prod) start "${1:-}" ;;
  stop) stop_one web; stop_one api ;;
  status) status ;;
  restart) stop_one web; stop_one api; start "${2:-}" ;;
  *) die "usage: ./init.sh [--prod|stop|status|restart]" ;;
esac
