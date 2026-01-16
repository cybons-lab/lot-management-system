"""Backfill stock_history INBOUND records for existing lots.

Revision ID: z4a5b6c7d8e9
Revises: y3z4a5b6c7d8
Create Date: 2026-01-15

既存のロットに対してINBOUND（入庫）レコードを作成する。
lot_service.create_lot()でStockHistory作成が追加される前に
作成されたロットには入庫履歴レコードがないため、バックフィルする。
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "z4a5b6c7d8e9"
down_revision = "y3z4a5b6c7d8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Insert INBOUND records for lots without intake history."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    source_table = "lot_receipts" if inspector.has_table("lot_receipts") else "lots"

    op.execute(
        sa.text(
            """
            INSERT INTO stock_history (
                lot_id,
                transaction_type,
                quantity_change,
                quantity_after,
                reference_type,
                transaction_date
            )
            SELECT
                lr.id,
                'inbound',
                lr.received_quantity,
                lr.received_quantity,
                'migration_backfill',
                COALESCE(lr.received_date, lr.created_at, CURRENT_TIMESTAMP)
            FROM {source_table} lr
            WHERE lr.id NOT IN (
                SELECT DISTINCT lot_id
                FROM stock_history
                WHERE transaction_type = 'inbound'
            )
            AND lr.received_quantity > 0
            """.format(source_table=source_table)
        )
    )


def downgrade() -> None:
    """Remove backfilled INBOUND records."""
    op.execute(
        """
        DELETE FROM stock_history
        WHERE reference_type = 'migration_backfill'
        AND transaction_type = 'inbound'
        """
    )
