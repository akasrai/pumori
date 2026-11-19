"""Cookie sessions.

Protected routes take `user: CurrentUser`: it answers 401 when nobody is signed in, and gives the
signed-in user otherwise. Every query on a user-owned table filters by `user.id`.
"""

import base64
import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, Request, Response
from sqlalchemy import delete, or_, select, update
from sqlalchemy.orm import Session

from app.contracts import User
from app.db import DbSession
from app.models import SessionRow, UserRow
from app.settings import Settings

from .errors import unauthenticated

SESSION_COOKIE = "sid"
# Absolute lifetime: a session ends 30 days after login even if it is used every day.
SESSION_TTL = timedelta(days=30)
# Idle timeout: a session unused for 7 days ends.
SESSION_IDLE_TIMEOUT = timedelta(days=7)
# last_seen_at is written at most this often per session (not on every request).
SESSION_TOUCH_INTERVAL = timedelta(minutes=5)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _sign(value: str, secret: str) -> str:
    mac = hmac.new(secret.encode(), value.encode(), hashlib.sha256).digest()
    return value + "." + base64.urlsafe_b64encode(mac).decode().rstrip("=")


def _unsign(signed: str, secret: str) -> str | None:
    value, _, _sig = signed.rpartition(".")
    if not value:
        return None
    return value if hmac.compare_digest(_sign(value, secret), signed) else None


def to_user_dto(row: UserRow) -> User:
    return User(id=row.id, email=row.email, created_at=row.created_at)


def start_session(db: Session, response: Response, settings: Settings, user_id: object) -> None:
    """Creates a session row and sets the signed, httpOnly, SameSite=Lax cookie."""
    token = secrets.token_urlsafe(32)
    now = datetime.now(UTC)
    expires_at = now + SESSION_TTL
    db.add(SessionRow(id=_hash_token(token), user_id=user_id, expires_at=expires_at, last_seen_at=now))
    db.flush()
    response.set_cookie(
        SESSION_COOKIE,
        _sign(token, settings.SESSION_SECRET),
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        path="/",
        expires=expires_at,
    )


def _session_token(request: Request) -> str | None:
    raw = request.cookies.get(SESSION_COOKIE)
    return _unsign(raw, request.app.state.settings.SESSION_SECRET) if raw else None


def end_session(db: Session, request: Request, response: Response) -> None:
    token = _session_token(request)
    if token:
        db.execute(delete(SessionRow).where(SessionRow.id == _hash_token(token)))
    response.delete_cookie(SESSION_COOKIE, path="/")


def purge_expired_sessions(db: Session, now: datetime | None = None) -> int:
    """Deletes sessions past their absolute expiry or idle timeout. Returns how many were removed."""
    now = now or datetime.now(UTC)
    result = db.execute(
        delete(SessionRow)
        .where(or_(SessionRow.expires_at < now, SessionRow.last_seen_at < now - SESSION_IDLE_TIMEOUT))
        .returning(SessionRow.id)
    )
    return len(result.all())


def require_user(request: Request, db: DbSession) -> User:
    token = _session_token(request)
    if not token:
        raise unauthenticated()
    session_id = _hash_token(token)
    now = datetime.now(UTC)
    found = db.execute(
        select(UserRow, SessionRow.last_seen_at)
        .join(SessionRow, SessionRow.user_id == UserRow.id)
        .where(
            SessionRow.id == session_id,
            SessionRow.expires_at > now,
            SessionRow.last_seen_at > now - SESSION_IDLE_TIMEOUT,
        )
    ).first()
    if found is None:
        raise unauthenticated()
    row, last_seen_at = found
    # Sliding idle timeout, throttled so an active user costs one write per interval.
    if now - last_seen_at > SESSION_TOUCH_INTERVAL:
        db.execute(update(SessionRow).where(SessionRow.id == session_id).values(last_seen_at=now))
    return to_user_dto(row)


CurrentUser = Annotated[User, Depends(require_user)]
