import threading
import time

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert

from app.contracts import AuthResponse, ErrorCode, LoginInput, SignupInput
from app.db import DbSession
from app.lib.errors import AppError, conflict
from app.lib.password import hash_password, needs_rehash, verify_against_dummy, verify_password
from app.lib.rate_limit import AUTH_WINDOW_S, SlidingWindowLimiter, auth_ip_limit
from app.lib.session import CurrentUser, end_session, purge_expired_sessions, start_session, to_user_dto
from app.models import UserRow

router = APIRouter(prefix="/auth", tags=["auth"])

# Expired sessions are purged on startup and, at most this often, after a successful login.
PURGE_INTERVAL_S = 60 * 60
_last_purge = time.monotonic()
_purge_lock = threading.Lock()


def _login_email_limiter(request: Request) -> SlidingWindowLimiter:
    state = request.app.state
    if not hasattr(state, "login_email_limiter"):
        state.login_email_limiter = SlidingWindowLimiter(
            "login-email", state.settings.RATE_LIMIT_LOGIN_EMAIL_MAX, AUTH_WINDOW_S
        )
    return state.login_email_limiter


@router.post("/signup", status_code=201, dependencies=[Depends(auth_ip_limit)])
def signup(body: SignupInput, request: Request, response: Response, db: DbSession) -> AuthResponse:
    row = db.execute(
        insert(UserRow)
        .values(email=body.email, password_hash=hash_password(body.password))
        .on_conflict_do_nothing(index_elements=[UserRow.email])
        .returning(UserRow)
    ).scalar_one_or_none()
    if row is None:
        raise conflict(ErrorCode.EMAIL_TAKEN, "An account with this email already exists")
    start_session(db, response, request.app.state.settings, row.id)
    return AuthResponse(user=to_user_dto(row))


@router.post("/login", dependencies=[Depends(auth_ip_limit)])
def login(body: LoginInput, request: Request, response: Response, db: DbSession) -> AuthResponse:
    global _last_purge  # noqa: PLW0603
    # Per-email limit (on top of the per-IP one): slows password guessing spread over many IPs.
    _login_email_limiter(request).hit(body.email)
    row = db.execute(select(UserRow).where(UserRow.email == body.email)).scalar_one_or_none()
    ok = verify_password(body.password, row.password_hash) if row else verify_against_dummy(body.password)
    if row is None or not ok:
        raise AppError(401, ErrorCode.INVALID_CREDENTIALS, "Invalid email or password")
    # Upgrade hashes made with older scrypt parameters while the plain password is at hand.
    if needs_rehash(row.password_hash):
        db.execute(update(UserRow).where(UserRow.id == row.id).values(password_hash=hash_password(body.password)))
    start_session(db, response, request.app.state.settings, row.id)
    with _purge_lock:
        due = time.monotonic() - _last_purge > PURGE_INTERVAL_S
        if due:
            _last_purge = time.monotonic()
    if due:
        purge_expired_sessions(db)
    return AuthResponse(user=to_user_dto(row))


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: DbSession) -> Response:
    end_session(db, request, response)
    response.status_code = 204
    return response


@router.get("/me")
def me(user: CurrentUser) -> AuthResponse:
    return AuthResponse(user=user)
