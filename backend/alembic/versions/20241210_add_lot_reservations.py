"""Add lot_reservations table for decoupled reservation management.

Revision ID: 20241210_lot_reservations
Revises: 20241209_add_customer_item_delivery_settings
Create Date: 2025-12-10

This migration introduces the lot_reservations table as part of the
decoupling migration plan (Step 1). All lot reservations will be
managed through this table instead of directly updating Lot.allocated_quantity.
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "20241210_lot_reservations"
down_revision = "20241209_origin_adhoc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create lot_reservations table with constraints and indexes."""
    op.create_table(
        "lot_reservations",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("lot_id", sa.BigInteger(), nullable=False),
        sa.Column("source_type", sa.String(20), nullable=False),
        sa.Column("source_id", sa.BigInteger(), nullable=True),
        sa.Column("reserved_qty", sa.Numeric(15, 3), nullable=False),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.current_timestamp(),
        ),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(), nullable=True),
        sa.Column("released_at", sa.DateTime(), nullable=True),
        # Primary Key
        sa.PrimaryKeyConstraint("id"),
        # Foreign Key
        sa.ForeignKeyConstraint(
            ["lot_id"],
            ["lots.id"],
            name="fk_lot_reservations_lot_id",
            ondelete="RESTRICT",
        ),
        # Check Constraints
        sa.CheckConstraint(
            "reserved_qty > 0",
            name="chk_lot_reservations_qty_positive",
        ),
        sa.CheckConstraint(
            "source_type IN ('forecast', 'order', 'manual')",
            name="chk_lot_reservations_source_type",
        ),
        sa.CheckConstraint(
            "status IN ('temporary', 'active', 'confirmed', 'released')",
            name="chk_lot_reservations_status",
        ),
    )

    # Create indexes
    op.create_index(
        "idx_lot_reservations_lot_status",
        "lot_reservations",
        ["lot_id", "status"],
    )
    op.create_index(
        "idx_lot_reservations_source",
        "lot_reservations",
        ["source_type", "source_id"],
    )
    op.create_index(
        "idx_lot_reservations_status",
        "lot_reservations",
        ["status"],
    )
    op.create_index(
        "idx_lot_reservations_expires_at",
        "lot_reservations",
        ["expires_at"],
        postgresql_where=sa.text("expires_at IS NOT NULL"),
    )


def downgrade() -> None:
    """Drop lot_reservations table."""
    op.drop_index("idx_lot_reservations_expires_at", table_name="lot_reservations")
    op.drop_index("idx_lot_reservations_status", table_name="lot_reservations")
    op.drop_index("idx_lot_reservations_source", table_name="lot_reservations")
    op.drop_index("idx_lot_reservations_lot_status", table_name="lot_reservations")
    op.drop_table("lot_reservations")
