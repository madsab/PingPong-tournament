"""Admin auth: password hashing, the token, and the login flow (F6/F7)."""

from app.auth import (
    hash_password,
    make_admin_token,
    make_fantasy_token,
    verify_admin_token,
    verify_fantasy_token,
    verify_password,
)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_verify_password_accepts_correct_and_rejects_wrong():
    stored = hash_password("correct horse")
    assert verify_password("correct horse", stored) is True
    assert verify_password("wrong password", stored) is False


def test_verify_password_rejects_malformed_or_empty_hash():
    assert verify_password("anything", "") is False
    assert verify_password("anything", "not-a-valid-hash") is False


def test_admin_token_is_deterministic_and_secret_bound(monkeypatch):
    monkeypatch.setenv("SESSION_SECRET", "secret-one")
    token = make_admin_token()
    # Same secret → same token (so any device that logs in gets a working token).
    assert make_admin_token() == token
    assert verify_admin_token(token) is True

    # Rotating the secret invalidates every previously issued token.
    monkeypatch.setenv("SESSION_SECRET", "secret-two")
    assert make_admin_token() != token
    assert verify_admin_token(token) is False


def test_verify_admin_token_rejects_empty_or_garbage():
    assert verify_admin_token(None) is False
    assert verify_admin_token("") is False
    assert verify_admin_token("not-the-token") is False


def test_fantasy_token_round_trips_and_is_per_user_and_secret_bound(monkeypatch):
    monkeypatch.setenv("SESSION_SECRET", "secret-one")
    token = make_fantasy_token(42)
    # Round-trips to the same user, and is deterministic per (user, secret).
    assert verify_fantasy_token(token) == 42
    assert make_fantasy_token(42) == token
    # A different user gets a different token.
    assert make_fantasy_token(43) != token
    # Rotating the secret invalidates every previously issued token.
    monkeypatch.setenv("SESSION_SECRET", "secret-two")
    assert verify_fantasy_token(token) is None


def test_verify_fantasy_token_rejects_empty_garbage_or_tampered(monkeypatch):
    monkeypatch.setenv("SESSION_SECRET", "secret-one")
    assert verify_fantasy_token(None) is None
    assert verify_fantasy_token("") is None
    assert verify_fantasy_token("garbage") is None
    assert verify_fantasy_token("42.deadbeef") is None  # wrong signature
    # A valid signature for user 42 can't be reused to claim user 43.
    sig = make_fantasy_token(42).split(".", 1)[1]
    assert verify_fantasy_token(f"43.{sig}") is None


def test_admin_endpoints_require_a_token(client):
    # No token → every admin endpoint is refused (FR-005).
    assert client.get("/api/admin/teams").status_code == 401
    assert client.get("/api/admin/matches").status_code == 401
    assert client.post("/api/admin/teams", json={"name": "X"}).status_code == 401
    assert client.post("/api/admin/schedule/generate").status_code == 401


def test_login_wrong_password_is_rejected(client, admin_password):
    resp = client.post("/api/admin/login", json={"password": "nope"})
    assert resp.status_code == 401
    # Still locked out afterwards.
    assert client.get("/api/admin/teams").status_code == 401


def test_login_returns_a_working_token(client, admin_password):
    assert client.get("/api/admin/session").json() == {"authenticated": False}

    resp = client.post("/api/admin/login", json={"password": admin_password})
    assert resp.status_code == 200
    body = resp.json()
    assert body["authenticated"] is True
    assert body["token"]

    # The token unlocks guarded endpoints and reports logged in.
    headers = _auth(body["token"])
    assert client.get("/api/admin/teams", headers=headers).status_code == 200
    assert client.get("/api/admin/session", headers=headers).json() == {
        "authenticated": True
    }

    # "Logout" is client-side (drop the token): without it, back to locked out.
    assert client.get("/api/admin/teams").status_code == 401
    assert client.get("/api/admin/session").json() == {"authenticated": False}
    # A bogus token is refused too.
    assert client.get("/api/admin/teams", headers=_auth("nope")).status_code == 401
