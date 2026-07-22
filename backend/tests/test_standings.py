"""Tests for the ranking math (SPECIFICATIONS §3.4-§3.5).

This is the most important logic in the app, so it is test-driven. The functions
under test are pure: they take plain objects with the right attributes, so we build
tiny stand-ins here instead of touching the database.
"""

from types import SimpleNamespace

from app.standings import compute_standings, decide_match


def team(id_, name, logo_url=None):
    return SimpleNamespace(id=id_, name=name, logo_url=logo_url)


def game(a, b):
    return SimpleNamespace(team_a_score=a, team_b_score=b)


def match(team_a_id, team_b_id, games, status="completed"):
    return SimpleNamespace(
        team_a_id=team_a_id, team_b_id=team_b_id, status=status, games=games
    )


# --- §3.4 match winner ---------------------------------------------------------


def test_match_won_by_most_games():
    m = match(1, 2, [game(11, 5), game(9, 11), game(11, 7)])  # A wins 2 games to 1
    assert decide_match(m) == "a"


def test_match_tied_games_decided_by_point_difference():
    # One game each, but A's total point-difference is higher.
    m = match(1, 2, [game(11, 2), game(9, 11)])  # A: +9-2=+7 ... B: +2-9=-7
    assert decide_match(m) == "a"


def test_match_is_a_draw_when_games_and_point_difference_tie():
    m = match(1, 2, [game(11, 5), game(5, 11)])  # 1-1 games, diff 0
    assert decide_match(m) == "draw"


# --- §3.5 team standings ordering ---------------------------------------------


def test_ranked_by_points():
    teams = [team(1, "Alpha"), team(2, "Bravo")]
    # Bravo beats Alpha -> Bravo 3pts, Alpha 0.
    matches = [match(2, 1, [game(11, 1)])]
    ranking = compute_standings(teams, matches)
    assert [e.team_name for e in ranking] == ["Bravo", "Alpha"]
    assert ranking[0].rank == 1 and ranking[0].points == 3
    assert ranking[1].rank == 2 and ranking[1].points == 0


def test_tiebreak_point_difference():
    # Two teams each beat a third, same points; higher point-diff ranks first.
    teams = [team(1, "Alpha"), team(2, "Bravo"), team(3, "Cesar")]
    matches = [
        match(1, 3, [game(11, 1)]),  # Alpha +10
        match(2, 3, [game(11, 9)]),  # Bravo +2
    ]
    ranking = compute_standings(teams, matches)
    assert [e.team_name for e in ranking[:2]] == ["Alpha", "Bravo"]


def test_tiebreak_head_to_head():
    # Alpha and Bravo tie on points and total point-difference, but Alpha won
    # their head-to-head meeting, so Alpha ranks first.
    teams = [team(1, "Alpha"), team(2, "Bravo")]
    matches = [
        match(1, 2, [game(11, 9)]),  # Alpha wins h2h (Alpha +2)
        match(2, 1, [game(11, 9)]),  # Bravo wins the return (Bravo +2)
    ]
    # Both: 1 win, 1 loss -> 3 pts each; total diff 0 each -> h2h breaks the tie.
    ranking = compute_standings(teams, matches)
    assert [e.team_name for e in ranking] == ["Alpha", "Bravo"]


def test_tiebreak_team_name_last():
    # Everything equal (no matches) -> alphabetical, stable ordering.
    teams = [team(2, "Bravo"), team(1, "Alpha")]
    ranking = compute_standings(teams, [])
    assert [e.team_name for e in ranking] == ["Alpha", "Bravo"]
    assert [e.rank for e in ranking] == [1, 2]


def test_only_completed_matches_count():
    teams = [team(1, "Alpha"), team(2, "Bravo")]
    matches = [match(1, 2, [game(11, 1)], status="scheduled")]
    ranking = compute_standings(teams, matches)
    # Nothing completed -> everyone on 0, no games played.
    assert all(e.points == 0 and e.played == 0 for e in ranking)


def test_win_draw_loss_counts_and_played():
    teams = [team(1, "Alpha"), team(2, "Bravo")]
    matches = [
        match(1, 2, [game(11, 1)]),  # Alpha win
        match(1, 2, [game(11, 5), game(5, 11)]),  # draw
    ]
    ranking = compute_standings(teams, matches)
    alpha = next(e for e in ranking if e.team_name == "Alpha")
    assert alpha.played == 2
    assert (alpha.wins, alpha.draws, alpha.losses) == (1, 1, 0)
    assert alpha.points == 4  # 3 (win) + 1 (draw)
