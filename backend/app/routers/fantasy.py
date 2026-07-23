"""Fantasy Ping Pong endpoints (feature 007).

A lightweight, password-free identity: the name IS the account. Auth is a **Bearer
token** (like the admin area), not a cookie: register/login hand back a token that
the frontend keeps in ``localStorage`` and sends in the ``Authorization`` header on
every call. A token works on any device/browser — including iOS Safari, which blocks
the cross-site cookies this used to rely on. "Remembered across visits" now means the
token staying in ``localStorage``.

Registration, login, the 4-slot team, and CompuBucks all live here. CompuBucks math
is the pure ``app.fantasy`` module (computed on read, never stored).
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth import make_fantasy_token, read_bearer_token, verify_fantasy_token
from app.db import get_db
from app.fantasy import sell_value
from app.models import FantasySlot, FantasyUser, Member
from app.schemas import (
    FantasyAuthOut,
    FantasyLoginRequest,
    FantasyRegisterRequest,
    FantasySlotOut,
    FantasyTeamOut,
    FantasyUserOut,
    SlotAssignRequest,
    SlotIndexRequest,
)
from app.settings_store import get_booster_price

router = APIRouter(prefix="/api/fantasy", tags=["fantasy"])

SLOT_COUNT = 4


def require_fantasy_user(
    request: Request, db: Session = Depends(get_db)
) -> FantasyUser:
    """Dependency: return the logged-in fantasy user or raise 401.

    Reads the Bearer token from the ``Authorization`` header. Refuses if the token
    is missing/invalid or the user no longer exists (e.g. the row was removed).
    """
    user_id = verify_fantasy_token(read_bearer_token(request))
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not logged in"
        )
    user = db.get(FantasyUser, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not logged in"
        )
    return user


def _name_key(name: str) -> str:
    """The lookup key for case/space-insensitive identity."""
    return name.strip().lower()


# --- Auth & identity (US1) -------------------------------------------------------

@router.post("/register", response_model=FantasyAuthOut, status_code=201)
def register(
    body: FantasyRegisterRequest, db: Session = Depends(get_db)
) -> FantasyAuthOut:
    """Create a new fantasy account (name + required fun-fact) and log in.

    The schema already trimmed and length-checked the input. Here we only guard the
    name being taken (case/space-insensitive) and hand back a token.
    """
    key = _name_key(body.name)
    if db.scalar(select(FantasyUser).where(FantasyUser.name_key == key)):
        raise HTTPException(status_code=409, detail="That name is already taken")

    user = FantasyUser(name=body.name, name_key=key, fun_fact=body.fun_fact)
    db.add(user)
    db.commit()
    db.refresh(user)
    return FantasyAuthOut(
        id=user.id,
        name=user.name,
        fun_fact=user.fun_fact,
        token=make_fantasy_token(user.id),
    )


@router.post("/login", response_model=FantasyAuthOut)
def login(
    body: FantasyLoginRequest, db: Session = Depends(get_db)
) -> FantasyAuthOut:
    """Log in to an existing account by name only (no password, name is identity)."""
    user = db.scalar(
        select(FantasyUser).where(FantasyUser.name_key == _name_key(body.name))
    )
    if user is None:
        raise HTTPException(status_code=404, detail="No account with that name")
    return FantasyAuthOut(
        id=user.id,
        name=user.name,
        fun_fact=user.fun_fact,
        token=make_fantasy_token(user.id),
    )


@router.get("/me", response_model=FantasyUserOut)
def me(user: FantasyUser = Depends(require_fantasy_user)) -> FantasyUserOut:
    """Return the currently logged-in fantasy user (used to decide login vs team).

    There is no server logout: logging out is the frontend dropping its stored token.
    """
    return FantasyUserOut(id=user.id, name=user.name, fun_fact=user.fun_fact)


# --- Fantasy team: 4 slots + CompuBucks (US2/US3) --------------------------------

def _validate_slot_index(slot_index: int) -> None:
    if not 1 <= slot_index <= SLOT_COUNT:
        raise HTTPException(
            status_code=422, detail=f"slot_index must be 1-{SLOT_COUNT}"
        )


def _now() -> datetime:
    """Naive UTC now, matching the timestamps stored elsewhere."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _get_slot(db: Session, user: FantasyUser, slot_index: int) -> FantasySlot | None:
    return db.scalar(
        select(FantasySlot).where(
            FantasySlot.user_id == user.id, FantasySlot.slot_index == slot_index
        )
    )


