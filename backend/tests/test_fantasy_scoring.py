"""Tests for the CompuBucks math (feature 007, §data-model).

Pure function like the standings math: it takes plain objects with the right
attributes, so we build tiny stand-ins instead of touching the database.

Rule (v1): +10 for each game a slot's player *wins*, counted only for matches
completed AFTER that player was put in the slot (each slot has its own clock).
Losses earn nothing.
"""

from datetime import datetime
from types import SimpleNamespace

from app.fantasy import BUCKS_PER_WIN, compute_compubucks

T0 = datetime(2026, 1, 1)  # a slot's "added" moment
BEFORE = datetime(2025, 12, 31)  # match completed before the player was added
AFTER = datetime(2026, 1, 2)  # match completed after the player was added


def slot(member_id, added_at=T0):
    return SimpleNamespace(member_id=member_id, added_at=added_at)


def game(a, b, member_a=None, member_b=None):
    return SimpleNamespace(
        team_a_score=a, team_b_score=b, member_a_id=member_a, member_b_id=member_b
    )


def match(games, completed_at=AFTER, status="completed"):
    return SimpleNamespace(status=status, completed_at=completed_at, games=games)


def test_no_slots_earns_zero():
    m = match([game(11, 5, member_a=1, member_b=2)])
    assert compute_compubucks([], [m]) == 0


def test_win_after_added_earns_ten():
    m = match([game(11, 5, member_a=1, member_b=2)], completed_at=AFTER)
    assert compute_compubucks([slot(1)], [m]) == BUCKS_PER_WIN


def test_win_before_added_earns_nothing():
    m = match([game(11, 5, member_a=1, member_b=2)], completed_at=BEFORE)
    assert compute_compubucks([slot(1)], [m]) == 0


def test_loss_earns_nothing_even_after_added():
    # Member 1 (side A) loses; wins-only means no bucks.
    m = match([game(5, 11, member_a=1, member_b=2)], completed_at=AFTER)
    assert compute_compubucks([slot(1)], [m]) == 0


def test_side_b_win_counts():
    m = match([game(5, 11, member_a=1, member_b=2)], completed_at=AFTER)
    assert compute_compubucks([slot(2)], [m]) == BUCKS_PER_WIN


def test_scheduled_or_undated_match_earns_nothing():
    scheduled = match([game(11, 0, member_a=1, member_b=2)], status="scheduled")
    undated = match([game(11, 0, member_a=1, member_b=2)], completed_at=None)
    assert compute_compubucks([slot(1)], [scheduled, undated]) == 0


def test_two_slots_have_independent_clocks():
    # One game completed between the two slots' added times: only the earlier
    # slot's player was on the team when it was played.
    early = slot(1, added_at=datetime(2026, 1, 1))
    late = slot(2, added_at=datetime(2026, 1, 10))
    m = match(
        [game(11, 5, member_a=1, member_b=2)],
        completed_at=datetime(2026, 1, 5),
    )
    # Member 1 was added before the game (counts, +10); member 2 lost anyway (0),
    # and was added after the game (wouldn't count regardless).
    assert compute_compubucks([early, late], [m]) == BUCKS_PER_WIN


def test_multiple_wins_sum():
    m = match(
        [
            game(11, 5, member_a=1, member_b=2),
            game(11, 9, member_a=1, member_b=2),
        ],
        completed_at=AFTER,
    )
    assert compute_compubucks([slot(1)], [m]) == 2 * BUCKS_PER_WIN
