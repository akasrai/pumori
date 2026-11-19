"""Dev-only outbox: the signed-in user's own messages. Registered only outside production (app/main.py)."""

from fastapi import APIRouter, Request

from app.contracts import DevMail, DevMailListResponse
from app.lib.session import CurrentUser

router = APIRouter(prefix="/dev", tags=["dev"])


@router.get("/mail")
def list_mail(request: Request, user: CurrentUser) -> DevMailListResponse:
    mail = request.app.state.mailer.outbox_for(user.email)
    return DevMailListResponse(mail=[DevMail(to=m.to, subject=m.subject, text=m.text, sent_at=m.sent_at) for m in mail])
