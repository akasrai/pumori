"""Password hashing with scrypt from the standard library (no native dependencies).

Stored format: scrypt$N$r$p$saltB64$hashB64 (the same as the TypeScript stack). N=2^17, r=8 needs
128 MiB per hash (OWASP's scrypt baseline); the auth rate limits cap how often anyone can trigger one.
"""

import base64
import hashlib
import hmac
import secrets
from dataclasses import dataclass
from functools import cache


@dataclass(frozen=True)
class ScryptParams:
    n: int
    r: int
    p: int


PASSWORD_PARAMS = ScryptParams(n=2**17, r=8, p=1)
KEY_LENGTH = 64
SALT_LENGTH = 16
MAX_N = 2**20  # refuse absurd stored parameters instead of allocating unbounded memory


def _scrypt(password: str, salt: bytes, length: int, params: ScryptParams) -> bytes:
    return hashlib.scrypt(
        password.encode(),
        salt=salt,
        n=params.n,
        r=params.r,
        p=params.p,
        maxmem=2 * 128 * params.n * params.r + 1024 * 1024,
        dklen=length,
    )


def _parse(stored: str) -> tuple[ScryptParams, bytes, bytes] | None:
    parts = stored.split("$")
    if len(parts) != 6 or parts[0] != "scrypt":
        return None
    try:
        params = ScryptParams(int(parts[1]), int(parts[2]), int(parts[3]))
        salt, digest = base64.b64decode(parts[4]), base64.b64decode(parts[5])
    except ValueError:
        return None
    if min(params.n, params.r, params.p) <= 0 or params.n > MAX_N:
        return None
    return params, salt, digest


def hash_password(password: str, params: ScryptParams = PASSWORD_PARAMS) -> str:
    salt = secrets.token_bytes(SALT_LENGTH)
    key = _scrypt(password, salt, KEY_LENGTH, params)
    return "$".join(
        [
            "scrypt",
            str(params.n),
            str(params.r),
            str(params.p),
            base64.b64encode(salt).decode(),
            base64.b64encode(key).decode(),
        ]
    )


def verify_password(password: str, stored: str) -> bool:
    parsed = _parse(stored)
    if parsed is None:
        return False
    params, salt, digest = parsed
    return hmac.compare_digest(_scrypt(password, salt, len(digest), params), digest)


def needs_rehash(stored: str, params: ScryptParams = PASSWORD_PARAMS) -> bool:
    """True when a stored hash uses older parameters than PASSWORD_PARAMS: rehash it at the next login."""
    parsed = _parse(stored)
    return parsed is None or parsed[0] != params or len(parsed[2]) != KEY_LENGTH


@cache
def _dummy_hash() -> str:
    return hash_password("dummy-password-for-timing")


def verify_against_dummy(password: str) -> bool:
    """Burns the same CPU as a real check so unknown emails are not detectable by timing."""
    verify_password(password, _dummy_hash())
    return False
