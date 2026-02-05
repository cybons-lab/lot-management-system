"""add_remarks_to_v_lot_details

Include lot_receipts.remarks in v_lot_details for Excel View (Phase 9).

Revision ID: c2f9f55b2f6a
Revises: 90a78d0097ef
Create Date: 2026-02-05 10:45:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "c2f9f55b2f6a"
down_revision = "90a78d0097ef"
branch_labels = None
depends_on = None


def upgrade() -> None:
    def create_view(name: str, sql: str) -> None:
        op.execute(f"DROP VIEW IF EXISTS {name} CASCADE")
        op.execute(f"CREATE VIEW {name} AS {sql}")

    create_view(
        "v_lot_details",
        """
        SELECT
            lr.id AS lot_id,
            lm.lot_number,
            lr.supplier_item_id,
            COALESCE(p.maker_part_no, '') AS product_code,
            COALESCE(p.maker_part_no, '') AS maker_part_code,
            COALESCE(p.maker_part_no, '') AS maker_part_no,
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
            si.maker_part_no AS supplier_maker_part_no,
            ci_primary.customer_part_no AS customer_part_no,
            ci_primary.customer_id AS primary_customer_id,
            CASE
                WHEN lr.supplier_item_id IS NULL THEN 'no_supplier_item'
                WHEN ci_primary.id IS NULL THEN 'no_primary_mapping'
                ELSE 'mapped'
            END AS mapping_status,
            lr.origin_type,
            lr.origin_reference,
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
        FROM lot_receipts lr
        JOIN lot_master lm ON lr.lot_master_id = lm.id
        LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
        LEFT JOIN v_lot_active_reservations lar ON lr.id = lar.lot_id
        LEFT JOIN supplier_items p ON lr.supplier_item_id = p.id
        LEFT JOIN warehouses w ON lr.warehouse_id = w.id
        LEFT JOIN suppliers s ON lm.supplier_id = s.id
        LEFT JOIN supplier_items si ON lr.supplier_item_id = si.id
        LEFT JOIN customer_items ci_primary
            ON ci_primary.supplier_item_id = lr.supplier_item_id
        LEFT JOIN (
            SELECT wl.lot_receipt_id, SUM(wl.quantity) AS total_withdrawn
            FROM withdrawal_lines wl
            JOIN withdrawals wd ON wl.withdrawal_id = wd.id
            WHERE wd.cancelled_at IS NULL
            GROUP BY wl.lot_receipt_id
        ) wl_sum ON wl_sum.lot_receipt_id = lr.id
        LEFT JOIN user_supplier_assignments usa_primary
            ON usa_primary.supplier_id = lm.supplier_id
            AND usa_primary.is_primary = TRUE
        LEFT JOIN users u_primary
            ON u_primary.id = usa_primary.user_id
        """,
    )


def downgrade() -> None:
    def create_view(name: str, sql: str) -> None:
        op.execute(f"DROP VIEW IF EXISTS {name} CASCADE")
        op.execute(f"CREATE VIEW {name} AS {sql}")

    create_view(
        "v_lot_details",
        """
        SELECT
            lr.id AS lot_id,
            lm.lot_number,
            lr.supplier_item_id,
            COALESCE(p.maker_part_no, '') AS product_code,
            COALESCE(p.maker_part_no, '') AS maker_part_code,
            COALESCE(p.maker_part_no, '') AS maker_part_no,
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
            si.maker_part_no AS supplier_maker_part_no,
            ci_primary.customer_part_no AS customer_part_no,
            ci_primary.customer_id AS primary_customer_id,
            CASE
                WHEN lr.supplier_item_id IS NULL THEN 'no_supplier_item'
                WHEN ci_primary.id IS NULL THEN 'no_primary_mapping'
                ELSE 'mapped'
            END AS mapping_status,
            lr.origin_type,
            lr.origin_reference,
            lr.shipping_date,
            lr.cost_price,
            lr.sales_price,
            lr.tax_rate,
            usa_primary.user_id AS primary_user_id,
            u_primary.username AS primary_username,
            u_primary.display_name AS primary_user_display_name,
            CASE WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS product_deleted,
            CASE WHEN w.valid_to IS NOT NULL AND w.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS warehouse_deleted,
            CASE WHEN s.valid_to IS NOT NULL AND s.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS supplier_deleted,
            lr.created_at,
            lr.updated_at
        FROM lot_receipts lr
        JOIN lot_master lm ON lr.lot_master_id = lm.id
        LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
        LEFT JOIN v_lot_active_reservations lar ON lr.id = lar.lot_id
        LEFT JOIN supplier_items p ON lr.supplier_item_id = p.id
        LEFT JOIN warehouses w ON lr.warehouse_id = w.id
        LEFT JOIN suppliers s ON lm.supplier_id = s.id
        LEFT JOIN supplier_items si ON lr.supplier_item_id = si.id
        LEFT JOIN customer_items ci_primary
            ON ci_primary.supplier_item_id = lr.supplier_item_id
        LEFT JOIN (
            SELECT wl.lot_receipt_id, SUM(wl.quantity) AS total_withdrawn
            FROM withdrawal_lines wl
            JOIN withdrawals wd ON wl.withdrawal_id = wd.id
            WHERE wd.cancelled_at IS NULL
            GROUP BY wl.lot_receipt_id
        ) wl_sum ON wl_sum.lot_receipt_id = lr.id
        LEFT JOIN user_supplier_assignments usa_primary
            ON usa_primary.supplier_id = lm.supplier_id
            AND usa_primary.is_primary = TRUE
        LEFT JOIN users u_primary
            ON u_primary.id = usa_primary.user_id
        """,
    )
