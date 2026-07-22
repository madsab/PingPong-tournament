"""Tests for deployment-related config reads (CORS origins + cookie flags).

These back the cross-domain deploy (Vercel frontend + Render backend): the app
must allow the deployed frontend origin and send a SameSite=None; Secure cookie,
while keeping local-dev-friendly defaults when the env vars are unset.
"""

from app import config


def test_frontend_origins_default_is_local_dev(monkeypatch):
    monkeypatch.delenv("FRONTEND_ORIGIN", raising=False)
    assert config.get_frontend_origins() == ["http://localhost:5173"]


def test_frontend_origins_parses_comma_separated_list(monkeypatch):
    monkeypatch.setenv(
        "FRONTEND_ORIGIN",
        " https://app.vercel.app , https://preview.vercel.app ",
    )
    assert config.get_frontend_origins() == [
        "https://app.vercel.app",
        "https://preview.vercel.app",
    ]


def test_frontend_origins_ignores_empty_entries(monkeypatch):
    monkeypatch.setenv("FRONTEND_ORIGIN", "https://app.vercel.app,,")
    assert config.get_frontend_origins() == ["https://app.vercel.app"]


def test_cookie_same_site_defaults_to_lax(monkeypatch):
    monkeypatch.delenv("SESSION_COOKIE_SAMESITE", raising=False)
    assert config.get_cookie_same_site() == "lax"


def test_cookie_same_site_can_be_none_for_cross_site(monkeypatch):
    monkeypatch.setenv("SESSION_COOKIE_SAMESITE", "none")
    assert config.get_cookie_same_site() == "none"


def test_cookie_https_only_defaults_off(monkeypatch):
    monkeypatch.delenv("SESSION_COOKIE_HTTPS_ONLY", raising=False)
    assert config.get_cookie_https_only() is False


def test_cookie_https_only_truthy_values(monkeypatch):
    for value in ("1", "true", "TRUE", "yes"):
        monkeypatch.setenv("SESSION_COOKIE_HTTPS_ONLY", value)
        assert config.get_cookie_https_only() is True
