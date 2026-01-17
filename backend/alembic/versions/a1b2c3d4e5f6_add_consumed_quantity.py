"""add consumed_quantity to lot_receipts and update views

Revision ID: a1b2c3d4e5f6
Revises: z4a5b6c7d8e9
Create Date: 2026-01-18 00:00:00.000000

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "z4a5b6c7d8e9"
branch_labels = None
depends_on = None


VIEWS_SQL = """
DROP VIEW IF EXISTS public.v_lot_available_qty CASCADE;
DROP VIEW IF EXISTS public.v_lot_details CASCADE;

CREATE VIEW public.v_lot_available_qty AS
SELECT
    lr.id AS lot_id,
    lr.product_id,
    lr.warehouse_id,
    GREATEST(
        lr.received_quantity
        - lr.consumed_quantity
        - COALESCE(la.allocated_quantity, 0)
        - lr.locked_quantity,
        0
    ) AS available_qty,
    lr.received_date AS receipt_date,
    lr.expiry_date,
    lr.status AS lot_status
FROM public.lot_receipts lr
LEFT JOIN public.v_lot_allocations la ON lr.id = la.lot_id
WHERE
    lr.status = 'active'
    AND (lr.expiry_date IS NULL OR lr.expiry_date >= CURRENT_DATE)
    AND (
        lr.received_quantity
        - lr.consumed_quantity
        - COALESCE(la.allocated_quantity, 0)
        - lr.locked_quantity
    ) > 0;

CREATE VIEW public.v_lot_details AS
SELECT
    lr.id AS lot_id,
    lm.lot_number,
    lr.product_id,
    COALESCE(p.maker_part_code, '') AS maker_part_code,
    COALESCE(p.product_name, '[削除済み製品]') AS product_name,
    lr.warehouse_id,
    COALESCE(w.warehouse_code, '') AS warehouse_code,
    COALESCE(w.warehouse_name, '[削除済み倉庫]') AS warehouse_name,
    COALESCE(w.short_name, LEFT(w.warehouse_name, 10)) AS warehouse_short_name,
    lm.supplier_id,
    COALESCE(s.supplier_code, '') AS supplier_code,
    COALESCE(s.supplier_name, '[削除済み仕入先]') AS supplier_name,
    COALESCE(s.short_name, LEFT(s.supplier_name, 10)) AS supplier_short_name,
    lr.received_date,
    lr.expiry_date,
    lr.received_quantity,
    lr.consumed_quantity AS withdrawn_quantity,
    GREATEST(lr.received_quantity - lr.consumed_quantity - lr.locked_quantity, 0)
        AS remaining_quantity,
    GREATEST(lr.received_quantity - lr.consumed_quantity - lr.locked_quantity, 0)
        AS current_quantity,
    COALESCE(la.allocated_quantity, 0) AS allocated_quantity,
    lr.locked_quantity,
    GREATEST(
        lr.received_quantity
        - lr.consumed_quantity
        - lr.locked_quantity
        - COALESCE(la.allocated_quantity, 0),
        0
    ) AS available_quantity,
    lr.unit,
    lr.status,
    lr.lock_reason,
    CASE WHEN lr.expiry_date IS NOT NULL
        THEN CAST((lr.expiry_date - CURRENT_DATE) AS INTEGER)
        ELSE NULL
    END AS days_to_expiry,
    lr.temporary_lot_key,
    lr.receipt_key,
    lr.lot_master_id,
    lr.origin_type,
    lr.origin_reference,
    lr.shipping_date,
    lr.cost_price,
    lr.sales_price,
    lr.tax_rate,
    usa_primary.user_id AS primary_user_id,
    u_primary.username AS primary_username,
    u_primary.display_name AS primary_user_display_name,
    CASE WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END
        AS product_deleted,
    CASE WHEN w.valid_to IS NOT NULL AND w.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END
        AS warehouse_deleted,
    CASE WHEN s.valid_to IS NOT NULL AND s.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END
        AS supplier_deleted,
    lr.created_at,
    lr.updated_at
FROM public.lot_receipts lr
JOIN public.lot_master lm ON lr.lot_master_id = lm.id
LEFT JOIN public.v_lot_allocations la ON lr.id = la.lot_id
LEFT JOIN public.products p ON lr.product_id = p.id
LEFT JOIN public.warehouses w ON lr.warehouse_id = w.id
LEFT JOIN public.suppliers s ON lm.supplier_id = s.id
LEFT JOIN public.user_supplier_assignments usa_primary
    ON usa_primary.supplier_id = lm.supplier_id
    AND usa_primary.is_primary = TRUE
LEFT JOIN public.users u_primary
    ON u_primary.id = usa_primary.user_id;

COMMENT ON VIEW public.v_lot_details IS
    'ロット詳細ビュー（consumed_quantityで残量算出）';
"""


DOWNGRADE_VIEWS_SQL = """
DROP VIEW IF EXISTS public.v_lot_available_qty CASCADE;
DROP VIEW IF EXISTS public.v_lot_details CASCADE;

CREATE VIEW public.v_lot_available_qty AS
SELECT
    lr.id AS lot_id,
    lr.product_id,
    lr.warehouse_id,
    GREATEST(
        lr.received_quantity
        - COALESCE(wl_sum.total_withdrawn, 0)
        - COALESCE(la.allocated_quantity, 0)
        - lr.locked_quantity,
        0
    ) AS available_qty,
    lr.received_date AS receipt_date,
    lr.expiry_date,
    lr.status AS lot_status
