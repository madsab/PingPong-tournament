"""Admin CRUD for teams, members, and matches (F8/F9/F10)."""

from app.models import Game, Match, MatchStatus, Member, Team


def _team_with_members(db, name, members):
    team = Team(name=name)
    team.members = [Member(name=m) for m in members]
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


# --- Teams (F8) ------------------------------------------------------------------

def test_create_rename_delete_team(admin_client):
    resp = admin_client.post("/api/admin/teams", json={"name": "Spin Doctors"})
    assert resp.status_code == 201
    team_id = resp.json()["id"]

    resp = admin_client.put(f"/api/admin/teams/{team_id}", json={"name": "Renamed"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Renamed"

    assert admin_client.delete(f"/api/admin/teams/{team_id}").status_code == 204
    assert admin_client.put(f"/api/admin/teams/{team_id}", json={"name": "x"}).status_code == 404


def test_team_logo_url_round_trips_on_create_and_update(admin_client):
    # Create with a logo (F-005/US1): it comes back on the team.
    resp = admin_client.post(
        "/api/admin/teams",
        json={"name": "Logos", "logo_url": "https://cdn.example/logo.png"},
    )
    assert resp.status_code == 201
    team_id = resp.json()["id"]
    assert resp.json()["logo_url"] == "https://cdn.example/logo.png"

    # Change the logo via update.
    resp = admin_client.put(
        f"/api/admin/teams/{team_id}",
        json={"logo_url": "https://cdn.example/new.png"},
    )
    assert resp.status_code == 200
    assert resp.json()["logo_url"] == "https://cdn.example/new.png"

    # Empty string clears the logo (the frontend treats empty as "no logo").
    resp = admin_client.put(f"/api/admin/teams/{team_id}", json={"logo_url": ""})
    assert resp.status_code == 200
    assert resp.json()["logo_url"] == ""


def test_duplicate_team_name_is_rejected(admin_client):
    admin_client.post("/api/admin/teams", json={"name": "Dupes"})
    resp = admin_client.post("/api/admin/teams", json={"name": "Dupes"})
    assert resp.status_code == 409


def test_deleting_a_team_removes_its_members_and_matches(admin_client, db_session):
    a = _team_with_members(db_session, "A", ["Ann"])
    b = _team_with_members(db_session, "B", ["Bob"])
    match = Match(team_a_id=a.id, team_b_id=b.id)
    db_session.add(match)
    db_session.commit()

    assert admin_client.delete(f"/api/admin/teams/{a.id}").status_code == 204

    # Team A, its members, and the match all gone; nothing orphaned (FR-010).
    assert db_session.get(Team, a.id) is None
    assert db_session.query(Member).filter_by(team_id=a.id).count() == 0
    assert db_session.query(Match).count() == 0


# --- Members (F9) ----------------------------------------------------------------

def test_create_edit_delete_member(admin_client, db_session):
    team = _team_with_members(db_session, "A", [])
    resp = admin_client.post(
        "/api/admin/members", json={"name": "Ann", "team_id": team.id}
    )
    assert resp.status_code == 201
    member_id = resp.json()["id"]

    resp = admin_client.put(f"/api/admin/members/{member_id}", json={"name": "Annie"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Annie"

    assert admin_client.delete(f"/api/admin/members/{member_id}").status_code == 204


def test_deleting_a_member_keeps_recorded_games_but_nulls_the_pairing(
    admin_client, db_session
):
    a = _team_with_members(db_session, "A", ["Ann"])
    b = _team_with_members(db_session, "B", ["Bob"])
    ann, bob = a.members[0], b.members[0]
    match = Match(team_a_id=a.id, team_b_id=b.id, status=MatchStatus.completed)
    match.games = [
        Game(member_a_id=ann.id, member_b_id=bob.id, team_a_score=11, team_b_score=7)
    ]
    db_session.add(match)
    db_session.commit()

    assert admin_client.delete(f"/api/admin/members/{ann.id}").status_code == 204

    # The game survives (§3.1), it just forgets who played on team A.
    game = db_session.query(Game).one()
    assert game.member_a_id is None
    assert game.member_b_id == bob.id


# --- Matches (F10) ---------------------------------------------------------------

def test_create_edit_delete_match(admin_client, db_session):
    a = _team_with_members(db_session, "A", ["Ann"])
    b = _team_with_members(db_session, "B", ["Bob"])
    c = _team_with_members(db_session, "C", ["Cid"])

    resp = admin_client.post(
        "/api/admin/matches", json={"team_a_id": a.id, "team_b_id": b.id}
    )
    assert resp.status_code == 201
    match_id = resp.json()["id"]

    resp = admin_client.put(
        f"/api/admin/matches/{match_id}", json={"team_b_id": c.id}
    )
    assert resp.status_code == 200
    assert resp.json()["team_b"]["id"] == c.id

    assert admin_client.delete(f"/api/admin/matches/{match_id}").status_code == 204


def test_match_needs_two_different_teams(admin_client, db_session):
    a = _team_with_members(db_session, "A", ["Ann"])
    resp = admin_client.post(
        "/api/admin/matches", json={"team_a_id": a.id, "team_b_id": a.id}
    )
    assert resp.status_code == 400
