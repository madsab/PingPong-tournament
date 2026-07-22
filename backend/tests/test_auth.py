"""Admin auth: password hashing, the guard, and login/logout (F6/F7)."""

from app.auth import hash_password, verify_password


def test_verify_password_accepts_correct_and_rejects_wrong():
    stored = hash_password("correct horse")
    assert verify_password("correct horse", stored) is True
    assert verify_password("wrong password", stored) is False


def test_verify_password_rejects_malformed_or_empty_hash():
    assert verify_password("anything", "") is False
    assert verify_password("anything", "not-a-valid-hash") is False


def test_admin_endpoints_require_a_session(client):
    # No login → every admin endpoint is refused (FR-005).
    assert client.get("/api/admin/teams").status_code == 401
    assert client.get("/api/admin/matches").status_code == 401
    assert client.post("/api/admin/teams", json={"name": "X"}).status_code == 401
    assert client.post("/api/admin/schedule/generate").status_code == 401


def test_login_wrong_password_is_rejected(client, admin_password):
    resp = client.post("/api/admin/login", json={"password": "nope"})
    assert resp.status_code == 401
    # Still locked out afterwards.
    assert client.get("/api/admin/teams").status_code == 401


def test_login_then_logout_flow(client, admin_password):
    assert client.get("/api/admin/session").json() == {"authenticated": False}

    resp = client.post("/api/admin/login", json={"password": admin_password})
    assert resp.status_code == 200
    assert resp.json() == {"authenticated": True}

    # Now a guarded endpoint works and the session reports logged in.
    assert client.get("/api/admin/teams").status_code == 200
    assert client.get("/api/admin/session").json() == {"authenticated": True}

    assert client.post("/api/admin/logout").json() == {"authenticated": False}
    assert client.get("/api/admin/teams").status_code == 401
    assert client.get("/api/admin/session").json() == {"authenticated": False}
