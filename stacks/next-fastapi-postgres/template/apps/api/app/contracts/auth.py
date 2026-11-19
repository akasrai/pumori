from datetime import datetime
from typing import Annotated
from uuid import UUID

from .base import Contract, Email, Text


class SignupInput(Contract):
    email: Email
    password: Annotated[
        str,
        Text(
            8,
            128,
            too_short="Password must be at least 8 characters",
            too_long="Password must be at most 128 characters",
        ),
    ]


class LoginInput(Contract):
    email: Email
    password: Annotated[str, Text(1, 128, too_short="Password is required")]


class User(Contract):
    """Public user representation. Never add secrets (password hash, tokens) here."""

    id: UUID
    email: str
    created_at: datetime


class AuthResponse(Contract):
    """Response body of POST /auth/signup, POST /auth/login and GET /auth/me."""

    user: User
