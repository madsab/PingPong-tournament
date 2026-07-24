"""Realize fantasy CompuBucks earnings when a match result is recorded (feature 008).

This is the thin database layer around the pure math in ``app.fantasy``. Game earnings
are *banked*: when the admin records (or re-records) a match result, ``settle_match``
walks every affected fantasy user, applies the win/loss/racket/booster rule to their
banked ``balance`` (floored at 0), and stores a per-(user, match) ``FantasySettlement``
so re-recording the same match reverses the old effect and re-settles without ever
double-paying.

Note on the floor: to keep the stored balance never-negative under any order of events
we clamp after both the reverse and the re-apply. This is exact for the normal flow
(record once, or re-record with no later match clamping in between) and a documented
approximation for the rare "record A, record B, then edit A" interleaving.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.events import clear_match_results, record_game_results
from app.fantasy import clamp0, slot_game_events
from app.models import FantasySettlement, FantasySlot, Member


def settle_match(db: Session, match) -> None:
    """(Re)apply this match's CompuBucks effect to every affected fantasy user.

    Call this after the match's games and ``completed_at`` are committed. Safe to call
    again for the same match (idempotent) — it reverses the previous settlement first.
    """
    if match.completed_at is None:
        return  # not completed → nothing to settle

    games = list(match.games)
    member_ids = {g.member_a_id for g in games} | {g.member_b_id for g in games}
    member_ids.discard(None)

    # Users with a current slot holding a player who featured in this match.
    slots_by_user: dict[int, list[FantasySlot]] = {}
    if member_ids:
        slots = db.scalars(
            select(FantasySlot)
            .where(FantasySlot.member_id.in_(member_ids))
            .options(selectinload(FantasySlot.user), selectinload(FantasySlot.member))
        ).all()
        for slot in slots:
            slots_by_user.setdefault(slot.user_id, []).append(slot)

    # Prior settlements for this match — their users must be revisited even if their
    # players changed (admin edited the games), so a stale effect gets reversed.
    prior = db.scalars(
        select(FantasySettlement).where(FantasySettlement.match_id == match.id)
    ).all()
    prior_by_user = {s.user_id: s for s in prior}

    for user_id in set(slots_by_user) | set(prior_by_user):
        user = None
        eligible = slots_by_user.get(user_id, [])
        if eligible:
            user = eligible[0].user
        # Reverse the previous settlement (exact effect), then delete it.
        old = prior_by_user.get(user_id)
        if old is not None:
            if user is None:
                from app.models import FantasyUser

                user = db.get(FantasyUser, user_id)
            user.balance = clamp0(user.balance - old.applied_delta)
            if old.consumed_booster_slot_index is not None:
                _restore_booster(eligible, old.consumed_booster_slot_index)
            db.delete(old)
            # Flush the delete before the fresh insert below, so the UNIQUE
            # (user_id, match_id) row is gone before we re-add it.
            db.flush()

        # Drop this match's previously-logged win/loss events for the user, so a
        # re-record rewrites them instead of piling up duplicates (feature 009).
        clear_match_results(db, user_id, match.id)

        if user is None:
            continue

        # Compute the fresh effect from the user's current eligible slots, logging one
        # win/loss event per game the player played (feature 009).
        before = user.balance
        delta = 0
        consumed_slot_index: int | None = None
        for slot in eligible:
            if not _eligible(slot, match):
                continue
            game_events, booster_consumed = slot_game_events(slot, games)
            delta += sum(e["amount"] for e in game_events)
            if game_events:
                member = slot.member or db.get(Member, slot.member_id)
                name = member.name if member else "Ukjent"
                record_game_results(db, user_id, match.id, name, game_events)
            if booster_consumed:
                slot.booster_active = False
                consumed_slot_index = slot.slot_index

        user.balance = clamp0(before + delta)
        applied = user.balance - before
        if applied != 0 or consumed_slot_index is not None:
            db.add(
                FantasySettlement(
                    user_id=user_id,
                    match_id=match.id,
                    applied_delta=applied,
                    consumed_booster_slot_index=consumed_slot_index,
                )
            )

    db.commit()


def _eligible(slot: FantasySlot, match) -> bool:
    """Only games completed AFTER the player was bought into the slot count (FR-011/14)."""
    return slot.added_at < match.completed_at


def _restore_booster(slots: list[FantasySlot], slot_index: int) -> None:
    """Put a reversed settlement's consumed Booster back, if that slot still holds a
    player (best-effort — the player may have been sold since)."""
    for slot in slots:
        if slot.slot_index == slot_index:
            slot.booster_active = True
            return
