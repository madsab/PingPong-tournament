"""Tests for the individual leaderboard math (SPECIFICATIONS §3.6).

Like the standings tests, these are pure: `compute_leaderboard` takes plain objects
with the right attributes, so we build tiny stand-ins instead of touching the database.
"""

from types import SimpleNamespace

from app.leaderboard import compute_leaderboard


def member(id_, name, team_name="Team"):
    return SimpleNamespace(id=id_, name=name, team=SimpleNamespace(name=team_name))


def game(a_id, b_id, a_score, b_score):
    return SimpleNamespace(
        member_a_id=a_id,
        member_b_id=b_id,
        team_a_score=a_score,
        team_b_score=b_score,
    )


def match(games, status="completed"):
    return SimpleNamespace(status=status, games=games)


def test_counts_games_won_lost_played_and_point_difference():
    ada, ben = member(1, "Ada"), member(2, "Ben")
    matches = [match([game(1, 2, 11, 7), game(1, 2, 9, 11)])]  # Ada wins one, loses one
    entries = {e.member_id: e for e in compute_leaderboard([ada, ben], matches)}

    assert (entries[1].played, entries[1].won, entries[1].lost) == (2, 1, 1)
    assert entries[1].point_difference == (11 - 7) + (9 - 11)  # +4 - 2 = +2
    assert (entries[2].played, entries[2].won, entries[2].lost) == (2, 1, 1)
    assert entries[2].point_difference == -2


def test_win_pct_is_won_over_played():
    ada, ben = member(1, "Ada"), member(2, "Ben")
    matches = [match([game(1, 2, 11, 3), game(1, 2, 11, 5), game(1, 2, 7, 11)])]
    entries = {e.member_id: e for e in compute_leaderboard([ada, ben], matches)}
    assert entries[1].win_pct == 2 / 3  # Ada won 2 of 3


def test_ordered_by_won_then_win_pct_then_diff_then_name():
    # Ada 2 wins, Ben 1 win, Cara 1 win but worse diff, Dan 1 win same as Cara but name.
    ada, ben, cara, dan = (
        member(1, "Ada"),
        member(2, "Ben"),
        member(3, "Cara"),
        member(4, "Dan"),
    )
    matches = [
        match([game(1, 2, 11, 1), game(1, 2, 11, 2)]),  # Ada +2 wins, Ben 0/2
        match([game(3, 4, 11, 9)]),  # Cara beats Dan (Cara +2)
        match([game(3, 4, 11, 3)]),  # Cara beats Dan again... make counts differ
    ]
    ranked = compute_leaderboard([ada, ben, cara, dan], matches)
    # Cara has 2 wins (same as Ada). Ada diff = +19, Cara diff = +10 -> Ada first.
    assert [e.member_name for e in ranked][:2] == ["Ada", "Cara"]
    assert [e.rank for e in ranked] == [1, 2, 3, 4]


def test_skips_side_with_null_member_link_but_counts_the_other():
    # §3.1: Ben's link was cleared. The game still counts for Ada.
    ada, ben = member(1, "Ada"), member(2, "Ben")
    matches = [match([game(1, None, 11, 5)])]
    entries = {e.member_id: e for e in compute_leaderboard([ada, ben], matches)}
    assert entries[1].played == 1 and entries[1].won == 1
    assert entries[2].played == 0  # Ben's side was skipped


def test_member_repeated_across_games_counts_each_game():
    # §3.2: a smaller team repeats a player to cover a larger opponent.
    ada, ben, cara = member(1, "Ada"), member(2, "Ben"), member(3, "Cara")
    # Ada plays twice in one match (vs Ben, then vs Cara).
    matches = [match([game(1, 2, 11, 4), game(1, 3, 11, 8)])]
    entries = {e.member_id: e for e in compute_leaderboard([ada, ben, cara], matches)}
    assert entries[1].played == 2 and entries[1].won == 2


def test_only_completed_matches_count():
    ada, ben = member(1, "Ada"), member(2, "Ben")
    matches = [match([game(1, 2, 11, 1)], status="scheduled")]
    entries = {e.member_id: e for e in compute_leaderboard([ada, ben], matches)}
    assert all(e.played == 0 for e in entries.values())


def test_zero_game_member_listed_last_with_zero_stats_no_division_error():
    ada, zoe = member(1, "Ada"), member(2, "Zoe")
    matches = [match([game(1, None, 11, 1)])]  # only Ada plays
    ranked = compute_leaderboard([ada, zoe], matches)
    zoe_entry = next(e for e in ranked if e.member_name == "Zoe")
    assert zoe_entry.played == 0 and zoe_entry.win_pct == 0.0
    assert ranked[-1].member_name == "Zoe"  # zero games -> last, by name tiebreak


def test_team_name_is_carried_through():
    ada = member(1, "Ada", team_name="Spin Doctors")
    ranked = compute_leaderboard([ada], [])
    assert ranked[0].team_name == "Spin Doctors"
