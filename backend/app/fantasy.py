"""CompuBucks economy math for the fantasy league (feature 008).

Pure functions, like ``standings.py``/``leaderboard.py``: they take plain objects
(ORM rows or test stand-ins) and touch no database. The *balance* itself is banked on
``FantasyUser`` (feature 008 replaced the 007 compute-on-read total). What lives here is
the per-match scoring rule that ``settlement.py`` applies when the admin records a
result, plus the money constants used across the feature.

Scoring rule (per real submatch = one game a picked player played):
- win  → +5,000,000   (WIN_REWARD)
- loss → -2,000,000   (LOSS_PENALTY)
- Golden Racket on the player → both doubled (win +10,000,000, loss -4,000,000).
- Booster on the player → +50% of the base win on their FIRST game in the match, on a
  win only, then consumed. Does NOT stack with the racket.
- The balance can never go below 0 (applied by the caller via ``clamp0``).

Expected shapes (duck-typed):
- slot: .member_id, .has_racket (bool), .booster_active (bool)
- game: .team_a_score, .team_b_score, .member_a_id, .member_b_id
"""

from __future__ import annotations

# --- Money constants (single source of truth, feature 008) -----------------------
STARTING_BALANCE = 100_000_000
WIN_REWARD = 5_000_000
LOSS_PENALTY = 2_000_000
RACKET_MULTIPLIER = 2
BOOSTER_WIN_BONUS = 0.5  # of the base win, on a win only
SELL_RATE = 0.85  # sell = floor(0.85 * price_paid)
DEFAULT_BOOSTER_PRICE = 1_000_000

# The flat extra a Booster adds on a winning game (kept integer).
BOOSTER_BONUS_AMOUNT = int(WIN_REWARD * BOOSTER_WIN_BONUS)


def clamp0(balance: int) -> int:
    """The balance can never be negative (FR-013)."""
    return max(0, balance)


def sell_value(price_paid: int) -> int:
    """What selling a player returns: 85% of what was paid, rounded down (FR-008)."""
    return int(price_paid * SELL_RATE)


def _member_played(game, member_id: int) -> bool:
    return game.member_a_id == member_id or game.member_b_id == member_id


def _member_won(game, member_id: int) -> bool:
    """True if this member played and won this game."""
    if game.member_a_id == member_id:
        return game.team_a_score > game.team_b_score
    if game.member_b_id == member_id:
        return game.team_b_score > game.team_a_score
    return False


def slot_game_events(slot, games) -> tuple[list[dict], bool]:
    """Per-game win/loss amounts for one slot in one match, and whether its Booster
    was consumed (feature 009).

    Returns ``([{"won": bool, "amount": int}, ...], booster_consumed)`` — one entry
    per game the player actually played, in order, with the racket/booster effect
    already baked into ``amount``. This is the single source of truth for the money
    math: ``slot_match_delta`` is just the sum of these amounts. The caller
    (``settlement.py``) has already checked this slot's player is eligible for this
    match (bought before the match completed).
    """
    member_id = slot.member_id
    played = [g for g in games if _member_played(g, member_id)]
    if not played:
        # Player didn't feature in this match — nothing happens, Booster waits.
        return [], False

    multiplier = RACKET_MULTIPLIER if slot.has_racket else 1

    events: list[dict] = []
    for g in played:
        if _member_won(g, member_id):
            events.append({"won": True, "amount": WIN_REWARD * multiplier})
        else:
            events.append({"won": False, "amount": -LOSS_PENALTY * multiplier})

    booster_consumed = False
    if slot.booster_active:
        # The Booster applies to the player's FIRST game in this match, on a win only,
        # and does not stack with the racket (FR-021/FR-022). It is then used up.
        booster_consumed = True
        if not slot.has_racket and _member_won(played[0], member_id):
            events[0]["amount"] += BOOSTER_BONUS_AMOUNT

    return events, booster_consumed


def slot_match_delta(slot, games) -> tuple[int, bool]:
    """CompuBucks a single slot earns/loses from one match, and whether its Booster
    was consumed. The net of ``slot_game_events`` — kept so the banked-balance math
    in ``settlement.py`` is unchanged.
    """
    events, booster_consumed = slot_game_events(slot, games)
    return sum(e["amount"] for e in events), booster_consumed
