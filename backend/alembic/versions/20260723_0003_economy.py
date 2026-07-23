"""fantasy CompuBucks economy (feature 008)

Adds the paid-economy schema on top of the fantasy tables:
- ``members.price`` — CompuBucks price to buy a player (null = not pickable).
- ``fantasy_users.balance`` (starts 100,000,000) + ``boosters_available``.
- ``fantasy_slots.price_paid`` / ``has_racket`` / ``booster_active``.
- ``settings`` — one key/value row (the booster price).
- ``fantasy_settlements`` — per-(user, match) payout record for idempotent re-record.

Rollout reset: the old fantasy picks were free, but "sell for 85% of buy value"
needs a real purchase price, so this migration resets every existing fantasy user to
100,000,000 and clears their (free) slot picks. Documented in specs/008.

Idempotent, like 0001/0002: safe on a fresh DB, a pre-008 DB, or a partial-state DB.

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    def has_column(table: str, column: str) -> bool:
        return any(c["name"] == column for c in inspector.get_columns(table))

    # --- New columns on existing tables (nullable or server_default → no rewrite) ---
    if "members" in tables and not has_column("members", "price"):
        op.add_column("members", sa.Column("price", sa.Integer(), nullable=True))

    if "fantasy_users" in tables:
        if not has_column("fantasy_users", "balance"):
            op.add_column(
                "fantasy_users",
                sa.Column(
                    "balance",
                    sa.Integer(),
                    nullable=False,
                    server_default="100000000",
                ),
            )
        if not has_column("fantasy_users", "boosters_available"):
            op.add_column(
                "fantasy_users",
                sa.Column(
                    "boosters_available",
                    sa.Integer(),
                    nullable=False,
                    server_default="0",
                ),
            )

    if "fantasy_slots" in tables:
        if not has_column("fantasy_slots", "price_paid"):
            op.add_column(
                "fantasy_slots",
                sa.Column(
                    "price_paid", sa.Integer(), nullable=False, server_default="0"
                ),
            )
        if not has_column("fantasy_slots", "has_racket"):
            op.add_column(
                "fantasy_slots",
                sa.Column(
                    "has_racket",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.false(),
                ),
            )
        if not has_column("fantasy_slots", "booster_active"):
            op.add_column(
                "fantasy_slots",
                sa.Column(
                    "booster_active",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.false(),
                ),
            )

    # --- New tables ---
    if "settings" not in tables:
        op.create_table(
            "settings",
            sa.Column("key", sa.String(length=50), primary_key=True),
            sa.Column("value", sa.Integer(), nullable=False),
        )

    if "fantasy_settlements" not in tables:
        op.create_table(
            "fantasy_settlements",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("match_id", sa.Integer(), nullable=False),
            sa.Column("applied_delta", sa.Integer(), nullable=False),
            sa.Column("consumed_booster_slot_index", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(
                ["user_id"], ["fantasy_users.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(["match_id"], ["matches.id"], ondelete="CASCADE"),
            sa.UniqueConstraint(
                "user_id", "match_id", name="one_settlement_per_user_match"
            ),
        )

    # --- Rollout reset: old picks were free; the economy needs a real buy price. ---
    if "fantasy_slots" in tables:
        op.execute(sa.text("DELETE FROM fantasy_slots"))
    if "fantasy_users" in tables:
        op.execute(
            sa.text(
                "UPDATE fantasy_users SET balance = 100000000, boosters_available = 0"
            )
        )


def downgrade() -> None:
    op.drop_table("fantasy_settlements")
    op.drop_table("settings")
    op.drop_column("fantasy_slots", "booster_active")
    op.drop_column("fantasy_slots", "has_racket")
    op.drop_column("fantasy_slots", "price_paid")
    op.drop_column("fantasy_users", "boosters_available")
    op.drop_column("fantasy_users", "balance")
    op.drop_column("members", "price")
