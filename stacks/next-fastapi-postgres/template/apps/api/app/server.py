"""Serves the API: `uv run --project apps/api python -m app.server` (from apps/api)."""

import uvicorn

from app.main import create_app
from app.settings import load_settings


def main() -> None:
    settings = load_settings()
    uvicorn.run(
        create_app(settings),
        host=settings.HOST,
        port=settings.API_PORT,
        log_config=None,
        proxy_headers=False,
        server_header=False,
        date_header=False,
        timeout_graceful_shutdown=10,
    )


if __name__ == "__main__":
    main()
