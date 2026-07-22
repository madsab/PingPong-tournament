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


# A dev fallback so local `npm run dev` (Vite on :5173) can call the API without
# any config. Production MUST set FRONTEND_ORIGIN to the deployed frontend URL(s).
_DEV_FRONTEND_ORIGIN = "http://localhost:5173"


def get_frontend_origins() -> list[str]:
    """Origins allowed to call the API (CORS).

    Reads ``FRONTEND_ORIGIN`` — a comma-separated list so more than one origin
    (e.g. a Vercel production URL plus a preview URL) can be allowed. Falls back
    to the local Vite dev server when unset. Because the API sends credentials
    (the admin cookie), these must be explicit origins, never ``*``.
    """
    raw = os.getenv("FRONTEND_ORIGIN")
    if not raw:
        return [_DEV_FRONTEND_ORIGIN]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def get_cookie_same_site() -> str:
    """SameSite policy for the admin session cookie.

    Default ``lax`` works locally (frontend and backend are both localhost, so
    same-site). Cross-domain deploys (Vercel frontend + Render backend) must set
    this to ``none`` or the browser silently drops the cookie.
    """
    return os.getenv("SESSION_COOKIE_SAMESITE", "lax")


def get_cookie_https_only() -> bool:
    """Whether the session cookie requires HTTPS (the ``Secure`` flag).

    Default off for local http. Must be on in production — and a ``SameSite=none``
    cookie is only accepted by browsers when it is also ``Secure``.
    """
    return os.getenv("SESSION_COOKIE_HTTPS_ONLY", "").lower() in {"1", "true", "yes"}
