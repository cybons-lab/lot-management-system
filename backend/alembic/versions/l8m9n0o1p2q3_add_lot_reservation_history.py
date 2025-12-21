"""Add lot_reservation_history table for audit logging.

Revision ID: l8m9n0o1p2q3
Revises: i4j5k6l7m8n9_add_customer_id_rename_rpa_columns
Create Date: 2025-12-21
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "l8m9n0o1p2q3"
down_revision: str | None = "i4j5k6l7m8n9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "lot_reservation_history",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("reservation_id", sa.BigInteger(), nullable=False),
        sa.Column("operation", sa.String(10), nullable=False),
        # New values (for INSERT and UPDATE)
        sa.Column("lot_id", sa.BigInteger(), nullable=True),
        sa.Column("source_type", sa.String(20), nullable=True),
        sa.Column("source_id", sa.BigInteger(), nullable=True),
        sa.Column("reserved_qty", sa.Numeric(15, 3), nullable=True),
        sa.Column("status", sa.String(20), nullable=True),
        sa.Column("sap_document_no", sa.String(20), nullable=True),
        # Old values (for UPDATE and DELETE)
        sa.Column("old_lot_id", sa.BigInteger(), nullable=True),
        sa.Column("old_source_type", sa.String(20), nullable=True),
        sa.Column("old_source_id", sa.BigInteger(), nullable=True),
        sa.Column("old_reserved_qty", sa.Numeric(15, 3), nullable=True),
        sa.Column("old_status", sa.String(20), nullable=True),
        sa.Column("old_sap_document_no", sa.String(20), nullable=True),
        # Metadata
        sa.Column("changed_by", sa.String(100), nullable=True),
        sa.Column(
            "changed_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.current_timestamp(),
        ),
        sa.Column("change_reason", sa.String(255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "operation IN ('INSERT', 'UPDATE', 'DELETE')",
            name="chk_lot_reservation_history_operation",
        ),
    )

    # Create indexes
    op.create_index(
        "idx_lot_reservation_history_reservation",
        "lot_reservation_history",
        ["reservation_id"],
    )
    op.create_index(
        "idx_lot_reservation_history_lot",
        "lot_reservation_history",
        ["lot_id"],
    )
    op.create_index(
        "idx_lot_reservation_history_changed_at",
        "lot_reservation_history",
        ["changed_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_lot_reservation_history_changed_at")
    op.drop_index("idx_lot_reservation_history_lot")
    op.drop_index("idx_lot_reservation_history_reservation")
    op.drop_table("lot_reservation_history")
