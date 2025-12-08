"""Add origin_type and origin_reference to lots table.

Revision ID: add_origin_type_to_lots
Revises: f3e7b6fd7de7
Create Date: 2025-12-08

This migration adds:
- origin_type: Categorizes the source of the lot (order, forecast, sample, safety_stock, adhoc)
- origin_reference: Optional reference string for traceability

Existing lots are backfilled with 'order' as their origin_type.
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "add_origin_type_to_lots"
down_revision = ("f3e7b6fd7de7", "6c8793735c3c")  # Merge multiple heads
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add origin_type and origin_reference columns to lots table."""
    # Add origin_type column with default 'order' for backfill
    op.add_column(
        "lots",
        sa.Column(
            "origin_type",
            sa.String(20),
            nullable=False,
            server_default="order",
        ),
    )

    # Add origin_reference column (nullable)
    op.add_column(
        "lots",
        sa.Column(
            "origin_reference",
            sa.String(255),
            nullable=True,
        ),
    )

    # Add check constraint for origin_type
    op.create_check_constraint(
        "chk_lots_origin_type",
        "lots",
        "origin_type IN ('order', 'forecast', 'sample', 'safety_stock', 'adhoc')",
    )

    # Add index for origin_type for faster filtering
    op.create_index("idx_lots_origin_type", "lots", ["origin_type"])


def downgrade() -> None:
    """Remove origin_type and origin_reference columns from lots table."""
    op.drop_index("idx_lots_origin_type", table_name="lots")
    op.drop_constraint("chk_lots_origin_type", "lots", type_="check")
    op.drop_column("lots", "origin_reference")
    op.drop_column("lots", "origin_type")
