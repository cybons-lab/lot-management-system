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

    if inspector.has_table("lot_receipts"):
        source_table = "lot_receipts"
        columns = [c["name"] for c in inspector.get_columns("lot_receipts")]
        if "received_quantity" in columns:
            qty_col = "lr.received_quantity"
        else:
            print(
                "WARNING: lot_receipts table found but received_quantity column missing. Using current+locked."
            )
            qty_col = "(lr.current_quantity + lr.locked_quantity)"
    else:
        source_table = "lots"
        # lotsテーブルにはreceived_quantityがないため、現在の在庫数合計で代用
        qty_col = "(lr.current_quantity + lr.locked_quantity)"

    op.execute(
        sa.text(
            f"""
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
                {qty_col},
                {qty_col},
                'migration_backfill',
                COALESCE(lr.received_date, lr.created_at, CURRENT_TIMESTAMP)
            FROM {source_table} lr
            WHERE lr.id NOT IN (
                SELECT DISTINCT lot_id
                FROM stock_history
                WHERE transaction_type = 'inbound'
            )
            AND {qty_col} > 0
            """
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
