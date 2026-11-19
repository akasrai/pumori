"""Checkout-aware environment helpers (the Python twin of scripts/env.ts; both must name things the same way).

Every git worktree gets its own test databases, derived from a hash of the checkout's absolute path,
so parallel agents never collide.
"""

import hashlib
import os
import subprocess
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

HERE = Path(__file__).resolve().parent
TEST_SESSION_SECRET = "test-session-secret-not-for-production-use"  # noqa: S105 - automated tests only


def _git(*args: str) -> str | None:
    try:
        return subprocess.run(["git", *args], cwd=HERE, capture_output=True, text=True, check=True).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def checkout_root() -> Path:
    return Path(_git("rev-parse", "--show-toplevel") or HERE.parents[2])


def main_root() -> Path:
    common = _git("rev-parse", "--path-format=absolute", "--git-common-dir")
    return Path(common).parent if common else checkout_root()


def env_file() -> Path | None:
    for root in (checkout_root(), main_root()):
        if (root / ".env").exists():
            return root / ".env"
    return None


def load_env() -> None:
    """Loads .env into os.environ without overriding variables that are already set."""
    path = env_file()
    if not path:
        return
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.split(" #", 1)[0].strip().strip("'\"")
        os.environ.setdefault(key.strip(), value)


def require_env(name: str) -> str:
    load_env()
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"{name} is not set. Run ./init.sh in the main checkout to create .env.")
    return value


def hash_of_checkout(root: Path | str) -> str:
    return hashlib.sha256(str(root).encode()).hexdigest()[:8]


def test_db_name(kind: str) -> str:
    """Per-checkout database name: <DB_NAME>_<kind>_<hash> (t: pytest, e: e2e, m: new_migration.py)."""
    return f"{require_env('DB_NAME')}_{kind}_{hash_of_checkout(checkout_root())}"


def database_url_for(db_name: str) -> str:
    """Same server and credentials as DATABASE_URL, different database."""
    parts = urlsplit(require_env("DATABASE_URL"))
    return urlunsplit((parts.scheme, parts.netloc, f"/{db_name}", parts.query, parts.fragment))
