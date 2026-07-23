"""fantasy tables + matches.completed_at

Adds the fantasy feature's schema on top of the baseline:
- ``matches.completed_at`` — when a result was recorded (used to only credit
  CompuBucks for games played after a player was picked).
- ``fantasy_users`` and ``fantasy_slots`` — the fantasy accounts and their 4 picks.

This is the migration that lets an existing database gain the new column WITHOUT a
drop-and-recreate: ``alembic upgrade head``.

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotent, like the 0001 baseline: an existing database may already have some of
    # these objects if it was originally built by the old ``create_all`` startup (which
    # creates every model table, including the fantasy ones). We only create/add what is
    # missing, so this is safe on a fresh DB, a pre-fantasy DB, and a partial-state DB
    # that has the fantasy tables but not the two newest columns.
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())

    def has_column(table: str, column: str) -> bool:
        return any(c["name"] == column for c in inspector.get_columns(table))

    # New nullable column on the existing matches table (no rewrite of data).
    if "matches" in tables and not has_column("matches", "completed_at"):
        op.add_column("matches", sa.Column("completed_at", sa.DateTime(), nullable=True))

    if "fantasy_users" not in tables:
        op.create_table(
            "fantasy_users",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("name_key", sa.String(length=100), nullable=False),
            sa.Column("fun_fact", sa.String(length=280), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.UniqueConstraint("name_key"),
        )

    if "fantasy_slots" not in tables:
        op.create_table(
            "fantasy_slots",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("slot_index", sa.Integer(), nullable=False),
            sa.Column("member_id", sa.Integer(), nullable=False),
            sa.Column(
                "added_at",
                sa.DateTime(),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["fantasy_users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["member_id"], ["members.id"], ondelete="CASCADE"),
            sa.UniqueConstraint("user_id", "slot_index", name="one_player_per_slot"),
            sa.UniqueConstraint("user_id", "member_id", name="no_duplicate_player"),
            sa.CheckConstraint("slot_index BETWEEN 1 AND 4", name="slot_index_1_to_4"),
        )
    elif not has_column("fantasy_slots", "added_at"):
        # Table pre-exists from the old create_all but predates this column.
        # server_default=now() backfills existing rows so the NOT NULL holds.
        op.add_column(
            "fantasy_slots",
            sa.Column(
                "added_at",
                sa.DateTime(),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )


def downgrade() -> None:
    op.drop_table("fantasy_slots")
    op.drop_table("fantasy_users")
    op.drop_column("matches", "completed_at")
