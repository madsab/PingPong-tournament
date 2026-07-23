"""Tests for the CompuBucks economy math (feature 008, pure functions).

``slot_match_delta`` computes one slot's earn/lose for one match plus whether its
Booster was consumed. Pure function like the standings math, so we build tiny
stand-ins instead of touching the database.

Rule: +5,000,000 per game won, -2,000,000 per game lost. Golden Racket doubles both.
A Booster adds +50% of the base win on the player's FIRST game (win only), then is
consumed. Booster does not stack with the racket.
"""

from types import SimpleNamespace

from app.fantasy import (
    BOOSTER_BONUS_AMOUNT,
    LOSS_PENALTY,
    RACKET_MULTIPLIER,
    WIN_REWARD,
    clamp0,
    sell_value,
    slot_match_delta,
)


def slot(member_id, has_racket=False, booster_active=False):
    return SimpleNamespace(
        member_id=member_id, has_racket=has_racket, booster_active=booster_active
    )


def game(a, b, member_a=None, member_b=None):
    return SimpleNamespace(
        team_a_score=a, team_b_score=b, member_a_id=member_a, member_b_id=member_b
    )


# --- base win/loss ---------------------------------------------------------------

def test_win_earns_reward():
    delta, consumed = slot_match_delta(slot(1), [game(11, 5, member_a=1, member_b=2)])
    assert delta == WIN_REWARD
    assert consumed is False


def test_loss_costs_penalty():
    delta, _ = slot_match_delta(slot(1), [game(5, 11, member_a=1, member_b=2)])
    assert delta == -LOSS_PENALTY


def test_side_b_win_counts():
    delta, _ = slot_match_delta(slot(2), [game(5, 11, member_a=1, member_b=2)])
    assert delta == WIN_REWARD


def test_player_not_in_match_earns_nothing():
    delta, consumed = slot_match_delta(slot(99), [game(11, 5, member_a=1, member_b=2)])
    assert delta == 0 and consumed is False


def test_multiple_games_sum():
    games = [
        game(11, 5, member_a=1, member_b=2),  # win
        game(9, 11, member_a=1, member_b=2),  # loss
    ]
    delta, _ = slot_match_delta(slot(1), games)
    assert delta == WIN_REWARD - LOSS_PENALTY


# --- Golden Racket ---------------------------------------------------------------

def test_racket_doubles_win():
    delta, _ = slot_match_delta(
        slot(1, has_racket=True), [game(11, 5, member_a=1, member_b=2)]
    )
    assert delta == WIN_REWARD * RACKET_MULTIPLIER


def test_racket_doubles_loss():
    delta, _ = slot_match_delta(
        slot(1, has_racket=True), [game(5, 11, member_a=1, member_b=2)]
    )
    assert delta == -LOSS_PENALTY * RACKET_MULTIPLIER


# --- Booster ---------------------------------------------------------------------

def test_booster_adds_half_on_win_and_is_consumed():
    delta, consumed = slot_match_delta(
        slot(1, booster_active=True), [game(11, 5, member_a=1, member_b=2)]
    )
    assert delta == WIN_REWARD + BOOSTER_BONUS_AMOUNT  # 7,500,000
    assert consumed is True


def test_booster_gives_no_bonus_on_loss_but_is_consumed():
    delta, consumed = slot_match_delta(
        slot(1, booster_active=True), [game(5, 11, member_a=1, member_b=2)]
    )
    assert delta == -LOSS_PENALTY
    assert consumed is True


def test_booster_applies_to_first_game_only():
    games = [
        game(11, 5, member_a=1, member_b=2),  # win (boosted)
        game(11, 9, member_a=1, member_b=2),  # win (not boosted)
    ]
    delta, consumed = slot_match_delta(slot(1, booster_active=True), games)
    assert delta == (WIN_REWARD + BOOSTER_BONUS_AMOUNT) + WIN_REWARD
    assert consumed is True


def test_booster_does_not_stack_with_racket():
    delta, consumed = slot_match_delta(
        slot(1, has_racket=True, booster_active=True),
        [game(11, 5, member_a=1, member_b=2)],
    )
    # Racket amount only (10,000,000), no +50% booster bonus, but still consumed.
    assert delta == WIN_REWARD * RACKET_MULTIPLIER
    assert consumed is True


# --- helpers ---------------------------------------------------------------------

def test_clamp0_floors_at_zero():
    assert clamp0(-5) == 0
    assert clamp0(0) == 0
    assert clamp0(7) == 7


def test_sell_value_is_85_percent_rounded_down():
    assert sell_value(20_000_000) == 17_000_000
    assert sell_value(1) == 0  # floor(0.85)
    assert sell_value(10) == 8  # floor(8.5)
