"""backfill_supplier_item_id_and_primary

Revision ID: fcb64f0fe213
Revises: 0b86a5a7236d
Create Date: 2026-01-25 19:10:46.140277

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "fcb64f0fe213"
down_revision = "0b86a5a7236d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 0. Insert missing supplier_items
    op.execute(
        """
        INSERT INTO supplier_items (supplier_id, maker_part_no, product_id, base_unit, is_primary, valid_to, created_at, updated_at)
        SELECT DISTINCT
            lr.supplier_id,
            p.maker_part_code,
            p.id,
            'EA', -- Default base_unit
            FALSE, -- Default is_primary
            '9999-12-31'::date,
            NOW(),
            NOW()
        FROM lot_receipts lr
        JOIN products p ON lr.product_id = p.id
        WHERE lr.supplier_item_id IS NULL
          AND lr.supplier_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM supplier_items si 
              WHERE si.supplier_id = lr.supplier_id 
                AND si.maker_part_no = p.maker_part_code
          );
        """
    )

    # 1.5 Backfill customer_items.supplier_item_id
    op.execute(
        """
        UPDATE customer_items ci
        SET supplier_item_id = si.id
        FROM products p
        JOIN supplier_items si ON p.maker_part_code = si.maker_part_no
        WHERE ci.product_id = p.id
          AND ci.supplier_id = si.supplier_id
          AND ci.supplier_item_id IS NULL;
        """
    )

    # 2. Backfill customer_items.is_primary
    op.execute(
        """
        WITH RankedItems AS (
            SELECT
                id,
                supplier_item_id,
                ROW_NUMBER() OVER (PARTITION BY supplier_item_id ORDER BY id ASC) as rn
            FROM customer_items
            WHERE supplier_item_id IS NOT NULL
        )
        UPDATE customer_items ci
        SET is_primary = (ri.rn = 1)
        FROM RankedItems ri
        WHERE ci.id = ri.id;
        """
    )


def downgrade() -> None:
    # Downgrade logic is skipped to preserve data integrity
    pass
