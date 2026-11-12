# shellcheck shell=bash
# Shared helpers for ./init.sh, ./verify and ./staging.sh. Bash 3.2 compatible (macOS /bin/bash).

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Node 22 (Homebrew keg-only) wins over whatever node is first on the caller's PATH.
if [ -d /opt/homebrew/opt/node@22/bin ]; then
  PATH="/opt/homebrew/opt/node@22/bin:$PATH"
fi
export PATH
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export NEXT_TELEMETRY_DISABLED=1
NODE="node --disable-warning=ExperimentalWarning"

die() { echo "error: $*" >&2; exit 1; }

check_node() {
  command -v node >/dev/null 2>&1 || die "node not found (need Node >= 22.18)"
  local v; v="$(node -p 'process.versions.node')"
  local major="${v%%.*}" rest="${v#*.}"; local minor="${rest%%.*}"
  if [ "$major" -lt 22 ] || { [ "$major" -eq 22 ] && [ "$minor" -lt 18 ]; }; then
    die "Node $v found; need >= 22.18 (native TypeScript type stripping)"
  fi
}

# pnpm pinned by package.json "packageManager", run through Node 22's corepack (never a global pnpm).
# A shim dir is put first on PATH so nested `pnpm` calls inside package scripts use the same version.
setup_pnpm() {
  local shim="$ROOT/.run/bin"
  if [ ! -x "$shim/pnpm" ]; then
    mkdir -p "$shim"
    printf '#!/bin/sh\nexec corepack pnpm "$@"\n' >"$shim/pnpm"
    chmod +x "$shim/pnpm"
  fi
  PATH="$shim:$PATH"
  export PATH
}
pnpm() { corepack pnpm "$@"; }

# Main checkout (owner of .git) even when running inside a `git worktree`.
main_root() {
  local common
  common="$(git -C "$ROOT" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
  if [ -n "$common" ]; then dirname "$common"; else echo "$ROOT"; fi
}

# .env of this checkout, else the main checkout's (worktrees have none). Empty if neither exists.
env_file() {
  local main
  if [ -f "$ROOT/.env" ]; then echo "$ROOT/.env"; return; fi
  main="$(main_root)"
  if [ -f "$main/.env" ]; then echo "$main/.env"; return; fi
  echo ""
}

# Creates .env in the main checkout from .env.example (once), then exports its variables.
ensure_env() {
  local file main
  file="$(env_file)"
  if [ -z "$file" ]; then
    main="$(main_root)"
    [ -f "$main/.env.example" ] || die "no .env or .env.example in $main"
    if grep -q '[{][{]' "$main/.env.example"; then
      die ".env.example still contains template placeholders; substitute PROJECT/DB_NAME/API_PORT/WEB_PORT first"
    fi
    local user secret
    user="${DB_USER:-$(whoami)}"
    secret="$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')"
    sed -e "s#postgres://DB_USER@#postgres://${user}@#" -e "s#^SESSION_SECRET=change-me\$#SESSION_SECRET=${secret}#" \
      "$main/.env.example" >"$main/.env"
    echo "created $main/.env" >&2
    file="$main/.env"
  elif grep -q '^SESSION_SECRET=change-me$' "$file"; then
    local secret
    secret="$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')"
    sed -i.bak "s#^SESSION_SECRET=change-me\$#SESSION_SECRET=${secret}#" "$file" && rm -f "$file.bak"
  fi
  ENV_FILE="$file"
  set -a
  # shellcheck disable=SC1090
  . "$file"
  set +a
}

# Installs dependencies when node_modules is missing or older than the lockfile.
ensure_deps() {
  if [ ! -d "$ROOT/node_modules/.pnpm" ] || [ "$ROOT/pnpm-lock.yaml" -nt "$ROOT/node_modules/.pnpm/lock.yaml" ]; then
    (cd "$ROOT" && pnpm install --frozen-lockfile --prefer-offline --reporter=silent) || return 1
  fi
}

now() { perl -MTime::HiRes=time -e 'printf "%.3f", time' 2>/dev/null || date +%s; }
elapsed() { perl -e 'printf "%.1f", $ARGV[1]-$ARGV[0]' "$1" "$2" 2>/dev/null || echo "?"; }

# Prints a free TCP port.
free_port() {
  node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{process.stdout.write(String(s.address().port));s.close()})'
}
