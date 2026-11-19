"""Raise an AppError anywhere in a handler or dependency; the error handler turns it into
`{"error": {"code", "message", "details"?}}` (see app/main.py)."""

from app.contracts import ErrorCode


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: list[dict[str, str]] | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


def bad_request(message: str, details: list[dict[str, str]] | None = None) -> AppError:
    return AppError(400, ErrorCode.VALIDATION_ERROR, message, details)


def unauthenticated(message: str = "Authentication required") -> AppError:
    return AppError(401, ErrorCode.UNAUTHENTICATED, message)


def not_found(what: str = "Resource") -> AppError:
    """For resources that do not exist OR belong to another user (never reveal existence)."""
    return AppError(404, ErrorCode.NOT_FOUND, f"{what} not found")


def conflict(code: str, message: str) -> AppError:
    return AppError(409, code, message)


def too_many_requests(retry_after_seconds: int) -> AppError:
    return AppError(429, ErrorCode.RATE_LIMITED, f"Too many requests. Try again in {retry_after_seconds} seconds.")
