"""Database engine and per-request sessions.

Handlers get a session with `db: DbSession` (a FastAPI dependency): one transaction per request,
committed when the handler returns and rolled back if it raises.
"""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker


def sqlalchemy_url(database_url: str) -> str:
    """postgres://… → postgresql+psycopg://… (psycopg 3 driver)."""
    for prefix in ("postgresql://", "postgres://"):
        if database_url.startswith(prefix):
            return "postgresql+psycopg://" + database_url[len(prefix) :]
    return database_url


def create_db_engine(database_url: str, *, pool_max: int = 10, statement_timeout_ms: int = 10_000) -> Engine:
    return create_engine(
        sqlalchemy_url(database_url),
        pool_size=pool_max,
        max_overflow=0,
        pool_timeout=10,
        pool_pre_ping=True,
        # Server-side cap for one SQL statement; connect_timeout bounds a dead database.
        connect_args={"options": f"-c statement_timeout={statement_timeout_ms}", "connect_timeout": 10},
    )


def get_db(request: Request) -> Iterator[Session]:
    factory: sessionmaker[Session] = request.app.state.sessions
    with factory() as session, session.begin():
        yield session


# scope="function": the transaction commits before the response is sent, so a failed commit is a 500,
# never a success the database didn't keep.
DbSession = Annotated[Session, Depends(get_db, scope="function")]
