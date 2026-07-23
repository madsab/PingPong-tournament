"""Admin auth: password hashing, the token, and the login flow (F6/F7)."""

from app.auth import (
    hash_password,
    make_admin_token,
    verify_admin_token,
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
