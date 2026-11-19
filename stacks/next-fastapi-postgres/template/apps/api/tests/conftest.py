"""pytest setup: this checkout's own test database (<DB_NAME>_t_<hash>), created fresh from the migrated
template for each run and dropped when the run ends, plus the test environment."""

import os
import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(API_DIR), str(API_DIR / "scripts")]

import testdb  # noqa: E402
from checkout_env import TEST_SESSION_SECRET, database_url_for, load_env, test_db_name  # noqa: E402
from test_env import TEST_ENV_EXTRA  # noqa: E402

load_env()
os.environ.update(
    {
        "APP_ENV": "test",
        "DATABASE_URL": database_url_for(test_db_name("t")),
        "SESSION_SECRET": TEST_SESSION_SECRET,
        "API_PORT": "0",
        "COOKIE_SECURE": "false",
        "LOG_LEVEL": "warning",
        "WEB_ORIGIN": "http://localhost:3000",
        # Test files sign up many users from one IP; test_rate_limit.py builds its own strict app.
        "RATE_LIMIT_MAX": "100000",
        "RATE_LIMIT_AUTH_MAX": "100000",
        "RATE_LIMIT_LOGIN_EMAIL_MAX": "100000",
        **TEST_ENV_EXTRA,
    }
)


def pytest_sessionstart(session: object) -> None:
    testdb.prepare("t")


def pytest_sessionfinish(session: object, exitstatus: int) -> None:
    testdb.drop("t")
