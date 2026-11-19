"""`create_app()` builds the FastAPI app without serving it. Tests use it with TestClient; server.py serves it.

Order of a request: security headers → body guard (413/415) → global per-IP rate limit → request log →
route (dependencies: session, DB transaction) → error handlers turn every failure into
`{"error": {"code", "message", "details"?}}`.
"""

import logging
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.orm import sessionmaker
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.contracts import ErrorCode
from app.db import create_db_engine
from app.lib.errors import AppError
from app.lib.http import BodyGuard, SecurityHeaders
from app.lib.logging_setup import redact_url, setup_logging
from app.lib.mailer import Mailer
from app.lib.rate_limit import GLOBAL_WINDOW_S, SlidingWindowLimiter, client_ip
from app.lib.report_error import report_error
from app.lib.session import purge_expired_sessions
from app.routes import auth, dev_mail, health
from app.settings import Settings, load_settings

log = logging.getLogger("app")

# Framework (non-AppError) errors: status → stable error code and a message that echoes nothing.
FRAMEWORK_ERRORS = {
    401: (ErrorCode.UNAUTHENTICATED, "Authentication required"),
    403: (ErrorCode.FORBIDDEN, "Forbidden"),
    404: (ErrorCode.NOT_FOUND, "Route not found"),
    405: (ErrorCode.METHOD_NOT_ALLOWED, "Method not allowed"),
    408: (ErrorCode.REQUEST_TIMEOUT, "Request timed out"),
    413: (ErrorCode.PAYLOAD_TOO_LARGE, "Request body is too large"),
    415: (ErrorCode.UNSUPPORTED_MEDIA_TYPE, "Unsupported content type"),
    429: (ErrorCode.RATE_LIMITED, "Too many requests"),
}
UNLIMITED_PATHS = ("/livez", "/readyz", "/health")


def error_response(
    status: int,
    code: str,
    message: str,
    details: list[dict[str, str]] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    error: dict[str, Any] = {"code": code, "message": message}
    if details:
        error["details"] = details
    return JSONResponse({"error": error}, status_code=status, headers=headers)


def _validation_details(err: RequestValidationError) -> list[dict[str, str]]:
    details = []
    for issue in err.errors():
        loc = [str(p) for p in issue.get("loc", ()) if p not in ("body", "query", "path", "header")]
        details.append({"path": ".".join(loc), "message": str(issue.get("msg", "Invalid value"))})
    return details


def register_error_handlers(app: FastAPI) -> None:
    """Every failure becomes `{"error": {"code", "message", "details"?}}` with the right status."""

    @app.exception_handler(AppError)
    async def on_app_error(request: Request, err: AppError) -> JSONResponse:
        if err.status_code >= 500:
            report_error(err, {"method": request.method, "url": redact_url(request.url.path)})
        headers = None
        if err.status_code == 429:
            seconds = "".join(c for c in err.message if c.isdigit()) or "60"
            headers = {"retry-after": seconds}
        return error_response(err.status_code, err.code, err.message, err.details, headers)

    @app.exception_handler(RequestValidationError)
    async def on_validation_error(_request: Request, err: RequestValidationError) -> JSONResponse:
        if any(issue.get("type") == "json_invalid" for issue in err.errors()):
            return error_response(400, ErrorCode.BAD_REQUEST, "Malformed JSON body")
        details = _validation_details(err)
        first = details[0] if details else {"path": "", "message": "Invalid input"}
        message = f"{first['path']}: {first['message']}" if first["path"] else first["message"]
        return error_response(400, ErrorCode.VALIDATION_ERROR, message, details)

    @app.exception_handler(StarletteHTTPException)
    async def on_http_error(_request: Request, err: StarletteHTTPException) -> JSONResponse:
        code, message = FRAMEWORK_ERRORS.get(err.status_code, (ErrorCode.BAD_REQUEST, "Bad request"))
        return error_response(err.status_code, code, message)

    @app.exception_handler(Exception)
    async def on_unhandled(request: Request, err: Exception) -> JSONResponse:
        where = {"method": request.method, "url": redact_url(request.url.path)}
        log.error("unhandled error", exc_info=err, extra=where)
        report_error(err, {"method": request.method, "url": redact_url(request.url.path)})
        return error_response(500, ErrorCode.INTERNAL, "Internal server error")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    setup_logging(settings.LOG_LEVEL)
    engine = create_db_engine(
        settings.DATABASE_URL, pool_max=settings.DB_POOL_MAX, statement_timeout_ms=settings.DB_STATEMENT_TIMEOUT_MS
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        try:
            with app.state.sessions() as db, db.begin():
                log.info("expired sessions purged", extra={"removed": purge_expired_sessions(db)})
        except Exception as err:
            log.warning("session purge failed", extra={"error": type(err).__name__})
        yield
        engine.dispose()

    production = settings.APP_ENV == "production"
    app = FastAPI(
        title="API",
        lifespan=lifespan,
        docs_url=None if production else "/docs",
        redoc_url=None,
        openapi_url=None if production else "/openapi.json",
    )
    app.state.settings = settings
    app.state.engine = engine
    app.state.sessions = sessionmaker(engine, expire_on_commit=False)
    app.state.mailer = Mailer(settings.mail_transport)
    app.state.global_limiter = SlidingWindowLimiter("global", settings.RATE_LIMIT_MAX, GLOBAL_WINDOW_S)
    app.state.auth_limiters = {}

    @app.middleware("http")
    async def rate_limit_and_log(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        started = time.perf_counter()
        if request.url.path not in UNLIMITED_PATHS:
            try:
                app.state.global_limiter.hit(client_ip(request))
            except AppError as err:
                return error_response(429, err.code, err.message, headers={"retry-after": "60"})
        response = await call_next(request)
        log.info(
            "request",
            extra={
                "method": request.method,
                "url": redact_url(str(request.url.path)),
                "status": response.status_code,
                "ms": round((time.perf_counter() - started) * 1000, 1),
            },
        )
        return response

    app.add_middleware(BodyGuard)
    app.add_middleware(SecurityHeaders, hsts=production)

    register_error_handlers(app)

    app.include_router(health.router)
    app.include_router(auth.router)
    if settings.mail_transport == "dev" and not production:
        app.include_router(dev_mail.router)  # dev-only: never registered in production
    return app
