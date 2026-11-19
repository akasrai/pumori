from enum import StrEnum

from .base import Contract


class ErrorCode(StrEnum):
    """Stable machine-readable error codes. Extend, never rename."""

    BAD_REQUEST = "BAD_REQUEST"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    UNAUTHENTICATED = "UNAUTHENTICATED"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED"
    REQUEST_TIMEOUT = "REQUEST_TIMEOUT"
    PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE"
    UNSUPPORTED_MEDIA_TYPE = "UNSUPPORTED_MEDIA_TYPE"
    RATE_LIMITED = "RATE_LIMITED"
    EMAIL_TAKEN = "EMAIL_TAKEN"
    CONFLICT = "CONFLICT"
    INTERNAL = "INTERNAL"


class ErrorDetail(Contract):
    path: str
    message: str


class ErrorBody(Contract):
    code: str
    message: str
    details: list[ErrorDetail] | None = None


class ApiError(Contract):
    """Every non-2xx API response has this body."""

    error: ErrorBody
