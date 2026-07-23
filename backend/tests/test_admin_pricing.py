"""Admin pricing endpoints (feature 008): player prices + the Booster price."""


def _team_and_member(admin_client, price=None):
    team = admin_client.post("/api/admin/teams", json={"name": "Rockets"}).json()
    body = {"name": "Ada", "team_id": team["id"]}
    if price is not None:
        body["price"] = price
    member = admin_client.post("/api/admin/members", json=body).json()
    return team, member


# --- player price ----------------------------------------------------------------

def test_member_starts_unpriced(admin_client):
    _, member = _team_and_member(admin_client)
    assert member["price"] is None


def test_create_member_with_price(admin_client):
    _, member = _team_and_member(admin_client, price=30_000_000)
    assert member["price"] == 30_000_000


def test_set_member_price(admin_client):
    _, member = _team_and_member(admin_client)
    resp = admin_client.put(
        f"/api/admin/members/{member['id']}", json={"price": 25_000_000}
    )
    assert resp.status_code == 200
    assert resp.json()["price"] == 25_000_000


def test_clear_member_price_with_null(admin_client):
    _, member = _team_and_member(admin_client, price=25_000_000)
    resp = admin_client.put(
        f"/api/admin/members/{member['id']}", json={"price": None}
    )
    assert resp.status_code == 200
    assert resp.json()["price"] is None


def test_negative_price_rejected(admin_client):
    _, member = _team_and_member(admin_client)
    assert admin_client.put(
        f"/api/admin/members/{member['id']}", json={"price": -5}
    ).status_code == 422


def test_public_members_include_price(admin_client, client):
    _, member = _team_and_member(admin_client, price=12_000_000)
    players = client.get("/api/members").json()["members"]
    ada = next(p for p in players if p["id"] == member["id"])
    assert ada["price"] == 12_000_000


# --- booster price ---------------------------------------------------------------

def test_booster_price_defaults_to_one_million(admin_client):
    resp = admin_client.get("/api/admin/settings/booster-price")
    assert resp.status_code == 200
    assert resp.json()["booster_price"] == 1_000_000


def test_set_booster_price(admin_client):
    put = admin_client.put(
        "/api/admin/settings/booster-price", json={"booster_price": 2_000_000}
    )
    assert put.status_code == 200 and put.json()["booster_price"] == 2_000_000
    assert (
        admin_client.get("/api/admin/settings/booster-price").json()["booster_price"]
        == 2_000_000
    )


def test_negative_booster_price_rejected(admin_client):
    assert admin_client.put(
        "/api/admin/settings/booster-price", json={"booster_price": -1}
    ).status_code == 422
