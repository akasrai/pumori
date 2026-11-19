"""The committed migrations match the models (a model change without its migration fails here)."""

import os

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import create_engine

from app.db import sqlalchemy_url
from app.models import Base


def test_models_and_migrations_agree() -> None:
    engine = create_engine(sqlalchemy_url(os.environ["DATABASE_URL"]))
    with engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn, opts={"compare_type": True}), Base.metadata)
    engine.dispose()
    assert diff == [], f"models changed without a migration: {diff}"
