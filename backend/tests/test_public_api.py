"""Contract tests for the public endpoints (see contracts/)."""

from app.models import Game, Match, MatchStatus, Member, Team


def _make_team(db, name, logo_url=None):
    t = Team(name=name, logo_url=logo_url)
    db.add(t)
    db.flush()
    return t


def _make_member(db, name, team):
    mem = Member(name=name, team_id=team.id)
    db.add(mem)
    db.flush()
    return mem


def _completed_match(db, team_a, team_b, scores, players=None):
    m = Match(team_a_id=team_a.id, team_b_id=team_b.id, status=MatchStatus.completed)
    db.add(m)
    db.flush()
    for i, (a, b) in enumerate(scores):
        pa, pb = (players[i] if players else (None, None))
        db.add(
            Game(
                match_id=m.id,
                team_a_score=a,
                team_b_score=b,
                member_a_id=pa,
                member_b_id=pb,
            )
        )
    db.flush()
    return m


def _scheduled_match(db, team_a, team_b):
    m = Match(team_a_id=team_a.id, team_b_id=team_b.id, status=MatchStatus.scheduled)
    db.add(m)
    db.flush()
    return m


def test_empty_database_returns_empty_list(client):
    resp = client.get("/api/standings")
    assert resp.status_code == 200
    assert resp.json() == {"teams": []}


def test_returns_teams_sorted_by_rank(client, db_session):
    alpha = _make_team(db_session, "Alpha")
    bravo = _make_team(db_session, "Bravo")
    _completed_match(db_session, bravo, alpha, [(11, 3)])  # Bravo wins
    db_session.commit()

    resp = client.get("/api/standings")
    assert resp.status_code == 200
    teams = resp.json()["teams"]
    assert [t["rank"] for t in teams] == [1, 2]
    assert teams[0]["team_name"] == "Bravo"
    assert teams[0]["points"] == 3


def test_ranks_are_unique_and_tiebroken(client, db_session):
    # Two teams tied on points+diff; head-to-head then name must give distinct ranks.
    alpha = _make_team(db_session, "Alpha")
    bravo = _make_team(db_session, "Bravo")
    _completed_match(db_session, alpha, bravo, [(11, 9)])  # Alpha wins h2h
    _completed_match(db_session, bravo, alpha, [(11, 9)])  # Bravo wins return
    db_session.commit()

    teams = client.get("/api/standings").json()["teams"]
    ranks = [t["rank"] for t in teams]
    assert ranks == [1, 2]  # never share a rank
    assert teams[0]["team_name"] == "Alpha"  # won the head-to-head


def test_team_with_only_scheduled_matches_shows_zeroes(client, db_session):
    alpha = _make_team(db_session, "Alpha")
    bravo = _make_team(db_session, "Bravo")
    m = Match(team_a_id=alpha.id, team_b_id=bravo.id, status=MatchStatus.scheduled)
    db_session.add(m)
    db_session.commit()

    teams = client.get("/api/standings").json()["teams"]
    assert all(t["played"] == 0 and t["points"] == 0 for t in teams)


def test_logo_url_passes_through_and_can_be_null(client, db_session):
    _make_team(db_session, "Alpha", logo_url="/logos/alpha.png")
    _make_team(db_session, "Bravo", logo_url=None)
    db_session.commit()

    by_name = {t["team_name"]: t for t in client.get("/api/standings").json()["teams"]}
    assert by_name["Alpha"]["logo_url"] == "/logos/alpha.png"
    assert by_name["Bravo"]["logo_url"] is None


# --- GET /api/leaderboard (F2) -------------------------------------------------


def test_leaderboard_empty_database_returns_empty_list(client):
    resp = client.get("/api/leaderboard")
    assert resp.status_code == 200
    assert resp.json() == {"entries": []}


def test_leaderboard_ranked_with_unique_1_based_ranks(client, db_session):
    alpha = _make_team(db_session, "Alpha")
    bravo = _make_team(db_session, "Bravo")
    ada = _make_member(db_session, "Ada", alpha)
    ben = _make_member(db_session, "Ben", bravo)
    # Ada wins two, Ben wins none.
    _completed_match(
        db_session, alpha, bravo, [(11, 3), (11, 5)], players=[(ada.id, ben.id)] * 2
    )
    db_session.commit()

    entries = client.get("/api/leaderboard").json()["entries"]
    assert [e["rank"] for e in entries] == [1, 2]  # unique, 1-based
    assert entries[0]["member_name"] == "Ada"
    assert entries[0]["won"] == 2 and entries[0]["lost"] == 0
    assert entries[0]["team_name"] == "Alpha"
    # win_pct is a fraction in [0, 1].
    assert entries[0]["win_pct"] == 1.0
    assert 0.0 <= entries[1]["win_pct"] <= 1.0


def test_leaderboard_skips_null_link_for_missing_side(client, db_session):
    alpha = _make_team(db_session, "Alpha")
    bravo = _make_team(db_session, "Bravo")
    ada = _make_member(db_session, "Ada", alpha)
    _make_member(db_session, "Ben", bravo)
    # Ben's link is NULL — the game still counts for Ada (§3.1).
    _completed_match(db_session, alpha, bravo, [(11, 4)], players=[(ada.id, None)])
    db_session.commit()

    by_name = {e["member_name"]: e for e in client.get("/api/leaderboard").json()["entries"]}
    assert by_name["Ada"]["played"] == 1 and by_name["Ada"]["won"] == 1
    assert by_name["Ben"]["played"] == 0  # skipped, listed with zeros


