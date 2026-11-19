"""Low-level HTTP guards (pure ASGI middleware, so they run before any route or body parsing)."""

import json

from starlette.types import ASGIApp, Message, Receive, Scope, Send

# Largest accepted request body. JSON APIs rarely need more; uploads should go straight to storage.
BODY_LIMIT_BYTES = 256 * 1024

# JSON API: nothing it returns should ever run, load resources or be framed in a browser.
SECURITY_HEADERS = [
    (b"content-security-policy", b"default-src 'none'; frame-ancestors 'none'"),
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"no-referrer"),
    (b"cross-origin-opener-policy", b"same-origin"),
    (b"cross-origin-resource-policy", b"same-origin"),
]
HSTS = (b"strict-transport-security", b"max-age=63072000; includeSubDomains")


def error_bytes(code: str, message: str) -> bytes:
    return json.dumps({"error": {"code": code, "message": message}}).encode()


async def send_error(send: Send, status: int, code: str, message: str) -> None:
    body = error_bytes(code, message)
    await send(
        {
            "type": "http.response.start",
            "status": status,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
                *SECURITY_HEADERS,
            ],
        }
    )
    await send({"type": "http.response.body", "body": body})


class SecurityHeaders:
    """Adds the security headers to every response. HSTS only in production (sticky in browsers)."""

    def __init__(self, app: ASGIApp, hsts: bool) -> None:
        self.app = app
        self.extra = [*SECURITY_HEADERS, *([HSTS] if hsts else [])]

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                names = {k.lower() for k, _ in message.get("headers", [])}
                message["headers"] = [*message.get("headers", []), *[h for h in self.extra if h[0] not in names]]
            await send(message)

        await self.app(scope, receive, send_with_headers)


class BodyGuard:
    """413 for bodies over BODY_LIMIT_BYTES (declared or streamed); 415 for non-JSON bodies."""

    def __init__(self, app: ASGIApp, limit: int = BODY_LIMIT_BYTES) -> None:
        self.app = app
        self.limit = limit

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"] in ("GET", "HEAD", "OPTIONS", "DELETE"):
            await self.app(scope, receive, send)
            return
        headers = dict(scope["headers"])
        length = headers.get(b"content-length")
        if length is not None and length.isdigit() and int(length) > self.limit:
            await send_error(send, 413, "PAYLOAD_TOO_LARGE", "Request body is too large")
            return
        content_type = headers.get(b"content-type", b"").split(b";")[0].strip().lower()
        has_body = (length is not None and length != b"0") or b"transfer-encoding" in headers
        if has_body and content_type != b"application/json":
            await send_error(send, 415, "UNSUPPORTED_MEDIA_TYPE", "Unsupported content type")
            return
        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.limit:
                    raise BodyTooLarge
            return message

        try:
            await self.app(scope, limited_receive, send)
        except BodyTooLarge:
            await send_error(send, 413, "PAYLOAD_TOO_LARGE", "Request body is too large")


class BodyTooLarge(Exception):
    pass