FROM public.lot_receipts lr
LEFT JOIN public.v_lot_allocations la ON lr.id = la.lot_id
LEFT JOIN (
    SELECT wl.lot_receipt_id, SUM(wl.quantity) AS total_withdrawn
    FROM public.withdrawal_lines wl
    JOIN public.withdrawals wd ON wl.withdrawal_id = wd.id
    WHERE wd.cancelled_at IS NULL
    GROUP BY wl.lot_receipt_id
) wl_sum ON wl_sum.lot_receipt_id = lr.id
WHERE
    lr.status = 'active'
    AND (lr.expiry_date IS NULL OR lr.expiry_date >= CURRENT_DATE)
    AND (
        lr.received_quantity
        - COALESCE(wl_sum.total_withdrawn, 0)
        - COALESCE(la.allocated_quantity, 0)
        - lr.locked_quantity
    ) > 0;

CREATE VIEW public.v_lot_details AS
SELECT
    lr.id AS lot_id,
    lm.lot_number,
    lr.product_id,
    COALESCE(p.maker_part_code, '') AS maker_part_code,
    COALESCE(p.product_name, '[削除済み製品]') AS product_name,
    lr.warehouse_id,
    COALESCE(w.warehouse_code, '') AS warehouse_code,
    COALESCE(w.warehouse_name, '[削除済み倉庫]') AS warehouse_name,
    COALESCE(w.short_name, LEFT(w.warehouse_name, 10)) AS warehouse_short_name,
    lm.supplier_id,
    COALESCE(s.supplier_code, '') AS supplier_code,
    COALESCE(s.supplier_name, '[削除済み仕入先]') AS supplier_name,
    COALESCE(s.short_name, LEFT(s.supplier_name, 10)) AS supplier_short_name,
    lr.received_date,
    lr.expiry_date,
    lr.received_quantity,
    COALESCE(wl_sum.total_withdrawn, 0) AS withdrawn_quantity,
    GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0)
        AS remaining_quantity,
    GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0)
        AS current_quantity,
    COALESCE(la.allocated_quantity, 0) AS allocated_quantity,
    lr.locked_quantity,
    GREATEST(
        lr.received_quantity
        - COALESCE(wl_sum.total_withdrawn, 0)
        - lr.locked_quantity
        - COALESCE(la.allocated_quantity, 0),
        0
    ) AS available_quantity,
    lr.unit,
    lr.status,
    lr.lock_reason,
    CASE WHEN lr.expiry_date IS NOT NULL
        THEN CAST((lr.expiry_date - CURRENT_DATE) AS INTEGER)
        ELSE NULL
    END AS days_to_expiry,
    lr.temporary_lot_key,
    lr.receipt_key,
    lr.lot_master_id,
    lr.origin_type,
    lr.origin_reference,
    lr.shipping_date,
    lr.cost_price,
    lr.sales_price,
    lr.tax_rate,
    usa_primary.user_id AS primary_user_id,
    u_primary.username AS primary_username,
    u_primary.display_name AS primary_user_display_name,
    CASE WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END
        AS product_deleted,
    CASE WHEN w.valid_to IS NOT NULL AND w.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END
        AS warehouse_deleted,
    CASE WHEN s.valid_to IS NOT NULL AND s.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END
        AS supplier_deleted,
    lr.created_at,
    lr.updated_at
FROM public.lot_receipts lr
JOIN public.lot_master lm ON lr.lot_master_id = lm.id
LEFT JOIN public.v_lot_allocations la ON lr.id = la.lot_id
LEFT JOIN public.products p ON lr.product_id = p.id
LEFT JOIN public.warehouses w ON lr.warehouse_id = w.id
LEFT JOIN public.suppliers s ON lm.supplier_id = s.id
LEFT JOIN (
    SELECT wl.lot_receipt_id, SUM(wl.quantity) AS total_withdrawn
    FROM public.withdrawal_lines wl
    JOIN public.withdrawals wd ON wl.withdrawal_id = wd.id
    WHERE wd.cancelled_at IS NULL
    GROUP BY wl.lot_receipt_id
) wl_sum ON wl_sum.lot_receipt_id = lr.id
LEFT JOIN public.user_supplier_assignments usa_primary
    ON usa_primary.supplier_id = lm.supplier_id
    AND usa_primary.is_primary = TRUE
LEFT JOIN public.users u_primary
    ON u_primary.id = usa_primary.user_id;

COMMENT ON VIEW public.v_lot_details IS
    'ロット詳細ビュー（withdrawal_linesで残量算出）';
"""


def upgrade() -> None:
    op.add_column(
        "lot_receipts",
        sa.Column(
            "consumed_quantity",
            sa.Numeric(15, 3),
            nullable=False,
            server_default="0",
            comment="消費済み数量（出庫確定分の累積）",
        ),
    )
    op.execute(
        """
        UPDATE lot_receipts lr
        SET consumed_quantity = COALESCE(wl_sum.total_withdrawn, 0)
        FROM (
            SELECT wl.lot_receipt_id, SUM(wl.quantity) AS total_withdrawn
            FROM withdrawal_lines wl
            JOIN withdrawals wd ON wl.withdrawal_id = wd.id
            WHERE wd.cancelled_at IS NULL
            GROUP BY wl.lot_receipt_id
        ) wl_sum
        WHERE lr.id = wl_sum.lot_receipt_id
        """
    )
    op.execute(VIEWS_SQL)
    op.alter_column("lot_receipts", "consumed_quantity", server_default=None)
    op.create_check_constraint(
        "chk_lot_receipts_consumed_quantity",
        "lot_receipts",
        "consumed_quantity >= 0",
    )


def downgrade() -> None:
    op.execute(DOWNGRADE_VIEWS_SQL)
    op.drop_constraint(
        "chk_lot_receipts_consumed_quantity",
        "lot_receipts",
        type_="check",
    )
    op.drop_column("lot_receipts", "consumed_quantity")
