from datetime import datetime

from .base import Contract


class DevMail(Contract):
    """A message from the dev-only mail outbox (GET /dev/mail). Never available in production."""

    to: str
    subject: str
    text: str
    sent_at: datetime


class DevMailListResponse(Contract):
    mail: list[DevMail]
