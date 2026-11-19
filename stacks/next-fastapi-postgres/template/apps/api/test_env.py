"""Extra environment variables for API tests. Add a new required setting here, not in tests/conftest.py:
the test runner config and everything under tests/ are protected (changing them stops the task for a
human). This file sits outside tests/ so the contract or backend task may edit it."""

TEST_ENV_EXTRA: dict[str, str] = {}
