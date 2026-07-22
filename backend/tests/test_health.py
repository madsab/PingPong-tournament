"""Test the lightweight liveness endpoint used by the frontend keep-alive ping."""


def test_health_returns_ok(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
