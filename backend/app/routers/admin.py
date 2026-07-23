"""Admin endpoints (F6-F13): login/logout, CRUD, generate schedule, record result.

Everything here except login/logout/session requires a valid admin session — the
guard lives on ``_guarded`` below so a new endpoint can't forget it.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app import auth
from app.db import get_db
from app.models import Game, Match, MatchStatus, Member, Team
from app.schemas import (
    GenerateScheduleResponse,
    LoginRequest,
    LoginResponse,
    MatchCreate,
    MatchesResponse,
    MatchOut,
    MatchUpdate,
    MemberCreate,
    MemberOut,
    MemberUpdate,
    ResultRequest,
    SessionOut,
    TeamCreate,
    TeamOut,
    TeamsResponse,
    TeamUpdate,
)
from app.schedule import missing_pairings

router = APIRouter(prefix="/api/admin", tags=["admin"])


# --- Auth (no guard) -------------------------------------------------------------

@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest) -> LoginResponse:
    """Unlock the admin area with the shared password (F6).

    Returns a Bearer token the frontend stores and sends on every later request.
    There's no server-side session to log out of (F7) — logging out is just the
    frontend dropping the token.
    """
    if not auth.check_password(body.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong password"
        )
    return LoginResponse(authenticated=True, token=auth.make_admin_token())


@router.get("/session", response_model=SessionOut)
def session_state(request: Request) -> SessionOut:
    """Tell the frontend whether the caller's Bearer token is currently valid."""
    return SessionOut(authenticated=auth.verify_admin_token(auth._read_bearer(request)))


# --- Guarded endpoints -----------------------------------------------------------

_guarded = APIRouter(dependencies=[Depends(auth.require_admin)])


def _member_out(m: Member) -> MemberOut:
    return MemberOut(id=m.id, name=m.name, team_id=m.team_id)


def _team_out(t: Team) -> TeamOut:
    return TeamOut(
        id=t.id,
        name=t.name,
        logo_url=t.logo_url,
        members=[_member_out(m) for m in t.members],
    )


def _match_out(m: Match) -> MatchOut:
    return MatchOut.model_validate(
        {
            "id": m.id,
            "team_a": {"id": m.team_a.id, "name": m.team_a.name},
            "team_b": {"id": m.team_b.id, "name": m.team_b.name},
            "status": m.status.value,
            "games": [
                {
                    "id": g.id,
                    "member_a_id": g.member_a_id,
                    "member_b_id": g.member_b_id,
                    "team_a_score": g.team_a_score,
                    "team_b_score": g.team_b_score,
                }
                for g in m.games
            ],
        }
    )


def _get_team(db: Session, team_id: int) -> Team:
    team = db.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


# --- Teams (F8) ------------------------------------------------------------------

@_guarded.get("/teams", response_model=TeamsResponse)
def list_teams(db: Session = Depends(get_db)) -> TeamsResponse:
    teams = db.scalars(
        select(Team).options(selectinload(Team.members)).order_by(Team.name)
    ).all()
    return TeamsResponse(teams=[_team_out(t) for t in teams])


@_guarded.post("/teams", response_model=TeamOut, status_code=201)
def create_team(body: TeamCreate, db: Session = Depends(get_db)) -> TeamOut:
    team = Team(name=body.name, logo_url=body.logo_url)
    db.add(team)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A team with that name exists")
    db.refresh(team)
    return _team_out(team)


@_guarded.put("/teams/{team_id}", response_model=TeamOut)
def update_team(
    team_id: int, body: TeamUpdate, db: Session = Depends(get_db)
) -> TeamOut:
    team = _get_team(db, team_id)
    if body.name is not None:
        team.name = body.name
    if body.logo_url is not None:
        team.logo_url = body.logo_url
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A team with that name exists")
    db.refresh(team)
    return _team_out(team)


