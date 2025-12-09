"""Add withdrawals table for manual lot withdrawal.

Revision ID: 20241209_add_withdrawals
Revises: 000000000000
Create Date: 2024-12-09
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "20241209_add_withdrawals"
down_revision = "000000000000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create withdrawals table and update stock_history constraint."""
    # Create withdrawals table
    op.create_table(
        "withdrawals",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("lot_id", sa.BigInteger(), nullable=False),
        sa.Column("quantity", sa.Numeric(15, 3), nullable=False),
        sa.Column("withdrawal_type", sa.String(20), nullable=False),
        sa.Column("customer_id", sa.BigInteger(), nullable=False),
        sa.Column("delivery_place_id", sa.BigInteger(), nullable=False),
        sa.Column("ship_date", sa.Date(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("reference_number", sa.String(100), nullable=True),
        sa.Column("withdrawn_by", sa.BigInteger(), nullable=False),
        sa.Column(
            "withdrawn_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.current_timestamp(),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.current_timestamp(),
        ),
        sa.ForeignKeyConstraint(["lot_id"], ["lots.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["delivery_place_id"], ["delivery_places.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["withdrawn_by"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "quantity > 0",
            name="chk_withdrawals_quantity",
        ),
        sa.CheckConstraint(
            "withdrawal_type IN ('order_manual','internal_use','disposal','return','sample','other')",
            name="chk_withdrawals_type",
        ),
    )

    # Create indexes
    op.create_index("idx_withdrawals_lot", "withdrawals", ["lot_id"])
    op.create_index("idx_withdrawals_customer", "withdrawals", ["customer_id"])
    op.create_index("idx_withdrawals_date", "withdrawals", ["ship_date"])
    op.create_index("idx_withdrawals_type", "withdrawals", ["withdrawal_type"])

    # Update stock_history check constraint to include 'withdrawal'
    op.drop_constraint("chk_stock_history_type", "stock_history", type_="check")
    op.create_check_constraint(
        "chk_stock_history_type",
        "stock_history",
        "transaction_type IN ('inbound','allocation','shipment','adjustment','return','withdrawal')",
    )


def downgrade() -> None:
    """Drop withdrawals table and revert stock_history constraint."""
    # Revert stock_history check constraint
    op.drop_constraint("chk_stock_history_type", "stock_history", type_="check")
    op.create_check_constraint(
        "chk_stock_history_type",
        "stock_history",
        "transaction_type IN ('inbound','allocation','shipment','adjustment','return')",
    )

    # Drop indexes and table
    op.drop_index("idx_withdrawals_type", "withdrawals")
    op.drop_index("idx_withdrawals_date", "withdrawals")
    op.drop_index("idx_withdrawals_customer", "withdrawals")
    op.drop_index("idx_withdrawals_lot", "withdrawals")
    op.drop_table("withdrawals")