def test_leaderboard_carries_team_logo_url(client, db_session):
    alpha = _make_team(db_session, "Alpha", logo_url="/logos/alpha.png")
    bravo = _make_team(db_session, "Bravo", logo_url=None)
    _make_member(db_session, "Ada", alpha)
    _make_member(db_session, "Ben", bravo)
    db_session.commit()

    by_name = {e["member_name"]: e for e in client.get("/api/leaderboard").json()["entries"]}
    assert by_name["Ada"]["team_logo_url"] == "/logos/alpha.png"
    assert by_name["Ben"]["team_logo_url"] is None


# --- GET /api/matches (F3 + F4) ------------------------------------------------


def test_matches_empty_database_returns_empty_list(client):
    resp = client.get("/api/matches")
    assert resp.status_code == 200
    assert resp.json() == {"matches": []}


def test_matches_scheduled_first_then_completed_stable_by_id(client, db_session):
    alpha = _make_team(db_session, "Alpha")
    bravo = _make_team(db_session, "Bravo")
    # Create a completed match first (lower id), then a scheduled one (higher id).
    _completed_match(db_session, alpha, bravo, [(11, 5)])
    _scheduled_match(db_session, bravo, alpha)
    db_session.commit()

    matches = client.get("/api/matches").json()["matches"]
    assert [m["status"] for m in matches] == ["scheduled", "completed"]


def test_matches_scheduled_has_no_result_or_games(client, db_session):
    alpha = _make_team(db_session, "Alpha")
    bravo = _make_team(db_session, "Bravo")
    _scheduled_match(db_session, alpha, bravo)
    db_session.commit()

    m = client.get("/api/matches").json()["matches"][0]
    assert m["status"] == "scheduled"
    assert m["result"] is None
    assert m["games"] == []
    assert m["team_a"]["name"] == "Alpha" and m["team_b"]["name"] == "Bravo"


def test_matches_team_refs_carry_logo_url(client, db_session):
    alpha = _make_team(db_session, "Alpha", logo_url="/logos/alpha.png")
    bravo = _make_team(db_session, "Bravo", logo_url=None)
    _scheduled_match(db_session, alpha, bravo)
    db_session.commit()

    m = client.get("/api/matches").json()["matches"][0]
    assert m["team_a"]["logo_url"] == "/logos/alpha.png"
    assert m["team_b"]["logo_url"] is None


def test_matches_completed_has_result_and_games_won_score(client, db_session):
    alpha = _make_team(db_session, "Alpha")
    bravo = _make_team(db_session, "Bravo")
    _completed_match(db_session, alpha, bravo, [(11, 5), (11, 7), (8, 11)])  # A wins 2-1
    db_session.commit()

    m = client.get("/api/matches").json()["matches"][0]
    assert m["status"] == "completed"
    assert m["result"]["winner"] == "a"
    assert (m["result"]["games_won_a"], m["result"]["games_won_b"]) == (2, 1)


def test_matches_games_carry_player_names_and_null_when_detached(client, db_session):
    alpha = _make_team(db_session, "Alpha")
    bravo = _make_team(db_session, "Bravo")
    ada = _make_member(db_session, "Ada", alpha)
    _make_member(db_session, "Ben", bravo)
    # One game has both players; a second has Ben's link cleared (§3.1).
    _completed_match(
        db_session, alpha, bravo, [(11, 5), (11, 9)], players=[(ada.id, None), (ada.id, None)]
    )
    db_session.commit()

    game = client.get("/api/matches").json()["matches"][0]["games"][0]
    assert game["member_a_name"] == "Ada"
    assert game["member_b_name"] is None  # detached link shows null, score still there
    assert game["team_a_score"] == 11 and game["team_b_score"] == 5


def test_matches_draw_reports_winner_draw(client, db_session):
    alpha = _make_team(db_session, "Alpha")
    bravo = _make_team(db_session, "Bravo")
    # 1-1 games and zero point-difference -> draw (§3.4).
    _completed_match(db_session, alpha, bravo, [(11, 5), (5, 11)])
    db_session.commit()

    m = client.get("/api/matches").json()["matches"][0]
    assert m["result"]["winner"] == "draw"


# --- GET /api/members (feature 007, US2 pick-list) -------------------------------

def test_members_lists_all_players_ordered_by_team_then_name(client, db_session):
    zeta = _make_team(db_session, "Zeta", logo_url="z.png")
    alpha = _make_team(db_session, "Alpha")
    _make_member(db_session, "Bob", zeta)
    _make_member(db_session, "Ada", zeta)
    _make_member(db_session, "Cara", alpha)
    db_session.commit()

    resp = client.get("/api/members")
    assert resp.status_code == 200  # no login required
    members = resp.json()["members"]
    # Ordered by team name (Alpha before Zeta), then player name.
    assert [(m["name"], m["team_name"]) for m in members] == [
        ("Cara", "Alpha"),
        ("Ada", "Zeta"),
        ("Bob", "Zeta"),
    ]
    ada = next(m for m in members if m["name"] == "Ada")
    assert ada["team_id"] == zeta.id
    assert ada["team_logo_url"] == "z.png"
    assert isinstance(ada["id"], int)


def test_members_empty_when_no_players(client):
    assert client.get("/api/members").json() == {"members": []}
