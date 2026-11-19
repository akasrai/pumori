"""Outgoing email. `dev` keeps messages in memory for the dev-only outbox (GET /dev/mail); `log` only logs
that a message was sent (the production placeholder: replace it with a real provider before launch)."""

import logging
import threading
from collections import deque
from dataclasses import dataclass
from datetime import UTC, datetime

log = logging.getLogger("app.mail")
OUTBOX_MAX = 500


@dataclass(frozen=True)
class Mail:
    to: str
    subject: str
    text: str
    sent_at: datetime


class Mailer:
    def __init__(self, transport: str) -> None:
        self.transport = transport
        self._outbox: deque[Mail] = deque(maxlen=OUTBOX_MAX)
        self._lock = threading.Lock()

    def send(self, to: str, subject: str, text: str) -> None:
        if self.transport == "dev":
            with self._lock:
                self._outbox.append(Mail(to=to, subject=subject, text=text, sent_at=datetime.now(UTC)))
        # Never log the body: it can carry tokens (invites, resets).
        log.info("mail sent", extra={"to_domain": to.rpartition("@")[2], "subject": subject})

    def outbox_for(self, email: str) -> list[Mail]:
        """Dev outbox: only messages to this recipient, newest first."""
        with self._lock:
            return [m for m in reversed(self._outbox) if m.to == email]
