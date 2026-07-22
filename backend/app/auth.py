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

The session itself is a signed cookie handled by Starlette's ``SessionMiddleware``
(wired up in ``app.main``); here we only read/write the ``admin`` flag on it.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import sys

from fastapi import HTTPException, Request, status

from app.config import get_admin_password_hash

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


def require_admin(request: Request) -> None:
    """FastAPI dependency: allow the request only if the session is logged in.

    Guards every admin endpoint except login/logout/session. Refuses with 401 when
    there is no valid admin session (F5 / FR-005).
    """
    if not request.session.get("admin"):
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
