from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

router = APIRouter(tags=["health"])


@router.get("/livez")
def livez() -> dict[str, str]:
    """The process is up (no dependencies checked)."""
    return {"status": "ok"}


@router.get("/readyz")
def readyz(request: Request) -> JSONResponse:
    """Ready for traffic: the database answers."""
    try:
        with request.app.state.engine.connect() as conn:
            conn.execute(text("select 1"))
    except Exception:
        return JSONResponse({"status": "unavailable"}, status_code=503)
    return JSONResponse({"status": "ok"})


@router.get("/health")
def health(request: Request) -> JSONResponse:
    return readyz(request)
