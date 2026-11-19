"""Creates a migration from the changes in app/models.py:

    uv run --project apps/api python apps/api/scripts/new_migration.py "add notes"

It compares the models with a fresh database migrated to the latest committed migration (never with your
dev database, whose state may differ), writes apps/api/migrations/versions/<rev>_<slug>.py, and drops the
scratch database. Read the new file before committing it: autogenerate writes a rename as drop + add, and
misses some changes (server defaults, CHECK constraints on existing tables).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from alembic import command
from alembic.config import Config

from testdb import API_DIR, drop, prepare


def main(argv: list[str]) -> int:
    if len(argv) != 1 or not argv[0].strip():
        print('usage: new_migration.py "<what changed>"', file=sys.stderr)
        return 2
    url = prepare("m")
    try:
        config = Config(str(API_DIR / "alembic.ini"))
        config.attributes["database_url"] = url
        script = command.revision(config, message=argv[0].strip(), autogenerate=True)
    finally:
        drop("m")
    scripts = script if isinstance(script, list) else [script]
    for s in scripts:
        if s is not None:
            print(f"wrote {Path(s.path).relative_to(API_DIR.parents[1])}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
