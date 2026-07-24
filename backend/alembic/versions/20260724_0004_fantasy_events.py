"""fantasy event log (feature 009)

Adds the append-only ``fantasy_events`` table: one row per purchase/sale/win/loss
that moved a fantasy user's CompuBucks. No change to existing tables.

Idempotent, like 0001-0003: safe on a fresh DB or one that already has the table
from the old ``create_all`` startup.

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())

    if "fantasy_events" not in tables:
        op.create_table(
            "fantasy_events",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("kind", sa.String(length=16), nullable=False),
            sa.Column("member_name", sa.String(length=100), nullable=False),
            sa.Column("amount", sa.Integer(), nullable=False),
            sa.Column("match_id", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["fantasy_users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["match_id"], ["matches.id"], ondelete="SET NULL"),
        )
        op.create_index(
            "ix_fantasy_events_user_created", "fantasy_events", ["user_id", "created_at"]
        )


def downgrade() -> None:
    op.drop_index("ix_fantasy_events_user_created", table_name="fantasy_events")
    op.drop_table("fantasy_events")
