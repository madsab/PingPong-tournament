"""CompuBucks math for the fantasy league (feature 007).

Pure functions, like ``standings.py``/``leaderboard.py``: they take plain objects
(ORM rows or test stand-ins) and touch no database. CompuBucks is computed on read
from the real games the chosen players actually played — never stored.

Scoring rule (v1): +10 for each game a slot's player *wins*, counted only for
matches completed AFTER that player was put in the slot. Each slot has its own
clock, so swapping a player in restarts their earning window. Losses earn nothing.

Expected shapes (duck-typed):
- slot:  .member_id, .added_at (datetime the player was placed in the slot)
- match: .status, .completed_at (datetime or None), .games
- game:  .team_a_score, .team_b_score, .member_a_id, .member_b_id
"""

from __future__ import annotations

BUCKS_PER_WIN = 10


def _is_completed(match) -> bool:
    return str(getattr(match.status, "value", match.status)) == "completed"


def _member_won(game, member_id: int) -> bool:
    """True if this member played and won this game."""
    if game.member_a_id == member_id:
        return game.team_a_score > game.team_b_score
    if game.member_b_id == member_id:
        return game.team_b_score > game.team_a_score
    return False


def compute_compubucks(slots, matches) -> int:
    """Total CompuBucks across a user's slots.

    For each slot, count +10 per game its player won in matches completed after the
    player was added to that slot. A player is unique per user (enforced elsewhere),
    so iterating per slot never double-counts.
    """
    completed = [
        m
        for m in matches
        if _is_completed(m) and getattr(m, "completed_at", None) is not None
    ]

    total = 0
    for slot in slots:
        for match in completed:
            if match.completed_at <= slot.added_at:
                continue  # played before this player joined the slot
            for g in match.games:
                if _member_won(g, slot.member_id):
                    total += BUCKS_PER_WIN
    return total
