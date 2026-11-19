import os
import sys
from pathlib import Path

from alembic import context
from sqlalchemy import create_engine, pool

from app.db import sqlalchemy_url
from app.models import Base

target_metadata = Base.metadata


def run() -> None:
    url = context.config.attributes.get("database_url") or os.environ.get("DATABASE_URL")
    if not url:  # e.g. `alembic upgrade head` in a worktree: use the checkout's .env
        sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
        from checkout_env import require_env  # noqa: PLC0415

        url = require_env("DATABASE_URL")
    engine = create_engine(sqlalchemy_url(url), poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


run()
