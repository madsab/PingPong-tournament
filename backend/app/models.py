"""Database tables for the tournament.

Only what F1 (team standings) needs: teams, their members, matches between two
teams, and the individual games that make up a match. See data-model.md.
"""

from __future__ import annotations

import enum

from sqlalchemy import CheckConstraint, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class MatchStatus(str, enum.Enum):
    """A match is either waiting to be played or finished."""

    scheduled = "scheduled"
    completed = "completed"


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    # Path/URL to the team logo. Null → the frontend shows an initials placeholder.
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    members: Mapped[list[Member]] = relationship(
        back_populates="team", cascade="all, delete-orphan"
    )


class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"))

    team: Mapped[Team] = relationship(back_populates="members")


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (
        CheckConstraint("team_a_id != team_b_id", name="match_teams_differ"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    team_a_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"))
    team_b_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"))
    status: Mapped[MatchStatus] = mapped_column(
        Enum(MatchStatus, name="match_status"),
        default=MatchStatus.scheduled,
        nullable=False,
    )

    team_a: Mapped[Team] = relationship(foreign_keys=[team_a_id])
    team_b: Mapped[Team] = relationship(foreign_keys=[team_b_id])
    games: Mapped[list[Game]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )


class Game(Base):
    __tablename__ = "games"
    __table_args__ = (
        # F13 / §3.3: scores are whole numbers >= 0 and a game always has a winner.
        CheckConstraint("team_a_score >= 0", name="game_a_score_non_negative"),
        CheckConstraint("team_b_score >= 0", name="game_b_score_non_negative"),
        CheckConstraint("team_a_score != team_b_score", name="game_has_a_winner"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id", ondelete="CASCADE"))
    team_a_score: Mapped[int] = mapped_column(nullable=False)
    team_b_score: Mapped[int] = mapped_column(nullable=False)

    # Who played this game (F12/§3.2). Nullable so scheduled matches and seed rows
    # stay valid; set when a result is recorded. ON DELETE SET NULL means editing a
    # roster later does NOT erase games already recorded for completed matches (§3.1).
    member_a_id: Mapped[int | None] = mapped_column(
        ForeignKey("members.id", ondelete="SET NULL"), nullable=True
    )
    member_b_id: Mapped[int | None] = mapped_column(
        ForeignKey("members.id", ondelete="SET NULL"), nullable=True
    )

    match: Mapped[Match] = relationship(back_populates="games")
