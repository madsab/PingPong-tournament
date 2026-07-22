"""Round-robin generation (F11): the pure helper and the admin endpoint."""

from app.models import Match, Team
from app.schedule import missing_pairings, pair_key


# --- Pure function ---------------------------------------------------------------

def test_pair_key_is_order_independent():
    assert pair_key(1, 2) == pair_key(2, 1) == (1, 2)


def test_missing_pairings_returns_all_pairs_when_none_exist():
    assert missing_pairings([1, 2, 3], []) == [(1, 2), (1, 3), (2, 3)]


def test_missing_pairings_skips_existing_regardless_of_order():
    # (2,1) already exists → the (1,2) pair is not returned again.
    assert missing_pairings([1, 2, 3], [(2, 1)]) == [(1, 3), (2, 3)]


def test_missing_pairings_empty_when_full():
    assert missing_pairings([1, 2], [(1, 2)]) == []


def test_missing_pairings_empty_for_fewer_than_two_teams():
    assert missing_pairings([1], []) == []
    assert missing_pairings([], []) == []


# --- Endpoint --------------------------------------------------------------------

def _add_teams(db, names):
    teams = [Team(name=n) for n in names]
    db.add_all(teams)
    db.commit()
    return teams


def test_generate_creates_every_missing_pair_then_none(admin_client, db_session):
    _add_teams(db_session, ["A", "B", "C", "D"])

    resp = admin_client.post("/api/admin/schedule/generate")
    assert resp.status_code == 200
    # 4 teams → 4*3/2 = 6 matches.
    assert resp.json()["created"] == 6
    assert db_session.query(Match).count() == 6

    # Running again creates nothing and never duplicates.
    resp = admin_client.post("/api/admin/schedule/generate")
    assert resp.json()["created"] == 0
    assert db_session.query(Match).count() == 6


def test_generate_after_adding_a_team_only_fills_new_pairings(admin_client, db_session):
    _add_teams(db_session, ["A", "B", "C"])
    admin_client.post("/api/admin/schedule/generate")  # 3 matches
    assert db_session.query(Match).count() == 3

    _add_teams(db_session, ["D"])
    resp = admin_client.post("/api/admin/schedule/generate")
    # Only D-vs-{A,B,C} are new → 3 created, total 6.
    assert resp.json()["created"] == 3
    assert db_session.query(Match).count() == 6
