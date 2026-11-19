"""Helpers for API tests: an app on this checkout's test database, users, sessions."""

import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass

from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.datastructures import State

from app.contracts import AuthResponse, User
from app.main import create_app
from app.settings import Settings, load_settings

PASSWORD = "correct horse battery staple"


@contextmanager
def api_client(**overrides: object) -> Iterator[TestClient]:
    """The app wired to the test database, with setting overrides, e.g. `api_client(RATE_LIMIT_AUTH_MAX=2)`."""
    with TestClient(create_app(load_settings(**overrides)), raise_server_exceptions=False) as client:
        yield client


def app_state(client: TestClient) -> State:
    """The app's state (settings, mailer, DB sessions) behind a test client."""
    app = client.app
    assert isinstance(app, FastAPI)
    return app.state


def production_settings(**overrides: object) -> Settings:
    """Settings as production would parse them (secure cookies, no dev-only features)."""
    values: dict[str, object] = {
        "APP_ENV": "production",
        "COOKIE_SECURE": "true",
        "WEB_ORIGIN": "https://app.example.test",
        **overrides,
    }
    return load_settings(**values)


def unique_email(prefix: str = "user") -> str:
    """Unique per call, so tests never collide on the shared test database."""
    return f"{prefix}-{uuid.uuid4()}@example.test"


@dataclass(frozen=True)
class TestUser:
    user: User
    email: str
    password: str
    cookie: str  # pass as headers={"cookie": user.cookie} to act as this user

    __test__ = False  # not a test class


def sign_up(client: TestClient, email: str | None = None) -> TestUser:
    email = email or unique_email()
    res = client.post("/auth/signup", json={"email": email, "password": PASSWORD})
    assert res.status_code == 201, res.text
    sid = res.cookies.get("sid")
    assert sid, "no sid cookie in response"
    client.cookies.clear()  # each test user acts through its own cookie header, never the client's jar
    return TestUser(AuthResponse.model_validate(res.json()).user, email, PASSWORD, f"sid={sid}")