@_guarded.delete("/teams/{team_id}", status_code=204)
def delete_team(team_id: int, db: Session = Depends(get_db)) -> Response:
    team = _get_team(db, team_id)
    # Remove the team's matches too, so nothing is orphaned (FR-010). Members go
    # with the team via the ORM cascade on the relationship.
    matches = db.scalars(
        select(Match).where(
            (Match.team_a_id == team_id) | (Match.team_b_id == team_id)
        )
    ).all()
    for match in matches:
        db.delete(match)
    db.delete(team)
    db.commit()
    return Response(status_code=204)


# --- Members (F9) ----------------------------------------------------------------

@_guarded.post("/members", response_model=MemberOut, status_code=201)
def create_member(body: MemberCreate, db: Session = Depends(get_db)) -> MemberOut:
    _get_team(db, body.team_id)  # 404 if the team is missing
    member = Member(name=body.name, team_id=body.team_id)
    db.add(member)
    db.commit()
    db.refresh(member)
    return _member_out(member)


@_guarded.put("/members/{member_id}", response_model=MemberOut)
def update_member(
    member_id: int, body: MemberUpdate, db: Session = Depends(get_db)
) -> MemberOut:
    member = db.get(Member, member_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    if body.name is not None:
        member.name = body.name
    if body.team_id is not None:
        _get_team(db, body.team_id)
        member.team_id = body.team_id
    db.commit()
    db.refresh(member)
    return _member_out(member)


@_guarded.delete("/members/{member_id}", status_code=204)
def delete_member(member_id: int, db: Session = Depends(get_db)) -> Response:
    member = db.get(Member, member_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    # Keep games already recorded for completed matches, just forget who played
    # (§3.1) — don't cascade-delete the games.
    for game in db.scalars(
        select(Game).where(
            (Game.member_a_id == member_id) | (Game.member_b_id == member_id)
        )
    ).all():
        if game.member_a_id == member_id:
            game.member_a_id = None
        if game.member_b_id == member_id:
            game.member_b_id = None
    db.delete(member)
    db.commit()
    return Response(status_code=204)


# --- Matches (F10) ---------------------------------------------------------------

def _load_match(db: Session, match_id: int) -> Match:
    match = db.scalars(
        select(Match)
        .where(Match.id == match_id)
        .options(
            selectinload(Match.games),
            selectinload(Match.team_a),
            selectinload(Match.team_b),
        )
    ).first()
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@_guarded.get("/matches", response_model=MatchesResponse)
def list_matches(db: Session = Depends(get_db)) -> MatchesResponse:
    matches = db.scalars(
        select(Match).options(
            selectinload(Match.games),
            selectinload(Match.team_a),
            selectinload(Match.team_b),
        )
    ).all()
    return MatchesResponse(matches=[_match_out(m) for m in matches])


@_guarded.post("/matches", response_model=MatchOut, status_code=201)
def create_match(body: MatchCreate, db: Session = Depends(get_db)) -> MatchOut:
    if body.team_a_id == body.team_b_id:
        raise HTTPException(status_code=400, detail="A match needs two different teams")
    _get_team(db, body.team_a_id)
    _get_team(db, body.team_b_id)
    match = Match(team_a_id=body.team_a_id, team_b_id=body.team_b_id)
    db.add(match)
    db.commit()
    return _match_out(_load_match(db, match.id))


@_guarded.put("/matches/{match_id}", response_model=MatchOut)
def update_match(
    match_id: int, body: MatchUpdate, db: Session = Depends(get_db)
) -> MatchOut:
    match = _load_match(db, match_id)
    new_a = body.team_a_id if body.team_a_id is not None else match.team_a_id
    new_b = body.team_b_id if body.team_b_id is not None else match.team_b_id
    if new_a == new_b:
        raise HTTPException(status_code=400, detail="A match needs two different teams")
    if body.team_a_id is not None:
        _get_team(db, body.team_a_id)
        match.team_a_id = body.team_a_id
    if body.team_b_id is not None:
        _get_team(db, body.team_b_id)
        match.team_b_id = body.team_b_id
    db.commit()
    return _match_out(_load_match(db, match_id))


@_guarded.delete("/matches/{match_id}", status_code=204)
def delete_match(match_id: int, db: Session = Depends(get_db)) -> Response:
    match = db.get(Match, match_id)
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    db.delete(match)  # its games go via the ORM cascade
    db.commit()
    return Response(status_code=204)


# --- Generate round-robin (F11) --------------------------------------------------

@_guarded.post("/schedule/generate", response_model=GenerateScheduleResponse)
def generate_schedule(db: Session = Depends(get_db)) -> GenerateScheduleResponse:
    team_ids = list(db.scalars(select(Team.id)).all())
    existing = [
        (a, b) for a, b in db.execute(select(Match.team_a_id, Match.team_b_id)).all()
    ]
    to_create = missing_pairings(team_ids, existing)
    for a_id, b_id in to_create:
        db.add(Match(team_a_id=a_id, team_b_id=b_id))
    db.commit()
    return GenerateScheduleResponse(created=len(to_create), skipped=len(existing))


# --- Record a result (F12/F13) ---------------------------------------------------

def _validate_result(match: Match, body: ResultRequest) -> None:
    """Raise a clear HTTP error if the submitted games break §3.2/§3.3 rules."""
    a_ids = [m.id for m in match.team_a.members]
    b_ids = [m.id for m in match.team_b.members]
    size_a, size_b = len(a_ids), len(b_ids)
    expected = max(size_a, size_b)

    if expected == 0:
        raise HTTPException(
            status_code=400,
            detail="Both teams need at least one member before recording a result",
        )
    if len(body.games) != expected:
        raise HTTPException(
            status_code=422,
            detail=f"Expected {expected} games (the larger team's size), "
            f"got {len(body.games)}",
        )

    submitted_a = [g.member_a_id for g in body.games]
    submitted_b = [g.member_b_id for g in body.games]

    if any(mid not in a_ids for mid in submitted_a):
        raise HTTPException(
            status_code=422, detail="A team-A player is not on team A"
        )
    if any(mid not in b_ids for mid in submitted_b):
        raise HTTPException(
            status_code=422, detail="A team-B player is not on team B"
        )

    # The larger side (or both, if equal) plays each member exactly once. The
    # smaller side repeats members to cover the extra opponents but must still
    # field every one of its members at least once (§3.2).
    if size_a == expected and sorted(submitted_a) != sorted(a_ids):
        raise HTTPException(
            status_code=422,
            detail="Each member of team A must play exactly once",
        )
    if size_b == expected and sorted(submitted_b) != sorted(b_ids):
        raise HTTPException(
            status_code=422,
            detail="Each member of team B must play exactly once",
        )
    if set(submitted_a) != set(a_ids) or set(submitted_b) != set(b_ids):
        raise HTTPException(
            status_code=422, detail="Every member of both teams must play"
        )

    for g in body.games:
        if g.team_a_score < 0 or g.team_b_score < 0:
            raise HTTPException(status_code=422, detail="Scores cannot be negative")
        if g.team_a_score == g.team_b_score:
            raise HTTPException(
                status_code=422, detail="A game must have a winner (scores can't tie)"
            )


@_guarded.put("/matches/{match_id}/result", response_model=MatchOut)
def record_result(
    match_id: int, body: ResultRequest, db: Session = Depends(get_db)
) -> MatchOut:
    match = _load_match(db, match_id)
    _validate_result(match, body)

    # Replace the match's games and mark it completed.
    for old in list(match.games):
        db.delete(old)
    match.games = [
        Game(
            member_a_id=g.member_a_id,
            member_b_id=g.member_b_id,
            team_a_score=g.team_a_score,
            team_b_score=g.team_b_score,
        )
        for g in body.games
    ]
    match.status = MatchStatus.completed
    # Stamp when the result was recorded so the fantasy feature (007) can credit
    # CompuBucks only for games played after a player was picked. Naive UTC to match
    # the func.now() defaults used elsewhere.
    match.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return _match_out(_load_match(db, match_id))


router.include_router(_guarded)
