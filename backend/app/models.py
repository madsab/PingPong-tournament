"""Database tables for the tournament.

Only what F1 (team standings) needs: teams, their members, matches between two
teams, and the individual games that make up a match. See data-model.md.
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
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
    # When the result was recorded (F13). Null while scheduled. Used by the fantasy
    # feature (007) to only credit CompuBucks for games played after a player was
    # picked. Naive UTC, to match the func.now() defaults elsewhere.
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

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


class FantasyUser(Base):
    """A person playing the fantasy game (feature 007).

    The name is the identity — there is no password (fun, low-stakes feature). We
    keep the name as typed for display and a lowercased/trimmed ``name_key`` with a
    UNIQUE constraint so "Alice" and " alice " resolve to the same account without
    relying on a database-specific case-insensitive collation.
    """

    __tablename__ = "fantasy_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    name_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    fun_fact: Mapped[str] = mapped_column(String(280), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    slots: Mapped[list[FantasySlot]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class FantasySlot(Base):
    """One filled slot on a fantasy user's team: a real Member in box 1-4.

    An empty slot is simply the absence of a row. Two unique constraints enforce the
    rules at the database level (defence behind the API validation): one player per
    box, and no duplicate player on the same team. If an admin deletes a Member, the
    slot row is removed (CASCADE) and that box goes empty.
    """

    __tablename__ = "fantasy_slots"
    __table_args__ = (
        UniqueConstraint("user_id", "slot_index", name="one_player_per_slot"),
        UniqueConstraint("user_id", "member_id", name="no_duplicate_player"),
        CheckConstraint("slot_index BETWEEN 1 AND 4", name="slot_index_1_to_4"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("fantasy_users.id", ondelete="CASCADE"), nullable=False
    )
    slot_index: Mapped[int] = mapped_column(nullable=False)
    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    # When this player was placed in the slot. CompuBucks only counts games played
    # after this moment (§scoring); swapping a player resets it (see assign_slot).
    added_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    user: Mapped[FantasyUser] = relationship(back_populates="slots")
    member: Mapped[Member] = relationship()
