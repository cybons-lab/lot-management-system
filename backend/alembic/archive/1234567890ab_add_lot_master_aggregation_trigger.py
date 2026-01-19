"""Add lot master aggregation trigger

Revision ID: 1234567890ab
Revises: phase1_db_refactor
Create Date: 2026-01-17 09:10:00.000000

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


# revision identifiers, used by Alembic.
revision = "1234567890ab"
down_revision = "phase1_db_refactor"  # Assuming this is the latest applied migration
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add total_quantity column
    op.add_column(
        "lot_master",
        sa.Column(
            "total_quantity",
            sa.Numeric(15, 3),
            server_default="0",
            nullable=False,
            comment="合計入荷数量（受け入れ時）",
        ),
    )

    # 2. Backfill existing data (Calculate SUM(received_quantity) for each lot_master)
    op.execute("""
    UPDATE lot_master
    SET total_quantity = sub.total_qty
    FROM (
        SELECT lot_master_id, COALESCE(SUM(received_quantity), 0) as total_qty
        FROM lot_receipts
        GROUP BY lot_master_id
    ) sub
    WHERE lot_master.id = sub.lot_master_id;
    """)

    # 3. Create Trigger Function
    op.execute("""
    CREATE OR REPLACE FUNCTION update_lot_master_aggregates()
    RETURNS TRIGGER AS $$
    DECLARE
        target_lot_id BIGINT;
    BEGIN
        -- Determine affected lot_master_id
        target_lot_id := COALESCE(NEW.lot_master_id, OLD.lot_master_id);
        
        -- Calculate aggregates
        -- We calculate SUM(received_quantity) as 'total_quantity'.
        -- This represents the TOTAL amount ever received for this lot number.
        -- It does NOT reflect current inventory (withdrawals are ignored).
        WITH aggregates AS (
            SELECT
                COALESCE(SUM(received_quantity), 0) as total_qty,
                MIN(received_date) as first_recv,
                MAX(received_date) as last_recv, -- Not currently stored, but calculated for dates
                MAX(expiry_date) as max_expiry
            FROM lot_receipts
            WHERE lot_master_id = target_lot_id
        )
        UPDATE lot_master
        SET
            total_quantity = aggregates.total_qty,
            first_receipt_date = aggregates.first_recv,
            latest_expiry_date = aggregates.max_expiry,
            updated_at = CURRENT_TIMESTAMP
        FROM aggregates
        WHERE id = target_lot_id;
        
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
    """)

    # 4. Create Trigger
    op.execute("""
    CREATE TRIGGER trg_update_lot_master_aggregates
    AFTER INSERT OR UPDATE OR DELETE ON lot_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_lot_master_aggregates();
    """)


def downgrade():
    op.execute("DROP TRIGGER IF EXISTS trg_update_lot_master_aggregates ON lot_receipts")
    op.execute("DROP FUNCTION IF EXISTS update_lot_master_aggregates")
    op.drop_column("lot_master", "total_quantity")
