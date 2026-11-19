"""Validated configuration. Server-only: never expose these values to the web app.

Every variable comes from the environment (./init.sh, ./verify and the test runner load `.env`).
`load_settings()` refuses unsafe production configuration, so a bad deploy fails at startup.
"""

import ipaddress
import os
import re
from collections.abc import Mapping
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

DEFAULT_WEB_PORT = 3000
LogLevel = Literal["critical", "error", "warning", "info", "debug"]


def _is_ip_or_cidr(value: str) -> bool:
    try:
        ipaddress.ip_network(value, strict=False)
    except ValueError:
        return False
    return True


class Settings(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")

    APP_ENV: Literal["development", "test", "production"] = "development"
    DATABASE_URL: str
    API_PORT: int = Field(ge=0, le=65535)
    HOST: str = "localhost"
    SESSION_SECRET: str = Field(min_length=16)
    COOKIE_SECURE: bool = False
    # Escape hatch for production images served over plain http (local Docker staging only).
    ALLOW_INSECURE_COOKIES: bool = False
    LOG_LEVEL: LogLevel = "info"
    # false (use the socket address), a hop count (1 = the web /api rewrite or one load balancer), or a
    # comma-separated list of trusted proxy IPs/CIDRs. "true" is refused: any client could spoof its IP.
    TRUST_PROXY: Literal[False] | int | tuple[str, ...] = False
    DB_POOL_MAX: int = Field(default=10, gt=0)
    DB_STATEMENT_TIMEOUT_MS: int = Field(default=10_000, gt=0)
    # Requests per IP per minute, across all routes.
    RATE_LIMIT_MAX: int = Field(default=300, gt=0)
    # Logins and signups per IP per 15 minutes (each).
    RATE_LIMIT_AUTH_MAX: int = Field(default=20, gt=0)
    # Logins per email address per 15 minutes.
    RATE_LIMIT_LOGIN_EMAIL_MAX: int = Field(default=10, gt=0)
    # dev keeps mail in memory for the dev-only outbox; log drops it (production placeholder).
    MAIL_TRANSPORT: Literal["dev", "log"] | None = None
    # Public URL of the web app (no trailing slash), for links the API writes into emails and responses.
    WEB_ORIGIN: str | None = None
    WEB_PORT: int | None = Field(default=None, ge=1, le=65535)

    @field_validator("DATABASE_URL")
    @classmethod
    def _postgres_url(cls, value: str) -> str:
        if not re.match(r"^postgres(ql)?://", value):
            raise ValueError("must be a postgres:// URL")
        return value

    @field_validator("TRUST_PROXY", mode="before")
    @classmethod
    def _trust_proxy(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        text = value.strip()
        if text in ("", "false"):
            return False
        if text.isdigit():
            return int(text)
        entries = tuple(e.strip() for e in text.split(",") if e.strip())
        if entries and all(_is_ip_or_cidr(e) for e in entries):
            return entries
        raise ValueError("must be false, a hop count (e.g. 1) or a comma-separated list of IPs/CIDRs")

    @field_validator("LOG_LEVEL", mode="before")
    @classmethod
    def _log_level(cls, value: object) -> object:
        """Also accepts the Node/pino names (warn, fatal, trace, silent) so one .env serves both apps."""
        aliases = {"warn": "warning", "fatal": "critical", "trace": "debug", "silent": "critical"}
        return aliases.get(value.lower(), value.lower()) if isinstance(value, str) else value

    @field_validator("WEB_ORIGIN")
    @classmethod
    def _origin(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not re.match(r"^https?://[^\s/]+", value):
            raise ValueError("must be an http(s) URL")
        return value.rstrip("/")

    @model_validator(mode="after")
    def _production_rules(self) -> "Settings":
        if self.APP_ENV != "production":
            return self
        if self.SESSION_SECRET == "change-me":  # noqa: S105 - the .env.example placeholder
            raise ValueError("SESSION_SECRET must be changed in production")
        if not self.COOKIE_SECURE and not self.ALLOW_INSECURE_COOKIES:
            raise ValueError(
                "COOKIE_SECURE must be true in production (ALLOW_INSECURE_COOKIES=true only for http staging)"
            )
        if self.WEB_ORIGIN is None:
            raise ValueError("WEB_ORIGIN is required in production: the public https URL of the web app")
        if not self.ALLOW_INSECURE_COOKIES and not self.WEB_ORIGIN.startswith("https://"):
            raise ValueError("WEB_ORIGIN must be https in production")
        if self.MAIL_TRANSPORT == "dev":
            raise ValueError("MAIL_TRANSPORT: the dev mail transport is never available in production")
        return self

    @property
    def mail_transport(self) -> Literal["dev", "log"]:
        if self.MAIL_TRANSPORT:
            return self.MAIL_TRANSPORT
        return "log" if self.APP_ENV == "production" else "dev"

    @property
    def web_origin(self) -> str:
        return self.WEB_ORIGIN or f"http://localhost:{self.WEB_PORT or DEFAULT_WEB_PORT}"


FIELDS = set(Settings.model_fields)


def load_settings(source: Mapping[str, str] | None = None, /, **overrides: object) -> Settings:
    """Parses the environment (or `source`). `overrides` win, e.g. `load_settings(RATE_LIMIT_AUTH_MAX=2)`."""
    raw: dict[str, object] = {k: v for k, v in (os.environ if source is None else source).items() if k in FIELDS}
    raw.update(overrides)
    try:
        return Settings.model_validate(raw)
    except ValidationError as err:
        lines = []
        for issue in err.errors():
            where = ".".join(str(p) for p in issue["loc"]) or "settings"
            lines.append(f"  {where}: {issue['msg'].removeprefix('Value error, ')}")
        raise RuntimeError("Invalid environment:\n" + "\n".join(lines)) from None
