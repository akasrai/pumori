"""Where unexpected server errors go besides the log. A no-op until the product picks an error tracker
(Sentry or similar): call its SDK here, never from handlers."""

from typing import Any


def report_error(err: BaseException, context: dict[str, Any]) -> None:
    return None
