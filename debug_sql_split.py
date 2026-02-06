import sys
from pathlib import Path

# Add backend/alembic directory to path to import sql_utils
sys.path.append(str(Path(__file__).parent / "backend" / "alembic"))
from sql_utils import split_sql_statements

sql = """
CREATE FUNCTION public.update_lot_master_aggregates() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
    $$;

SET default_tablespace = '';
"""

statements = split_sql_statements(sql)
print(f"Number of statements: {len(statements)}")
for i, s in enumerate(statements):
    print(f"--- Statement {i} ---")
    print(s)
    print("--------------------")
