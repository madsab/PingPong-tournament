"""Fantasy Ping Pong API (feature 007): auth, remembered session, team slots."""

from datetime import timedelta

from sqlalchemy import select

from app.models import FantasySlot, Game, Match, MatchStatus, Member, Team


def _seed_team(db, name="Paddlers", members=("Ada", "Bea")):
    team = Team(name=name)
    team.members = [Member(name=m) for m in members]
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


# --- US1: register, login, remembered session ------------------------------------

def test_register_creates_account_and_logs_in(client):
    resp = client.post(
        "/api/fantasy/register",
        json={"name": "Alice", "fun_fact": "I juggle"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Alice"
    assert body["fun_fact"] == "I juggle"

    # Session is set: /me now works without sending anything else.
    me = client.get("/api/fantasy/me")
    assert me.status_code == 200
    assert me.json()["name"] == "Alice"


def test_register_rejects_empty_name(client):
    resp = client.post(
        "/api/fantasy/register", json={"name": "   ", "fun_fact": "hi"}
    )
    assert resp.status_code == 422


def test_register_rejects_empty_fun_fact(client):
    resp = client.post(
        "/api/fantasy/register", json={"name": "Bob", "fun_fact": "   "}
    )
    assert resp.status_code == 422


def test_register_rejects_over_length_name(client):
    resp = client.post(
        "/api/fantasy/register", json={"name": "x" * 101, "fun_fact": "hi"}
    )
    assert resp.status_code == 422


def test_register_rejects_over_length_fun_fact(client):
    resp = client.post(
        "/api/fantasy/register", json={"name": "Bob", "fun_fact": "y" * 281}
    )
    assert resp.status_code == 422


def test_duplicate_name_is_case_and_space_insensitive(client):
    assert (
        client.post(
            "/api/fantasy/register", json={"name": "Alice", "fun_fact": "a"}
        ).status_code
        == 201
    )
    resp = client.post(
        "/api/fantasy/register", json={"name": "  alice ", "fun_fact": "b"}
    )
    assert resp.status_code == 409


def test_login_existing_and_unknown(client):
    client.post("/api/fantasy/register", json={"name": "Cara", "fun_fact": "c"})
    client.post("/api/fantasy/logout")

    ok = client.post("/api/fantasy/login", json={"name": " cara "})
    assert ok.status_code == 200
    assert ok.json()["name"] == "Cara"

    missing = client.post("/api/fantasy/login", json={"name": "Nobody"})
    assert missing.status_code == 404


def test_me_requires_session(client):
    assert client.get("/api/fantasy/me").status_code == 401


def test_logout_clears_session(client):
    client.post("/api/fantasy/register", json={"name": "Dan", "fun_fact": "d"})
    assert client.get("/api/fantasy/me").status_code == 200
    assert client.post("/api/fantasy/logout").status_code == 200
    assert client.get("/api/fantasy/me").status_code == 401


# --- US2: build the 4-slot team --------------------------------------------------

def _register(client, name="Ivy", fun="hi"):
    assert client.post(
        "/api/fantasy/register", json={"name": name, "fun_fact": fun}
    ).status_code == 201


def test_team_requires_login(client):
    assert client.get("/api/fantasy/team").status_code == 401


def test_team_starts_with_four_empty_slots(client):
    _register(client)
    body = client.get("/api/fantasy/team").json()
    assert body["compubucks"] == 0
    assert [s["slot_index"] for s in body["slots"]] == [1, 2, 3, 4]
    assert all(s["member_id"] is None for s in body["slots"])


def test_assign_and_replace_slot(client, db_session):
    team = _seed_team(db_session)  # Ada, Bea
    ada, bea = team.members
    _register(client)

    body = client.put(
        f"/api/fantasy/team/slots/1", json={"member_id": ada.id}
    ).json()
    slot1 = next(s for s in body["slots"] if s["slot_index"] == 1)
    assert slot1["member_id"] == ada.id
    assert slot1["member_name"] == "Ada"
    assert slot1["team_name"] == "Paddlers"

    # Replace slot 1 with Bea.
    body = client.put(
        f"/api/fantasy/team/slots/1", json={"member_id": bea.id}
    ).json()
    slot1 = next(s for s in body["slots"] if s["slot_index"] == 1)
    assert slot1["member_name"] == "Bea"


def test_slot_index_out_of_range_rejected(client, db_session):
    team = _seed_team(db_session)
    _register(client)
    assert client.put(
        "/api/fantasy/team/slots/5", json={"member_id": team.members[0].id}
    ).status_code == 422
    assert client.put(
        "/api/fantasy/team/slots/0", json={"member_id": team.members[0].id}
    ).status_code == 422


def test_unknown_member_rejected(client):
    _register(client)
    assert client.put(
        "/api/fantasy/team/slots/1", json={"member_id": 9999}
    ).status_code == 404


def test_same_member_in_two_slots_rejected(client, db_session):
    team = _seed_team(db_session)
    ada = team.members[0]
    _register(client)
    assert client.put(
        "/api/fantasy/team/slots/1", json={"member_id": ada.id}
    ).status_code == 200
    resp = client.put("/api/fantasy/team/slots/2", json={"member_id": ada.id})
    assert resp.status_code == 409


def test_clear_slot_is_idempotent(client, db_session):
    team = _seed_team(db_session)
    ada = team.members[0]
    _register(client)
    client.put("/api/fantasy/team/slots/1", json={"member_id": ada.id})

    body = client.delete("/api/fantasy/team/slots/1").json()
    assert next(s for s in body["slots"] if s["slot_index"] == 1)["member_id"] is None
    # Deleting an already-empty slot is fine.
    assert client.delete("/api/fantasy/team/slots/1").status_code == 200
    assert client.delete("/api/fantasy/team/slots/9").status_code == 422


# --- US3: CompuBucks only count games played after a player was added ------------

def test_compubucks_only_counts_games_after_player_added(client, db_session):
    home = _seed_team(db_session)  # Paddlers: Ada, Bea
    away = Team(name="Rivals")
    away.members = [Member(name="Rob")]
    db_session.add(away)
    db_session.commit()
    db_session.refresh(away)
    ada, rob = home.members[0], away.members[0]

    _register(client)
    client.put("/api/fantasy/team/slots/1", json={"member_id": ada.id})
    slot = db_session.scalar(
        select(FantasySlot).where(FantasySlot.member_id == ada.id)
    )
    added = slot.added_at

    def won_match(when):
        m = Match(
            team_a_id=home.id,
            team_b_id=away.id,
            status=MatchStatus.completed,
            completed_at=when,
        )
        m.games = [
            Game(team_a_score=11, team_b_score=5, member_a_id=ada.id, member_b_id=rob.id)
        ]
        return m

    # One win before Ada was added (ignored) and one after (+10).
    db_session.add_all(
        [won_match(added - timedelta(days=1)), won_match(added + timedelta(days=1))]
    )
    db_session.commit()

    body = client.get("/api/fantasy/team").json()
    assert body["compubucks"] == 10
