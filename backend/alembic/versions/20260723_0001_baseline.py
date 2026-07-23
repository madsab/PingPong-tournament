"""baseline: teams, members, matches, games (pre-fantasy schema)

This is the schema as it existed before the fantasy feature. It is idempotent: on a
database that already has these tables (created by the old ``create_all`` startup),
it does nothing and just records the revision, so ``alembic upgrade head`` is safe to
run on both a brand-new database and an already-deployed one — no manual stamping.

Revision ID: 0001
Revises:
Create Date: 2026-07-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotent: an existing pre-Alembic database already has these tables, so we
    # skip creation and just let Alembic record that we're now at this revision.
    inspector = sa.inspect(op.get_bind())
    if "teams" in inspector.get_table_names():
        return

    op.create_table(
        "teams",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("logo_url", sa.String(length=500), nullable=True),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "members",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "matches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("team_a_id", sa.Integer(), nullable=False),
        sa.Column("team_b_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("scheduled", "completed", name="match_status"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["team_a_id"], ["teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_b_id"], ["teams.id"], ondelete="CASCADE"),
        sa.CheckConstraint("team_a_id != team_b_id", name="match_teams_differ"),
    )
    op.create_table(
        "games",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("match_id", sa.Integer(), nullable=False),
        sa.Column("team_a_score", sa.Integer(), nullable=False),
        sa.Column("team_b_score", sa.Integer(), nullable=False),
        sa.Column("member_a_id", sa.Integer(), nullable=True),
        sa.Column("member_b_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["member_a_id"], ["members.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["member_b_id"], ["members.id"], ondelete="SET NULL"),
        sa.CheckConstraint("team_a_score >= 0", name="game_a_score_non_negative"),
        sa.CheckConstraint("team_b_score >= 0", name="game_b_score_non_negative"),
        sa.CheckConstraint("team_a_score != team_b_score", name="game_has_a_winner"),
    )


def downgrade() -> None:
    op.drop_table("games")
    op.drop_table("matches")
    op.drop_table("members")
    op.drop_table("teams")
    # Postgres keeps the ENUM type around after the table is gone; drop it too.
    sa.Enum(name="match_status").drop(op.get_bind(), checkfirst=True)