def _serialize_team(db: Session, user: FantasyUser) -> FantasyTeamOut:
    """Build the always-4-slots view of a user's team plus their banked balance.

    Empty slots come back with null member fields, price_paid 0, flags false. The
    balance is the stored, banked total (feature 008 — no longer computed on read).
    """
    slots = db.scalars(
        select(FantasySlot)
        .where(FantasySlot.user_id == user.id)
        .options(selectinload(FantasySlot.member).selectinload(Member.team))
    ).all()
    by_index = {s.slot_index: s for s in slots}

    out_slots: list[FantasySlotOut] = []
    for i in range(1, SLOT_COUNT + 1):
        slot = by_index.get(i)
        if slot is None or slot.member is None:
            out_slots.append(
                FantasySlotOut(
                    slot_index=i,
                    member_id=None,
                    member_name=None,
                    team_id=None,
                    team_name=None,
                    team_logo_url=None,
                    price_paid=0,
                    has_racket=False,
                    booster_active=False,
                )
            )
        else:
            m = slot.member
            out_slots.append(
                FantasySlotOut(
                    slot_index=i,
                    member_id=m.id,
                    member_name=m.name,
                    team_id=m.team_id,
                    team_name=m.team.name,
                    team_logo_url=m.team.logo_url,
                    price_paid=slot.price_paid,
                    has_racket=slot.has_racket,
                    booster_active=slot.booster_active,
                )
            )

    return FantasyTeamOut(
        balance=user.balance,
        boosters_available=user.boosters_available,
        booster_price=get_booster_price(db),
        slots=out_slots,
    )


@router.get("/team", response_model=FantasyTeamOut)
def get_team(
    user: FantasyUser = Depends(require_fantasy_user), db: Session = Depends(get_db)
) -> FantasyTeamOut:
    """The current user's four slots and their banked balance."""
    return _serialize_team(db, user)


# --- Buy / sell players (economy, feature 008) -----------------------------------

@router.put("/team/slots/{slot_index}", response_model=FantasyTeamOut)
def assign_slot(
    slot_index: int,
    body: SlotAssignRequest,
    user: FantasyUser = Depends(require_fantasy_user),
    db: Session = Depends(get_db),
) -> FantasyTeamOut:
    """Buy a real player into a slot (or swap the one already there).

    Buying costs the player's current price. Swapping first refunds 85% of what was
    paid for the old player, then charges the new price. A player with no price is
    not pickable. The balance can never go below 0.
    """
    _validate_slot_index(slot_index)

    member = db.get(Member, body.member_id)
    if member is None:
        raise HTTPException(status_code=404, detail="No such player")
    if member.price is None:
        raise HTTPException(
            status_code=422, detail="That player has no price yet and can't be bought"
        )

    # No duplicate player on the same team (clean message; a UNIQUE constraint also
    # guards it at the DB level).
    existing_same_member = db.scalar(
        select(FantasySlot).where(
            FantasySlot.user_id == user.id,
            FantasySlot.member_id == member.id,
            FantasySlot.slot_index != slot_index,
        )
    )
    if existing_same_member is not None:
        raise HTTPException(
            status_code=409, detail="That player is already on your team"
        )

    slot = _get_slot(db, user, slot_index)

    # If swapping, refund the old player first so the new one is affordable against
    # the refunded balance.
    refund = sell_value(slot.price_paid) if slot is not None else 0
    balance_after_refund = user.balance + refund
    if balance_after_refund < member.price:
        raise HTTPException(
            status_code=409, detail="Not enough CompuBucks to buy that player"
        )

    user.balance = balance_after_refund - member.price
    if slot is None:
        slot = FantasySlot(
            user_id=user.id,
            slot_index=slot_index,
            member_id=member.id,
            price_paid=member.price,
        )
        db.add(slot)
    else:
        # A fresh purchase resets the slot: new player, new clock, no racket/booster.
        slot.member_id = member.id
        slot.price_paid = member.price
        slot.added_at = _now()
        slot.has_racket = False
        slot.booster_active = False
    db.commit()
    return _serialize_team(db, user)


