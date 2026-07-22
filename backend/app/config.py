"""Backend configuration read from environment variables.

The admin area (F6) needs two secrets, provided by whoever runs the app:

- ``ADMIN_PASSWORD_HASH`` — the hash of the single shared password (never the plain
  password, never stored in the database). Generate one with::

      python -m app.auth hash "your-password"

- ``SESSION_SECRET`` — a long random string used to sign the admin session cookie.

Both are read lazily (per call) so tests can set them with ``monkeypatch`` and so an
empty password hash simply means "nobody can log in yet" rather than a crash.
"""

import os

# A dev fallback so the app still boots locally without config. It is NOT secret;
# real deployments MUST set SESSION_SECRET to their own value (see docker-compose).
_DEV_SESSION_SECRET = "dev-insecure-session-secret-change-me"


def get_session_secret() -> str:
    """Secret used to sign the session cookie. Falls back to a dev value."""
    return os.getenv("SESSION_SECRET") or _DEV_SESSION_SECRET


def get_admin_password_hash() -> str:
    """The stored ``salt$iterations$hexhash``. Empty string → login disabled."""
    return os.getenv("ADMIN_PASSWORD_HASH", "")
