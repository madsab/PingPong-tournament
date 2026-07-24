"""Write CompuBucks events to the per-user log (feature 009).

Thin inserts/deletes over the ``FantasyEvent`` table. The amounts come from the
callers — the router for buy/sell, ``settlement.py`` for win/loss — this module only
persists them. None of these commit; the caller owns the transaction.
"""

from __future__ import annotations

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models import FantasyEvent


def record_purchase(db: Session, user_id: int, member_name: str, price: int) -> None:
    """Log buying a player (amount is negative — money spent)."""
    db.add(
        FantasyEvent(
            user_id=user_id, kind="purchase", member_name=member_name, amount=-price
        )
    )


def record_sale(db: Session, user_id: int, member_name: str, refund: int) -> None:
    """Log selling a player (amount is positive — money returned)."""
    db.add(
        FantasyEvent(
            user_id=user_id, kind="sale", member_name=member_name, amount=refund
        )
    )


def record_game_results(
    db: Session, user_id: int, match_id: int, member_name: str, game_events
) -> None:
    """Log one win/loss row per game a picked player played in a match.

    ``game_events`` is the list from ``fantasy.slot_game_events`` — each item has a
    ``won`` flag and a signed ``amount`` (already includes racket/booster).
    """
    for event in game_events:
        db.add(
            FantasyEvent(
                user_id=user_id,
                kind="win" if event["won"] else "loss",
                member_name=member_name,
                amount=event["amount"],
                match_id=match_id,
            )
        )


def clear_match_results(db: Session, user_id: int, match_id: int) -> None:
    """Delete this (user, match)'s logged win/loss events before a re-settle, so
    re-recording a result never double-counts (purchase/sale rows have no match_id
    and are untouched)."""
    db.execute(
        delete(FantasyEvent).where(
            FantasyEvent.user_id == user_id,
            FantasyEvent.match_id == match_id,
        )
    )
