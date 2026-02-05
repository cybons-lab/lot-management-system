"""move_order_no_to_lot_receipts_and_unique_received_date

Revision ID: 4b1a9c7d2e10
Revises: 2d9f9a0b6b1c
Create Date: 2026-02-05 13:10:00.000000
"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "4b1a9c7d2e10"
down_revision = "2d9f9a0b6b1c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP VIEW IF EXISTS public.v_lot_details CASCADE")

    # 1) Add order_no to lot_receipts
    op.add_column(
        "lot_receipts",
        sa.Column("order_no", sa.String(length=100), nullable=True, comment="発注NO（手入力）"),
    )

    # 2) Migrate existing order_no from lot_master to lot_receipts (if any)
    op.execute(
        """
        UPDATE lot_receipts lr
        SET order_no = lm.order_no
        FROM lot_master lm
        WHERE lr.lot_master_id = lm.id
          AND lr.order_no IS NULL
          AND lm.order_no IS NOT NULL
        """
    )

    # 3) Drop order_no from lot_master (view depends on it, already dropped above)
    op.drop_column("lot_master", "order_no")

    # 4) Recreate v_lot_details (now uses lot_receipts.order_no)
    op.execute(
        """
        CREATE OR REPLACE VIEW public.v_lot_details AS
        SELECT
            lr.id AS lot_id,
            lm.lot_number,
            lr.supplier_item_id,
            COALESCE(p.maker_part_no, '') AS product_code,
            COALESCE(p.maker_part_no, '') AS maker_part_code,
            COALESCE(p.maker_part_no, '') AS maker_part_no, -- Alias for backward compatibility
            COALESCE(p.display_name, '[削除済み製品]') AS product_name,
            COALESCE(p.display_name, '[削除済み製品]') AS display_name,
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
            GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0) AS remaining_quantity,
            -- current_quantity (Compatibility alias for remaining_quantity in this view)
            GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0) AS current_quantity,
            COALESCE(la.allocated_quantity, 0) AS allocated_quantity,
            COALESCE(lar.reserved_quantity_active, 0) AS reserved_quantity_active,
            lr.locked_quantity,
            GREATEST(
                lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0)
                - lr.locked_quantity - COALESCE(la.allocated_quantity, 0),
                0
            ) AS available_quantity,
            lr.unit,
            lr.status,
            lr.lock_reason,
            lr.inspection_status,
            lr.inspection_date,
            lr.inspection_cert_number,
            CASE WHEN lr.expiry_date IS NOT NULL THEN CAST((lr.expiry_date - CURRENT_DATE) AS INTEGER) ELSE NULL END AS days_to_expiry,
            lr.temporary_lot_key,
            lr.receipt_key,
            lr.lot_master_id,
            lr.order_no,

            -- Phase2: supplier_item_id と先方品番表示
            si.maker_part_no AS supplier_maker_part_no,
            -- 先方品番表示ルール(2): デフォルト (is_primary=True)
            ci_primary.customer_part_no AS customer_part_no,
            ci_primary.customer_id AS primary_customer_id,
            -- マッピング状態フラグ
            CASE
                WHEN lr.supplier_item_id IS NULL THEN 'no_supplier_item'
                WHEN ci_primary.id IS NULL THEN 'no_primary_mapping'
                ELSE 'mapped'
            END AS mapping_status,

            -- Origin Tracking
            lr.origin_type,
            lr.origin_reference,

            -- Financial & Logistic
            lr.shipping_date,
            lr.cost_price,
            lr.sales_price,
            lr.tax_rate,
            lr.remarks,

            usa_primary.user_id AS primary_user_id,
            u_primary.username AS primary_username,
            u_primary.display_name AS primary_user_display_name,
            CASE WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS product_deleted,
            CASE WHEN w.valid_to IS NOT NULL AND w.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS warehouse_deleted,
            CASE WHEN s.valid_to IS NOT NULL AND s.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS supplier_deleted,
            lr.created_at,
            lr.updated_at
        FROM public.lot_receipts lr
        JOIN public.lot_master lm ON lr.lot_master_id = lm.id
        LEFT JOIN public.v_lot_allocations la ON lr.id = la.lot_id
        LEFT JOIN public.v_lot_active_reservations lar ON lr.id = lar.lot_id
        LEFT JOIN public.supplier_items p ON lr.supplier_item_id = p.id
        LEFT JOIN public.warehouses w ON lr.warehouse_id = w.id
        LEFT JOIN public.suppliers s ON lm.supplier_id = s.id
        LEFT JOIN public.supplier_items si ON lr.supplier_item_id = si.id
        LEFT JOIN (
            SELECT DISTINCT ON (supplier_item_id) supplier_item_id, customer_part_no, customer_id, id
            FROM public.customer_items
            ORDER BY supplier_item_id, id
        ) ci_primary ON ci_primary.supplier_item_id = lr.supplier_item_id
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

        COMMENT ON VIEW public.v_lot_details IS 'ロット詳細ビュー（担当者情報含む、soft-delete対応、仮入庫対応、Phase2 先方品番表示対応）';
        """
    )

    # 5) Enforce unique (lot_master_id, received_date)
    op.create_unique_constraint(
        "uq_lot_receipts_lot_master_received_date",
        "lot_receipts",
        ["lot_master_id", "received_date"],
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS public.v_lot_details CASCADE")

    op.drop_constraint(
        "uq_lot_receipts_lot_master_received_date",
        "lot_receipts",
        type_="unique",
    )

    op.add_column(
        "lot_master",
        sa.Column("order_no", sa.String(length=100), nullable=True, comment="発注NO（手入力）"),
    )

    op.execute(
        """
        UPDATE lot_master lm
        SET order_no = sub.order_no
        FROM (
            SELECT lot_master_id, MAX(order_no) AS order_no
            FROM lot_receipts
            WHERE order_no IS NOT NULL
            GROUP BY lot_master_id
        ) sub
        WHERE lm.id = sub.lot_master_id
        """
    )

    op.drop_column("lot_receipts", "order_no")

    op.execute(
        """
        CREATE OR REPLACE VIEW public.v_lot_details AS
        SELECT
            lr.id AS lot_id,
            lm.lot_number,
            lr.supplier_item_id,
            COALESCE(p.maker_part_no, '') AS product_code,
            COALESCE(p.maker_part_no, '') AS maker_part_code,
            COALESCE(p.maker_part_no, '') AS maker_part_no, -- Alias for backward compatibility
            COALESCE(p.display_name, '[削除済み製品]') AS product_name,
            COALESCE(p.display_name, '[削除済み製品]') AS display_name,
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
            GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0) AS remaining_quantity,
            -- current_quantity (Compatibility alias for remaining_quantity in this view)
            GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0) AS current_quantity,
            COALESCE(la.allocated_quantity, 0) AS allocated_quantity,
            COALESCE(lar.reserved_quantity_active, 0) AS reserved_quantity_active,
            lr.locked_quantity,
            GREATEST(
                lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0)
                - lr.locked_quantity - COALESCE(la.allocated_quantity, 0),
                0
            ) AS available_quantity,
            lr.unit,
            lr.status,
            lr.lock_reason,
            lr.inspection_status,
            lr.inspection_date,
            lr.inspection_cert_number,
            CASE WHEN lr.expiry_date IS NOT NULL THEN CAST((lr.expiry_date - CURRENT_DATE) AS INTEGER) ELSE NULL END AS days_to_expiry,
            lr.temporary_lot_key,
            lr.receipt_key,
            lr.lot_master_id,
            lm.order_no,

            -- Phase2: supplier_item_id と先方品番表示
            si.maker_part_no AS supplier_maker_part_no,
            -- 先方品番表示ルール(2): デフォルト (is_primary=True)
            ci_primary.customer_part_no AS customer_part_no,
            ci_primary.customer_id AS primary_customer_id,
            -- マッピング状態フラグ
            CASE
                WHEN lr.supplier_item_id IS NULL THEN 'no_supplier_item'
                WHEN ci_primary.id IS NULL THEN 'no_primary_mapping'
                ELSE 'mapped'
            END AS mapping_status,

            -- Origin Tracking
            lr.origin_type,
            lr.origin_reference,

            -- Financial & Logistic
            lr.shipping_date,
            lr.cost_price,
            lr.sales_price,
            lr.tax_rate,
            lr.remarks,

            usa_primary.user_id AS primary_user_id,
            u_primary.username AS primary_username,
            u_primary.display_name AS primary_user_display_name,
            CASE WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS product_deleted,
            CASE WHEN w.valid_to IS NOT NULL AND w.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS warehouse_deleted,
            CASE WHEN s.valid_to IS NOT NULL AND s.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS supplier_deleted,
            lr.created_at,
            lr.updated_at
        FROM public.lot_receipts lr
        JOIN public.lot_master lm ON lr.lot_master_id = lm.id
        LEFT JOIN public.v_lot_allocations la ON lr.id = la.lot_id
        LEFT JOIN public.v_lot_active_reservations lar ON lr.id = lar.lot_id
        LEFT JOIN public.supplier_items p ON lr.supplier_item_id = p.id
        LEFT JOIN public.warehouses w ON lr.warehouse_id = w.id
        LEFT JOIN public.suppliers s ON lm.supplier_id = s.id
        LEFT JOIN public.supplier_items si ON lr.supplier_item_id = si.id
        LEFT JOIN (
            SELECT DISTINCT ON (supplier_item_id) supplier_item_id, customer_part_no, customer_id, id
            FROM public.customer_items
            ORDER BY supplier_item_id, id
        ) ci_primary ON ci_primary.supplier_item_id = lr.supplier_item_id
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

        COMMENT ON VIEW public.v_lot_details IS 'ロット詳細ビュー（担当者情報含む、soft-delete対応、仮入庫対応、Phase2 先方品番表示対応）';
        """
    )