@router.delete("/team/slots/{slot_index}", response_model=FantasyTeamOut)
def clear_slot(
    slot_index: int,
    user: FantasyUser = Depends(require_fantasy_user),
    db: Session = Depends(get_db),
) -> FantasyTeamOut:
    """Sell the player in a slot: refund 85% of what was paid and empty the slot.

    Idempotent — selling an already-empty slot is a no-op with no refund.
    """
    _validate_slot_index(slot_index)
    slot = _get_slot(db, user, slot_index)
    if slot is not None:
        user.balance += sell_value(slot.price_paid)
        db.delete(slot)
        db.commit()
    return _serialize_team(db, user)


# --- Golden Ping Pong Racket (feature 008) ---------------------------------------

@router.put("/team/racket", response_model=FantasyTeamOut)
def set_racket(
    body: SlotIndexRequest,
    user: FantasyUser = Depends(require_fantasy_user),
    db: Session = Depends(get_db),
) -> FantasyTeamOut:
    """Give the Golden Racket to one filled slot, clearing it from every other."""
    _validate_slot_index(body.slot_index)
    slots = db.scalars(
        select(FantasySlot).where(FantasySlot.user_id == user.id)
    ).all()
    target = next((s for s in slots if s.slot_index == body.slot_index), None)
    if target is None:
        raise HTTPException(
            status_code=422, detail="That slot is empty — buy a player first"
        )
    for s in slots:
        s.has_racket = s.slot_index == body.slot_index
    db.commit()
    return _serialize_team(db, user)


@router.delete("/team/racket", response_model=FantasyTeamOut)
def clear_racket(
    user: FantasyUser = Depends(require_fantasy_user),
    db: Session = Depends(get_db),
) -> FantasyTeamOut:
    """Take the Golden Racket off whoever holds it (no-op if unset)."""
    for s in db.scalars(select(FantasySlot).where(FantasySlot.user_id == user.id)):
        s.has_racket = False
    db.commit()
    return _serialize_team(db, user)


# --- Booster shop (feature 008) --------------------------------------------------

def _user_has_booster(db: Session, user: FantasyUser) -> bool:
    """True if the user already holds a Booster — unplaced or placed-but-unused."""
    if user.boosters_available > 0:
        return True
    placed = db.scalar(
        select(FantasySlot).where(
            FantasySlot.user_id == user.id, FantasySlot.booster_active.is_(True)
        )
    )
    return placed is not None


@router.post("/shop/booster", response_model=FantasyTeamOut)
def buy_booster(
    user: FantasyUser = Depends(require_fantasy_user),
    db: Session = Depends(get_db),
) -> FantasyTeamOut:
    """Buy one one-time Booster from the shop (one at a time)."""
    if _user_has_booster(db, user):
        raise HTTPException(
            status_code=409, detail="You already have a Booster — use it first"
        )
    price = get_booster_price(db)
    if user.balance < price:
        raise HTTPException(
            status_code=409, detail="Not enough CompuBucks to buy a Booster"
        )
    user.balance -= price
    user.boosters_available += 1
    db.commit()
    return _serialize_team(db, user)


@router.put("/team/booster", response_model=FantasyTeamOut)
def place_booster(
    body: SlotIndexRequest,
    user: FantasyUser = Depends(require_fantasy_user),
    db: Session = Depends(get_db),
) -> FantasyTeamOut:
    """Place an available Booster on one filled slot."""
    _validate_slot_index(body.slot_index)
    if user.boosters_available < 1:
        raise HTTPException(
            status_code=409, detail="You have no Booster to place — buy one first"
        )
    slot = _get_slot(db, user, body.slot_index)
    if slot is None:
        raise HTTPException(
            status_code=422, detail="That slot is empty — buy a player first"
        )
    if slot.booster_active:
        raise HTTPException(
            status_code=409, detail="That player already has a Booster"
        )
    slot.booster_active = True
    user.boosters_available -= 1
    db.commit()
    return _serialize_team(db, user)


@router.delete("/team/booster", response_model=FantasyTeamOut)
def remove_booster(
    user: FantasyUser = Depends(require_fantasy_user),
    db: Session = Depends(get_db),
) -> FantasyTeamOut:
    """Un-place an unused Booster, returning it to the user's stock (no-op if none)."""
    placed = db.scalar(
        select(FantasySlot).where(
            FantasySlot.user_id == user.id, FantasySlot.booster_active.is_(True)
        )
    )
    if placed is not None:
        placed.booster_active = False
        user.boosters_available += 1
        db.commit()
    return _serialize_team(db, user)
