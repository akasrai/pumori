import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select, update

from app.lib.session import SESSION_IDLE_TIMEOUT, purge_expired_sessions
from app.models import SessionRow
from helpers import api_client, app_state, sign_up


def _session_of(client: TestClient, user_id: uuid.UUID) -> SessionRow:
    with app_state(client).sessions() as db:
        return db.execute(select(SessionRow).where(SessionRow.user_id == user_id)).scalar_one()


def _set(client: TestClient, session_id: str, **values: object) -> None:
    with app_state(client).sessions() as db, db.begin():
        db.execute(update(SessionRow).where(SessionRow.id == session_id).values(**values))


def test_an_expired_session_is_401() -> None:
    with api_client() as client:
        user = sign_up(client)
        _set(client, _session_of(client, user.user.id).id, expires_at=datetime.now(UTC) - timedelta(seconds=1))
        assert client.get("/auth/me", headers={"cookie": user.cookie}).status_code == 401


def test_an_idle_session_is_401() -> None:
    with api_client() as client:
        user = sign_up(client)
        idle = datetime.now(UTC) - SESSION_IDLE_TIMEOUT - timedelta(minutes=1)
        _set(client, _session_of(client, user.user.id).id, last_seen_at=idle)
        assert client.get("/auth/me", headers={"cookie": user.cookie}).status_code == 401


def test_use_slides_the_idle_timeout() -> None:
    with api_client() as client:
        user = sign_up(client)
        old = datetime.now(UTC) - timedelta(hours=1)
        _set(client, _session_of(client, user.user.id).id, last_seen_at=old)
        assert client.get("/auth/me", headers={"cookie": user.cookie}).status_code == 200
        assert _session_of(client, user.user.id).last_seen_at > old + timedelta(minutes=30)


def test_the_cookie_holds_no_session_id_from_the_database() -> None:
    with api_client() as client:
        user = sign_up(client)
        assert _session_of(client, user.user.id).id not in user.cookie


def test_purge_removes_expired_sessions_only() -> None:
    with api_client() as client:
        live, dead = sign_up(client), sign_up(client)
        _set(client, _session_of(client, dead.user.id).id, expires_at=datetime.now(UTC) - timedelta(days=1))
        with app_state(client).sessions() as db, db.begin():
            assert purge_expired_sessions(db) >= 1
        assert client.get("/auth/me", headers={"cookie": live.cookie}).status_code == 200
