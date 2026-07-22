"""Recording a match result (F12/F13): uneven pairings and score validation."""

from app.models import Match, MatchStatus, Member, Team


def _setup_match(db, a_members, b_members):
    a = Team(name="A")
    a.members = [Member(name=n) for n in a_members]
    b = Team(name="B")
    b.members = [Member(name=n) for n in b_members]
    db.add_all([a, b])
    db.commit()
    match = Match(team_a_id=a.id, team_b_id=b.id)
    db.add(match)
    db.commit()
    db.refresh(match)
    return match, a, b


def test_record_uneven_result_repeats_smaller_team_member(admin_client, db_session):
    # Team A has 3 members, Team B has 2 → 3 games, B repeats one member (§3.2).
    match, a, b = _setup_match(db_session, ["Ann", "Amy", "Al"], ["Bob", "Ben"])
    a_ids = [m.id for m in a.members]
    b_ids = [m.id for m in b.members]

    body = {
        "games": [
            {"member_a_id": a_ids[0], "member_b_id": b_ids[0], "team_a_score": 11, "team_b_score": 7},
            {"member_a_id": a_ids[1], "member_b_id": b_ids[1], "team_a_score": 8, "team_b_score": 11},
            # Bob (b_ids[0]) plays again to cover the third opponent.
            {"member_a_id": a_ids[2], "member_b_id": b_ids[0], "team_a_score": 11, "team_b_score": 9},
        ]
    }
    resp = admin_client.put(f"/api/admin/matches/{match.id}/result", json=body)
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"

    updated = db_session.get(Match, match.id)
    assert updated.status is MatchStatus.completed
    assert len(updated.games) == 3


def test_result_recompute_reflected_in_standings(admin_client, db_session):
    match, a, b = _setup_match(db_session, ["Ann"], ["Bob"])
    a_id, b_id = a.members[0].id, b.members[0].id
    body = {
        "games": [
            {"member_a_id": a_id, "member_b_id": b_id, "team_a_score": 11, "team_b_score": 5}
        ]
    }
    assert admin_client.put(f"/api/admin/matches/{match.id}/result", json=body).status_code == 200

    standings = admin_client.get("/api/standings").json()["teams"]
    winner = next(t for t in standings if t["team_name"] == "A")
    assert winner["points"] == 3  # a win is 3 points (§3.5)


def test_wrong_game_count_is_rejected(admin_client, db_session):
    match, a, b = _setup_match(db_session, ["Ann", "Amy"], ["Bob", "Ben"])
    a_ids = [m.id for m in a.members]
    b_ids = [m.id for m in b.members]
    # Only one game, but the larger team size is 2.
    body = {
        "games": [
            {"member_a_id": a_ids[0], "member_b_id": b_ids[0], "team_a_score": 11, "team_b_score": 7}
        ]
    }
    assert admin_client.put(f"/api/admin/matches/{match.id}/result", json=body).status_code == 422


def test_negative_and_tied_scores_are_rejected(admin_client, db_session):
    match, a, b = _setup_match(db_session, ["Ann"], ["Bob"])
    a_id, b_id = a.members[0].id, b.members[0].id

    negative = {
        "games": [
            {"member_a_id": a_id, "member_b_id": b_id, "team_a_score": -1, "team_b_score": 5}
        ]
    }
    assert admin_client.put(f"/api/admin/matches/{match.id}/result", json=negative).status_code == 422

    tied = {
        "games": [
            {"member_a_id": a_id, "member_b_id": b_id, "team_a_score": 9, "team_b_score": 9}
        ]
    }
    assert admin_client.put(f"/api/admin/matches/{match.id}/result", json=tied).status_code == 422

    # The match never became completed.
    assert db_session.get(Match, match.id).status is MatchStatus.scheduled
