"""Database lifecycle helpers used by tests, e2e, init.sh and staging.sh.

    python scripts/testdb.py prepare <t|e|m> fresh per-checkout DB (t: pytest, e: e2e, m: new_migration.py)
    python scripts/testdb.py ensure <name>   create DB if missing + apply migrations
    python scripts/testdb.py create <name>   create DB if missing (staging: the image migrates it)
    python scripts/testdb.py drop <t|e>      drop one of this checkout's test DBs
    python scripts/testdb.py drop-test       drop this checkout's test DBs
    python scripts/testdb.py sweep [--all]   drop test DBs of checkouts that no longer exist (--all: every one)

Test DBs are cloned (CREATE DATABASE ... TEMPLATE) from <DB_NAME>_tpl, rebuilt only when the migrations
change (their hash is stored as the database comment). An advisory lock serialises parallel worktrees.
"""

import hashlib
import json
import re
import subprocess
import sys
import time
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

import psycopg
from alembic import command
from alembic.config import Config
from psycopg import sql

sys.path.insert(0, str(Path(__file__).resolve().parent))
from checkout_env import database_url_for, hash_of_checkout, main_root, require_env, test_db_name

API_DIR = Path(__file__).resolve().parents[1]
MIGRATIONS_DIR = API_DIR / "migrations"


def _safe(name: str) -> str:
    if not re.fullmatch(r"[a-z_][a-z0-9_]{0,62}", name):
        raise SystemExit(f"Unsafe database name: {name}")
    return name


def migrations_hash() -> str:
    digest = hashlib.sha256()
    for path in sorted(p for p in MIGRATIONS_DIR.rglob("*") if p.is_file() and "__pycache__" not in p.parts):
        digest.update(str(path.relative_to(MIGRATIONS_DIR)).encode() + b"\0" + path.read_bytes() + b"\0")
    return digest.hexdigest()[:16]


@contextmanager
def admin() -> Iterator[psycopg.Connection]:
    with psycopg.connect(database_url_for("postgres"), autocommit=True) as conn:
        yield conn


def _comment(conn: psycopg.Connection, name: str) -> str | bool | None:
    """False = database missing; None = exists without comment."""
    row = conn.execute(
        "select shobj_description(oid, 'pg_database') from pg_database where datname = %s", (name,)
    ).fetchone()
    return False if row is None else row[0]


def _drop(conn: psycopg.Connection, name: str) -> None:
    conn.execute(sql.SQL("drop database if exists {} with (force)").format(sql.Identifier(_safe(name))))


def _create(conn: psycopg.Connection, name: str, template: str | None = None) -> None:
    for attempt in range(21):
        try:
            if template:
                conn.execute(
                    sql.SQL("create database {} template {}").format(
                        sql.Identifier(_safe(name)), sql.Identifier(_safe(template))
                    )
                )
            else:
                conn.execute(sql.SQL("create database {}").format(sql.Identifier(_safe(name))))
            return
        except psycopg.errors.ObjectInUse:  # template still has a lingering connection
            if attempt == 20:
                raise
            time.sleep(0.1)


def migrate(database_url: str) -> None:
    config = Config(str(API_DIR / "alembic.ini"))
    config.attributes["database_url"] = database_url
    command.upgrade(config, "head")


def _ensure_template(conn: psycopg.Connection) -> str:
    tpl = _safe(f"{require_env('DB_NAME')}_tpl")
    digest = migrations_hash()
    current = _comment(conn, tpl)
    if current == digest:
        return tpl
    if current is not False:
        _drop(conn, tpl)
    _create(conn, tpl)
    migrate(database_url_for(tpl))
    conn.execute(sql.SQL("comment on database {} is {}").format(sql.Identifier(tpl), sql.Literal(digest)))
    return tpl


@contextmanager
def template_lock(conn: psycopg.Connection) -> Iterator[None]:
    key = f"pumori-tpl:{require_env('DB_NAME')}"
    conn.execute("select pg_advisory_lock(hashtext(%s))", (key,))
    try:
        yield
    finally:
        conn.execute("select pg_advisory_unlock(hashtext(%s))", (key,))


def prepare(kind: str) -> str:
    """Recreates this checkout's test database from the migrated template; returns its URL."""
    name = test_db_name(kind)
    with admin() as conn, template_lock(conn):
        tpl = _ensure_template(conn)
        _drop(conn, name)
        _create(conn, name, tpl)
    return database_url_for(name)


def create(name: str) -> None:
    with admin() as conn:
        if _comment(conn, name) is False:
            _create(conn, name)


def ensure(name: str) -> str:
    create(name)
    url = database_url_for(name)
    migrate(url)
    return url


def drop(kind: str) -> None:
    with admin() as conn:
        _drop(conn, test_db_name(kind))


def _live_hashes() -> set[str]:
    out = subprocess.run(
        ["git", "worktree", "list", "--porcelain"], cwd=main_root(), capture_output=True, text=True, check=True
    ).stdout
    return {hash_of_checkout(line[len("worktree ") :]) for line in out.splitlines() if line.startswith("worktree ")}


def sweep(everything: bool) -> list[str]:
    """Drops leftover test DBs. Only names matching <DB_NAME>_(t|e|m)_<8 hex> are ever touched."""
    pattern = re.compile(rf"^{re.escape(require_env('DB_NAME'))}_(t|e|m)_([0-9a-f]{{8}})$")
    live = set() if everything else _live_hashes()
    dropped = []
    with admin() as conn:
        for (name,) in conn.execute("select datname from pg_database").fetchall():
            match = pattern.match(name)
            if match and match.group(2) not in live:
                _drop(conn, name)
                dropped.append(name)
    return dropped


def main(argv: list[str]) -> int:
    command, arg = [*argv, None, None][:2]
    if command == "prepare" and arg in ("t", "e", "m"):
        print(prepare(arg))
    elif command == "ensure" and arg:
        ensure(arg)
        print(f"ready: {arg}")
    elif command == "create" and arg:
        create(arg)
        print(f"exists: {arg}")
    elif command == "drop" and arg in ("t", "e", "m"):
        drop(arg)
    elif command == "drop-test":
        drop("t")
        drop("e")
    elif command == "sweep":
        print(json.dumps({"dropped": sweep(arg == "--all")}))
    else:
        print(
            "usage: testdb.py prepare <t|e> | ensure <name> | create <name> | drop <t|e> | drop-test | sweep [--all]",
            file=sys.stderr,
        )
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
