"""Phase 4: B-Plan - Data migration to lot_master and withdrawal_lines.

Data migration:
- Populate lot_master from existing lot_receipts
- Set lot_master_id on lot_receipts
- Migrate existing withdrawals to withdrawal_lines
- Make lot_master_id NOT NULL after migration

Revision ID: b4_data_migration
Revises: b3_lot_receipts_rename
Create Date: 2026-01-15
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "b4_data_migration"
down_revision = "b3_lot_receipts_rename"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ============================================================
    # 1. Populate lot_master from lot_receipts
    # ============================================================
    op.execute(
        """
        INSERT INTO lot_master (lot_number, product_id, supplier_id, first_receipt_date, latest_expiry_date, created_at)
        SELECT DISTINCT ON (lot_number, product_id)
            lot_number,
            product_id,
            supplier_id,
            MIN(received_date) OVER w AS first_receipt_date,
            MAX(expiry_date) OVER w AS latest_expiry_date,
            MIN(created_at) OVER w AS created_at
        FROM lot_receipts
        WINDOW w AS (PARTITION BY lot_number, product_id)
        ORDER BY lot_number, product_id, received_date
        ON CONFLICT (lot_number, product_id) DO NOTHING
        """
    )

    # ============================================================
    # 2. Set lot_master_id on lot_receipts
    # ============================================================
    op.execute(
        """
        UPDATE lot_receipts lr
        SET lot_master_id = lm.id
        FROM lot_master lm
        WHERE lr.lot_number = lm.lot_number 
          AND lr.product_id = lm.product_id
          AND lr.lot_master_id IS NULL
        """
    )

    # ============================================================
    # 3. Make lot_master_id NOT NULL (after data migration)
    # ============================================================
    op.alter_column(
        "lot_receipts",
        "lot_master_id",
        nullable=False,
    )

    # ============================================================
    # 4. Migrate existing withdrawals to withdrawal_lines
    # ============================================================
    op.execute(
        """
        INSERT INTO withdrawal_lines (withdrawal_id, lot_receipt_id, quantity, created_at)
        SELECT 
            id AS withdrawal_id,
            lot_id AS lot_receipt_id,
            quantity,
            created_at
        FROM withdrawals
        WHERE cancelled_at IS NULL
          AND lot_id IS NOT NULL
          AND quantity IS NOT NULL
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    # Make lot_master_id nullable again
    op.alter_column(
        "lot_receipts",
        "lot_master_id",
        nullable=True,
    )

    # Clear migrated data (withdrawal_lines will be dropped in b3 downgrade)
    op.execute("DELETE FROM withdrawal_lines")

    # Clear lot_master_id from lot_receipts
    op.execute("UPDATE lot_receipts SET lot_master_id = NULL")

    # Clear lot_master (will be dropped in b2 downgrade)
    op.execute("DELETE FROM lot_master")
