"""JSON logs on stdout, one line per event. Secrets never reach the log: cookies, authorization headers,
passwords and tokens are redacted, and URLs lose their query strings."""

import json
import logging
import re
import sys
from datetime import UTC, datetime

SECRET_KEY_RE = re.compile(r"pass(word)?|secret|token|cookie|authorization|session|api[-_]?key", re.I)
STANDARD = set(logging.makeLogRecord({}).__dict__) | {"message", "asctime"}


def redact_url(url: str) -> str:
    """Drops the query string: it can carry tokens and it reflects attacker input."""
    return url.split("?", 1)[0]


def redact(value: object, key: str = "") -> object:
    if key and SECRET_KEY_RE.search(key):
        return "[redacted]"
    if isinstance(value, dict):
        return {k: redact(v, str(k)) for k, v in value.items()}
    if isinstance(value, list | tuple):
        return [redact(v) for v in value]
    return value


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        out: dict[str, object] = {
            "time": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname.lower(),
            "logger": record.name,
            "msg": record.getMessage(),
        }
        for key, value in record.__dict__.items():
            if key not in STANDARD and not key.startswith("_"):
                out[key] = redact(value, key)
        if record.exc_info:
            out["err"] = self.formatException(record.exc_info)
        return json.dumps(out, default=str)


def setup_logging(level: str) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(level.upper())
    for noisy in ("uvicorn.access",):  # the app logs its own request lines (redacted)
        logging.getLogger(noisy).disabled = True
