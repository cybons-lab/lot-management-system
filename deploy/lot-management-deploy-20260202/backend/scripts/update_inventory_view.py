"""Update v_inventory_summary view to include provisional stock.

This script updates the v_inventory_summary view to add provisional_stock
(from planned inbound plans) and available_with_provisional columns.
"""

import os
import sys

from sqlalchemy import create_engine, text


# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings  # noqa: E402


def main():
    """Update the v_inventory_summary view."""
    engine = create_engine(str(settings.DATABASE_URL))

    with engine.connect() as conn:
        # Drop existing view
        print("Dropping v_inventory_summary view...")
        conn.execute(text("DROP VIEW IF EXISTS v_inventory_summary CASCADE"))
        conn.commit()

        # Recreate view with provisional stock columns
        print("Creating updated v_inventory_summary view...")
        conn.execute(
            text("""
            CREATE VIEW v_inventory_summary AS
            SELECT
                l.product_id,
                l.warehouse_id,
                SUM(l.current_quantity) AS total_quantity,
                SUM(l.allocated_quantity) AS allocated_quantity,
                (SUM(l.current_quantity) - SUM(l.allocated_quantity)) AS available_quantity,
                COALESCE(SUM(ipl.planned_quantity), 0) AS provisional_stock,
                (SUM(l.current_quantity) - SUM(l.allocated_quantity) + COALESCE(SUM(ipl.planned_quantity), 0)) AS available_with_provisional,
                MAX(l.updated_at) AS last_updated
            FROM lot_receipts l
            LEFT JOIN inbound_plan_lines ipl ON l.product_id = ipl.product_id
            LEFT JOIN inbound_plans ip ON ipl.inbound_plan_id = ip.id AND ip.status = 'planned'
            WHERE l.status = 'active'
            GROUP BY l.product_id, l.warehouse_id
        """)
        )
        conn.commit()

        # Add comment
        conn.execute(text("COMMENT ON VIEW v_inventory_summary IS '在庫集計ビュー（仮在庫含む）'"))
        conn.commit()

        print("✅ v_inventory_summary view updated successfully!")


if __name__ == "__main__":
    main()
