"""In-memory rate limits (per API process).

- A global per-IP limit on every route (`RATE_LIMIT_MAX` per minute), applied by middleware in app/main.py.
- Stricter limits for login and signup: `Depends(auth_ip_limit)` on the route, plus a keyed limiter for the
  login email (`login_email_limiter.hit(...)` inside the handler).

With several API instances the limits are per instance: move the store to Postgres or Redis then.
Client IPs come from `client_ip(request)`, which honours TRUST_PROXY.
"""

import ipaddress
import math
import threading
import time
from collections import deque
from collections.abc import Callable

from fastapi import Request

from .errors import too_many_requests

MINUTE_S = 60
GLOBAL_WINDOW_S = MINUTE_S
AUTH_WINDOW_S = 15 * MINUTE_S


class SlidingWindowLimiter:
    """At most `max_hits` per `window_s` per key. Thread-safe (sync handlers run in a thread pool)."""

    def __init__(self, name: str, max_hits: int, window_s: float, clock: Callable[[], float] = time.monotonic) -> None:
        self.name = name
        self.max_hits = max_hits
        self.window_s = window_s
        self._clock = clock
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def hit(self, key: str) -> None:
        """Counts one hit; raises 429 (with the seconds to wait) once the key is over its limit."""
        now = self._clock()
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] >= self.window_s:
                hits.popleft()
            if len(hits) >= self.max_hits:
                raise too_many_requests(max(1, math.ceil(self.window_s - (now - hits[0]))))
            hits.append(now)
            if len(self._hits) > 50_000:  # forget idle keys so memory stays bounded
                self._hits = {k: v for k, v in self._hits.items() if v and now - v[-1] < self.window_s}


def client_ip(request: Request) -> str:
    """The client's IP. Uses X-Forwarded-For only as far as TRUST_PROXY allows."""
    peer = request.client.host if request.client else "unknown"
    trust = request.app.state.settings.TRUST_PROXY
    if trust is False:
        return peer
    chain = [p.strip() for p in request.headers.get("x-forwarded-for", "").split(",") if p.strip()] + [peer]
    if isinstance(trust, int):
        # trust the last `trust` hops: the client is the address just before them
        return chain[max(0, len(chain) - 1 - trust)]
    networks = [ipaddress.ip_network(n, strict=False) for n in trust]
    for address in reversed(chain):
        try:
            if not any(ipaddress.ip_address(address) in net for net in networks):
                return address
        except ValueError:
            return address
    return chain[0]


def auth_ip_limit(request: Request) -> None:
    """Dependency for login and signup: a stricter per-IP limit, per route."""
    limiters: dict[str, SlidingWindowLimiter] = request.app.state.auth_limiters
    route = request.url.path
    limiter = limiters.get(route)
    if limiter is None:
        limiter = limiters.setdefault(
            route, SlidingWindowLimiter(f"auth:{route}", request.app.state.settings.RATE_LIMIT_AUTH_MAX, AUTH_WINDOW_S)
        )
    limiter.hit(client_ip(request))
