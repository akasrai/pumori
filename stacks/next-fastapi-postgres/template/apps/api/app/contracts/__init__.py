"""API contracts: the single source of truth for request and response shapes.

Add a resource's models in their own module and list them here. Everything in `__all__` that is a
Contract (or ErrorCode) is generated into `packages/shared/src/generated.ts` for the web app:
run `uv run --project apps/api python apps/api/scripts/gen_contracts.py` (or `./verify --quick` tells you).
"""

from .auth import AuthResponse, LoginInput, SignupInput, User
from .base import Contract, Email, Text
from .dev import DevMail, DevMailListResponse
from .errors import ApiError, ErrorBody, ErrorCode, ErrorDetail

__all__ = [
    "ApiError",
    "AuthResponse",
    "Contract",
    "DevMail",
    "DevMailListResponse",
    "Email",
    "ErrorBody",
    "ErrorCode",
    "ErrorDetail",
    "LoginInput",
    "SignupInput",
    "Text",
    "User",
]
