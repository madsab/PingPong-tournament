"""Response shapes for the public API (see contracts/standings.md).

These are what the frontend receives as JSON. They are separate from the ORM models
so the API shape and the database shape can change independently.
"""

from pydantic import BaseModel, field_validator


class StandingsEntryOut(BaseModel):
    rank: int
    team_id: int
    team_name: str
    logo_url: str | None
    points: int
    point_difference: int
    played: int
    wins: int
    draws: int
    losses: int


class StandingsResponse(BaseModel):
    teams: list[StandingsEntryOut]


# --- Public leaderboard + match shapes (see contracts/public-views.md) ------------
# Separate from the admin shapes below: these resolve player/team names for visitors,
# where the admin shapes expose ids only.


class LeaderboardEntryOut(BaseModel):
    rank: int
    member_id: int
    member_name: str
    team_name: str | None
    team_logo_url: str | None
    played: int
    won: int
    lost: int
    win_pct: float
    point_difference: int


class LeaderboardResponse(BaseModel):
    entries: list[LeaderboardEntryOut]


class PublicTeamRef(BaseModel):
    id: int
    name: str
    logo_url: str | None


class PublicGameOut(BaseModel):
    member_a_id: int | None
    member_a_name: str | None
    member_b_id: int | None
    member_b_name: str | None
    team_a_score: int
    team_b_score: int


class PublicMatchResult(BaseModel):
    winner: str  # "a" | "b" | "draw"
    games_won_a: int
    games_won_b: int


class PublicMatchOut(BaseModel):
    id: int
    team_a: PublicTeamRef
    team_b: PublicTeamRef
    status: str  # "scheduled" | "completed"
    result: PublicMatchResult | None
    games: list[PublicGameOut]


class PublicMatchesResponse(BaseModel):
    matches: list[PublicMatchOut]


# --- Admin API shapes (see contracts/admin.md) -----------------------------------

class LoginRequest(BaseModel):
    password: str


class SessionOut(BaseModel):
    authenticated: bool


class LoginResponse(BaseModel):
    # The token the frontend stores and sends back as `Authorization: Bearer <token>`.
    authenticated: bool
    token: str


class MemberOut(BaseModel):
    id: int
    name: str
    team_id: int


class TeamOut(BaseModel):
    id: int
    name: str
    logo_url: str | None
    members: list[MemberOut]


class TeamsResponse(BaseModel):
    teams: list[TeamOut]


class TeamCreate(BaseModel):
    name: str
    logo_url: str | None = None


class TeamUpdate(BaseModel):
    name: str | None = None
    logo_url: str | None = None


class MemberCreate(BaseModel):
    name: str
    team_id: int


class MemberUpdate(BaseModel):
    name: str | None = None
    team_id: int | None = None


class GameOut(BaseModel):
    id: int
    member_a_id: int | None
    member_b_id: int | None
    team_a_score: int
    team_b_score: int


class MatchTeamOut(BaseModel):
    id: int
    name: str


class MatchOut(BaseModel):
    id: int
    team_a: MatchTeamOut
    team_b: MatchTeamOut
    status: str
    games: list[GameOut]


class MatchesResponse(BaseModel):
    matches: list[MatchOut]


class MatchCreate(BaseModel):
    team_a_id: int
    team_b_id: int


class MatchUpdate(BaseModel):
    team_a_id: int | None = None
    team_b_id: int | None = None


class GameInput(BaseModel):
    member_a_id: int
    member_b_id: int
    team_a_score: int
    team_b_score: int


class ResultRequest(BaseModel):
    games: list[GameInput]


class GenerateScheduleResponse(BaseModel):
    created: int
    skipped: int


# --- Fantasy Teams shapes (feature 007, see contracts/fantasy-api.md) -------------
# All validation lives here so the backend never trusts the frontend: names and
# fun-facts must be non-empty after trimming and within length limits.


def _clean_required(value: str, *, field: str, max_len: int) -> str:
    """Trim, reject empty/whitespace-only, and enforce a max length."""
    trimmed = (value or "").strip()
    if not trimmed:
        raise ValueError(f"{field} is required")
    if len(trimmed) > max_len:
        raise ValueError(f"{field} must be at most {max_len} characters")
    return trimmed


class FantasyRegisterRequest(BaseModel):
    name: str
    fun_fact: str

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        return _clean_required(v, field="name", max_len=100)

    @field_validator("fun_fact")
    @classmethod
    def _fun_fact(cls, v: str) -> str:
        return _clean_required(v, field="fun_fact", max_len=280)


class FantasyLoginRequest(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        return _clean_required(v, field="name", max_len=100)


class FantasyUserOut(BaseModel):
    id: int
    name: str
    fun_fact: str


class FantasySlotOut(BaseModel):
    slot_index: int
    member_id: int | None
    member_name: str | None
    team_id: int | None
    team_name: str | None
    team_logo_url: str | None


class FantasyTeamOut(BaseModel):
    compubucks: int
    slots: list[FantasySlotOut]  # always 4 entries, slot_index 1-4


class SlotAssignRequest(BaseModel):
    member_id: int


class PlayerOut(BaseModel):
    id: int
    name: str
    team_id: int
    team_name: str
    team_logo_url: str | None


class MembersResponse(BaseModel):
    members: list[PlayerOut]
