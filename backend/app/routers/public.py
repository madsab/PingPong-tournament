"""Public, read-only endpoints (no login, per F5)."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.leaderboard import compute_leaderboard
from app.models import Match, Member, Team
from app.schemas import (
    LeaderboardResponse,
    PublicMatchesResponse,
    PublicMatchOut,
    StandingsResponse,
)
from app.standings import compute_standings, decide_match

router = APIRouter(prefix="/api", tags=["public"])


@router.get("/health", tags=["health"])
def health() -> dict[str, str]:
    """Lightweight liveness check. No DB work so it returns instantly — used by
    the frontend keep-alive ping to stop the free-tier host spinning down."""
    return {"status": "ok"}


@router.get("/standings", response_model=StandingsResponse)
def get_standings(db: Session = Depends(get_db)) -> StandingsResponse:
    """Return every team ranked per SPECIFICATIONS §3.5, computed on read."""
    teams = db.scalars(select(Team)).all()
    # Load each match's games up front so the ranking math needs no extra queries.
    matches = db.scalars(select(Match).options(selectinload(Match.games))).all()

    ranking = compute_standings(teams, matches)
    return StandingsResponse(teams=[entry.__dict__ for entry in ranking])


@router.get("/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(db: Session = Depends(get_db)) -> LeaderboardResponse:
    """Return every player ranked per §3.6, computed on read (F2)."""
    # Eager-load each member's team (for the display name) and each match's games.
    members = db.scalars(select(Member).options(selectinload(Member.team))).all()
    matches = db.scalars(select(Match).options(selectinload(Match.games))).all()

    ranking = compute_leaderboard(members, matches)
    return LeaderboardResponse(entries=[entry.__dict__ for entry in ranking])


def _games_won(match) -> tuple[int, int]:
    """Count the games each side won in a match (the score shown, e.g. 2–1)."""
    a = sum(1 for g in match.games if g.team_a_score > g.team_b_score)
    b = sum(1 for g in match.games if g.team_b_score > g.team_a_score)
    return a, b


@router.get("/matches", response_model=PublicMatchesResponse)
def get_matches(db: Session = Depends(get_db)) -> PublicMatchesResponse:
    """Every match with games, player names, status, and result (F3 + F4).

    Serves both the schedule (list) and the match detail (expanded). Ordered
    to-play first then played, stable by id within each group (Decision 6).
    """
    matches = db.scalars(
        select(Match).options(
            selectinload(Match.games),
            selectinload(Match.team_a),
            selectinload(Match.team_b),
        )
    ).all()
    # One lookup so games can show player names instead of ids (FR-006).
    name_by_id = {m.id: m.name for m in db.scalars(select(Member)).all()}

    def status_str(m) -> str:
        return str(getattr(m.status, "value", m.status))

    # To-play (scheduled) first, then played (completed); stable by id within a group.
    ordered = sorted(
        matches, key=lambda m: (0 if status_str(m) == "scheduled" else 1, m.id)
    )

    out: list[PublicMatchOut] = []
    for m in ordered:
        status = status_str(m)
        result = None
        if status == "completed":
            games_won_a, games_won_b = _games_won(m)
            result = {
                "winner": decide_match(m),
                "games_won_a": games_won_a,
                "games_won_b": games_won_b,
            }
        games = [
            {
                "member_a_id": g.member_a_id,
                "member_a_name": name_by_id.get(g.member_a_id),
                "member_b_id": g.member_b_id,
                "member_b_name": name_by_id.get(g.member_b_id),
                "team_a_score": g.team_a_score,
                "team_b_score": g.team_b_score,
            }
            for g in m.games
        ]
        out.append(
            PublicMatchOut(
                id=m.id,
                team_a={
                    "id": m.team_a.id,
                    "name": m.team_a.name,
                    "logo_url": m.team_a.logo_url,
                },
                team_b={
                    "id": m.team_b.id,
                    "name": m.team_b.name,
                    "logo_url": m.team_b.logo_url,
                },
                status=status,
                result=result,
                games=games,
            )
        )

    return PublicMatchesResponse(matches=out)
