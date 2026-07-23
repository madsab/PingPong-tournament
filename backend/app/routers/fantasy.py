"""Fantasy Ping Pong endpoints (feature 007).

A lightweight, password-free identity: the name IS the account. We reuse the same
signed session cookie as the admin area (Starlette ``SessionMiddleware``) but a
separate ``fantasy_user_id`` key, so the two logins are independent. The cookie's
default 14-day lifetime is what "remembered across visits" means here.

Registration, login, the 4-slot team, and CompuBucks all live here. CompuBucks math
is the pure ``app.fantasy`` module (computed on read, never stored).
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.fantasy import compute_compubucks
from app.models import FantasySlot, FantasyUser, Match, Member
from app.schemas import (
    FantasyLoginRequest,
    FantasyRegisterRequest,
    FantasySlotOut,
    FantasyTeamOut,
    FantasyUserOut,
    SessionOut,
    SlotAssignRequest,
)

router = APIRouter(prefix="/api/fantasy", tags=["fantasy"])

SLOT_COUNT = 4


def require_fantasy_user(
    request: Request, db: Session = Depends(get_db)
) -> FantasyUser:
    """Dependency: return the logged-in fantasy user or raise 401.

    Reads ``fantasy_user_id`` from the session cookie. Refuses if there is no
    session or the user no longer exists (e.g. the row was removed).
    """
    user_id = request.session.get("fantasy_user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not logged in"
        )
    user = db.get(FantasyUser, user_id)
    if user is None:
        request.session.pop("fantasy_user_id", None)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not logged in"
        )
    return user


def _name_key(name: str) -> str:
    """The lookup key for case/space-insensitive identity."""
    return name.strip().lower()


# --- Auth & identity (US1) -------------------------------------------------------

@router.post("/register", response_model=FantasyUserOut, status_code=201)
def register(
    body: FantasyRegisterRequest, request: Request, db: Session = Depends(get_db)
) -> FantasyUserOut:
    """Create a new fantasy account (name + required fun-fact) and log in.

    The schema already trimmed and length-checked the input. Here we only guard the
    name being taken (case/space-insensitive) and set the session.
    """
    key = _name_key(body.name)
    if db.scalar(select(FantasyUser).where(FantasyUser.name_key == key)):
        raise HTTPException(status_code=409, detail="That name is already taken")

    user = FantasyUser(name=body.name, name_key=key, fun_fact=body.fun_fact)
    db.add(user)
    db.commit()
    db.refresh(user)
    request.session["fantasy_user_id"] = user.id
    return FantasyUserOut(id=user.id, name=user.name, fun_fact=user.fun_fact)


@router.post("/login", response_model=FantasyUserOut)
def login(
    body: FantasyLoginRequest, request: Request, db: Session = Depends(get_db)
) -> FantasyUserOut:
    """Log in to an existing account by name only (no password, name is identity)."""
    user = db.scalar(
        select(FantasyUser).where(FantasyUser.name_key == _name_key(body.name))
    )
    if user is None:
        raise HTTPException(status_code=404, detail="No account with that name")
    request.session["fantasy_user_id"] = user.id
    return FantasyUserOut(id=user.id, name=user.name, fun_fact=user.fun_fact)


@router.get("/me", response_model=FantasyUserOut)
def me(user: FantasyUser = Depends(require_fantasy_user)) -> FantasyUserOut:
    """Return the currently logged-in fantasy user (used to decide login vs team)."""
    return FantasyUserOut(id=user.id, name=user.name, fun_fact=user.fun_fact)


@router.post("/logout", response_model=SessionOut)
def logout(request: Request) -> SessionOut:
    """Forget the fantasy user on this device. Safe when already logged out."""
    request.session.pop("fantasy_user_id", None)
    return SessionOut(authenticated=False)


# --- Fantasy team: 4 slots + CompuBucks (US2/US3) --------------------------------

def _validate_slot_index(slot_index: int) -> None:
    if not 1 <= slot_index <= SLOT_COUNT:
        raise HTTPException(
            status_code=422, detail=f"slot_index must be 1-{SLOT_COUNT}"
        )


def _serialize_team(db: Session, user: FantasyUser) -> FantasyTeamOut:
    """Build the always-4-slots view of a user's team plus their CompuBucks total.

    Empty slots come back with null member fields. CompuBucks is computed on read
    from the picked members' completed real games (never stored).
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
                )
            )

    matches = db.scalars(
        select(Match).options(selectinload(Match.games))
    ).all()
    total = compute_compubucks(slots, matches)
    return FantasyTeamOut(compubucks=total, slots=out_slots)


@router.get("/team", response_model=FantasyTeamOut)
def get_team(
    user: FantasyUser = Depends(require_fantasy_user), db: Session = Depends(get_db)
) -> FantasyTeamOut:
    """The current user's four slots and their CompuBucks total."""
    return _serialize_team(db, user)


@router.put("/team/slots/{slot_index}", response_model=FantasyTeamOut)
def assign_slot(
    slot_index: int,
    body: SlotAssignRequest,
    user: FantasyUser = Depends(require_fantasy_user),
    db: Session = Depends(get_db),
) -> FantasyTeamOut:
    """Put a real player into a slot (creating or replacing it)."""
    _validate_slot_index(slot_index)

    member = db.get(Member, body.member_id)
    if member is None:
        raise HTTPException(status_code=404, detail="No such player")

    # No duplicate player on the same team (checked in code for a clean message;
    # a UNIQUE constraint also guards it at the DB level).
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

    slot = db.scalar(
        select(FantasySlot).where(
            FantasySlot.user_id == user.id, FantasySlot.slot_index == slot_index
        )
    )
    if slot is None:
        slot = FantasySlot(
            user_id=user.id, slot_index=slot_index, member_id=member.id
        )
        db.add(slot)
    elif slot.member_id != member.id:
        # A different player — restart this slot's earning clock so the new player
        # only earns from games played after now.
        slot.member_id = member.id
        slot.added_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return _serialize_team(db, user)


@router.delete("/team/slots/{slot_index}", response_model=FantasyTeamOut)
def clear_slot(
    slot_index: int,
    user: FantasyUser = Depends(require_fantasy_user),
    db: Session = Depends(get_db),
) -> FantasyTeamOut:
    """Empty a slot. Idempotent — clearing an already-empty slot is fine."""
    _validate_slot_index(slot_index)
    slot = db.scalar(
        select(FantasySlot).where(
            FantasySlot.user_id == user.id, FantasySlot.slot_index == slot_index
        )
    )
    if slot is not None:
        db.delete(slot)
        db.commit()
    return _serialize_team(db, user)
