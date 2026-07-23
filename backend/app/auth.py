"""Admin authentication (F6/F7).

One shared password unlocks the admin area. We never store the plain password: the
environment holds a hash of it, and we verify the submitted password against that hash
using the Python standard library (no extra dependency).

Hash format stored in ``ADMIN_PASSWORD_HASH``::

    <salt-hex>:<iterations>:<derived-key-hex>

We use ``:`` (not ``$``) as the separator so the value is safe to paste into a
shell, a ``.env`` file, or docker-compose without ``$`` being read as a variable.

Generate one for your password with::

    python -m app.auth hash "your-password"

Admin requests authenticate with a **Bearer token** sent in the ``Authorization``
header (not a cookie). The token is derived from ``SESSION_SECRET`` so we can verify
it without storing anything server-side; see ``make_admin_token``. (The session
cookie is still used by the fantasy area — that's unrelated to admin auth.)
"""

from __future__ import annotations

import hashlib
import hmac
import os
import sys

from fastapi import HTTPException, Request, status

from app.config import get_admin_password_hash, get_session_secret

# PBKDF2 work factor. High enough to be slow to brute-force, fine for one login.
_ITERATIONS = 200_000
_ALGO = "sha256"


def hash_password(password: str, *, salt: bytes | None = None) -> str:
    """Return a ``salt:iterations:hexhash`` string for the given password."""
    if salt is None:
        salt = os.urandom(16)
    derived = hashlib.pbkdf2_hmac(_ALGO, password.encode(), salt, _ITERATIONS)
    return f"{salt.hex()}:{_ITERATIONS}:{derived.hex()}"


def verify_password(password: str, stored: str) -> bool:
    """Check ``password`` against a stored ``salt:iterations:hexhash``.

    Returns ``False`` for an empty or malformed stored value (login disabled) and
    uses a constant-time compare so a wrong password can't be timed byte-by-byte.
    """
    try:
        salt_hex, iterations_str, expected_hex = stored.split(":")
        salt = bytes.fromhex(salt_hex)
        iterations = int(iterations_str)
    except (ValueError, AttributeError):
        return False

    derived = hashlib.pbkdf2_hmac(_ALGO, password.encode(), salt, iterations)
    return hmac.compare_digest(derived.hex(), expected_hex)


def check_password(password: str) -> bool:
    """Verify a submitted password against the configured admin hash."""
    return verify_password(password, get_admin_password_hash())


def make_admin_token() -> str:
    """Return the opaque admin token handed out on a successful login.

    It's a deterministic HMAC of a fixed message keyed by ``SESSION_SECRET``, so any
    device that logs in with the right password gets the same valid token and we can
    verify it later without storing anything. Rotating ``SESSION_SECRET`` invalidates
    every issued token (a "log everyone out" lever). Whoever knows ``SESSION_SECRET``
    could forge a token — that was already true of the old signed cookie, so this adds
    no new exposure.
    """
    return hmac.new(get_session_secret().encode(), b"admin", hashlib.sha256).hexdigest()


def verify_admin_token(token: str | None) -> bool:
    """Return ``True`` only for a token matching the current secret (constant-time)."""
    if not token:
        return False
    return hmac.compare_digest(token, make_admin_token())


def _read_bearer(request: Request) -> str | None:
    """Pull the token out of an ``Authorization: Bearer <token>`` header, if present."""
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer":
        return None
    token = token.strip()
    return token or None


def require_admin(request: Request) -> None:
    """FastAPI dependency: allow the request only with a valid admin Bearer token.

    Guards every admin endpoint except login/session. Refuses with 401 when the
    ``Authorization`` header is missing or its token doesn't match (F5 / FR-005).
    """
    if not verify_admin_token(_read_bearer(request)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )


def _cli() -> None:
    """`python -m app.auth hash <password>` prints a hash for the env var."""
    if len(sys.argv) == 3 and sys.argv[1] == "hash":
        print(hash_password(sys.argv[2]))
    else:
        print('Usage: python -m app.auth hash "<password>"', file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    _cli()
