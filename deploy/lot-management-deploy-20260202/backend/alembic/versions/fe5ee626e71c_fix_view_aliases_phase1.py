"""fix view aliases phase1

Revision ID: fe5ee626e71c
Revises: 7556ff2f06c0
Create Date: 2026-02-02 16:25:31.531212

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fe5ee626e71c'
down_revision = '7556ff2f06c0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # helper for view replacement
    def create_view(name, sql):
        op.execute(f"DROP VIEW IF EXISTS {name} CASCADE")
        op.execute(f"CREATE VIEW {name} AS {sql}")

    # 1. Recreate all views with expected columns for SQLAlchemy models
    
    # v_lot_allocations
    create_view("v_lot_allocations", """
        SELECT
            lot_id,
            SUM(reserved_qty) as allocated_quantity
        FROM lot_reservations
        WHERE status = 'confirmed'
        GROUP BY lot_id
    """)

    # v_lot_active_reservations
    create_view("v_lot_active_reservations", """
        SELECT
            lot_id,
            SUM(reserved_qty) as reserved_quantity_active
        FROM lot_reservations
        WHERE status = 'active'
        GROUP BY lot_id
    """)

    # v_lot_current_stock
    create_view("v_lot_current_stock", """
        SELECT
            lr.id AS lot_id,
            lr.supplier_item_id,
            lr.warehouse_id,
            lr.received_quantity AS current_quantity,
            lr.updated_at AS last_updated
        FROM lot_receipts lr
        WHERE lr.received_quantity > 0
    """)

    # v_customer_daily_products
    create_view("v_customer_daily_products", """
        SELECT DISTINCT
            f.customer_id,
            f.supplier_item_id
        FROM forecast_current f
        WHERE f.forecast_period IS NOT NULL
    """)

    # v_order_line_context
    create_view("v_order_line_context", """
        SELECT
            ol.id AS order_line_id,
            o.id AS order_id,
            o.customer_id,
            ol.supplier_item_id,
            ol.delivery_place_id,
            ol.order_quantity AS quantity
        FROM order_lines ol
        JOIN orders o ON o.id = ol.order_id
    """)

    # v_product_code_to_id
    create_view("v_product_code_to_id", """
        SELECT
            p.maker_part_no AS product_code,
            p.maker_part_no AS maker_part_code,
            p.maker_part_no AS maker_part_no,
            p.id AS supplier_item_id,
            COALESCE(p.display_name, '[削除済み製品]') AS product_name,
            COALESCE(p.display_name, '[削除済み製品]') AS display_name,
            CASE WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS is_deleted
        FROM supplier_items p
    """)

    # v_lot_available_qty
    create_view("v_lot_available_qty", """
        SELECT 
            lr.id AS lot_id,
            lr.supplier_item_id,
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
        FROM lot_receipts lr
        LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
        LEFT JOIN (
            SELECT wl.lot_receipt_id, SUM(wl.quantity) AS total_withdrawn
            FROM withdrawal_lines wl
            JOIN withdrawals wd ON wl.withdrawal_id = wd.id
            WHERE wd.cancelled_at IS NULL
            GROUP BY wl.lot_receipt_id
        ) wl_sum ON wl_sum.lot_receipt_id = lr.id
        WHERE 
            lr.status = 'active'
            AND (lr.expiry_date IS NULL OR lr.expiry_date >= CURRENT_DATE)
            AND (lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - COALESCE(la.allocated_quantity, 0) - lr.locked_quantity) > 0
    """)

    # v_lot_receipt_stock
    create_view("v_lot_receipt_stock", """
        SELECT
            lr.id AS receipt_id,
            lm.id AS lot_master_id,
            lm.lot_number,
            lr.supplier_item_id,
            p.maker_part_no AS product_code,
            p.maker_part_no AS maker_part_code,
            p.maker_part_no AS maker_part_no,
            p.display_name AS product_name,
            p.display_name AS display_name,
            lr.warehouse_id,
            w.warehouse_code,
            w.warehouse_name,
            COALESCE(w.short_name, LEFT(w.warehouse_name, 10)) AS warehouse_short_name,
            lm.supplier_id,
            s.supplier_code,
            s.supplier_name,
            COALESCE(s.short_name, LEFT(s.supplier_name, 10)) AS supplier_short_name,
            lr.received_date,
            lr.expiry_date,
            lr.unit,
            lr.status,
            lr.received_quantity AS initial_quantity,
            COALESCE(wl_sum.total_withdrawn, 0) AS withdrawn_quantity,
            GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0) AS remaining_quantity,
            COALESCE(la.allocated_quantity, 0) AS reserved_quantity,
            COALESCE(lar.reserved_quantity_active, 0) AS reserved_quantity_active,
            GREATEST(
                lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) 
                - lr.locked_quantity - COALESCE(la.allocated_quantity, 0),
                0
            ) AS available_quantity,
            lr.locked_quantity,
            lr.lock_reason,
            lr.inspection_status,
            lr.receipt_key,
            lr.created_at,
            lr.updated_at,
            CASE 
                WHEN lr.expiry_date IS NOT NULL 
                THEN (lr.expiry_date - CURRENT_DATE)::INTEGER 
                ELSE NULL 
            END AS days_to_expiry
        FROM lot_receipts lr
        JOIN lot_master lm ON lr.lot_master_id = lm.id
        LEFT JOIN supplier_items p ON lr.supplier_item_id = p.id
        LEFT JOIN warehouses w ON lr.warehouse_id = w.id
        LEFT JOIN suppliers s ON lm.supplier_id = s.id
        LEFT JOIN (
            SELECT 
                wl.lot_receipt_id, 
                SUM(wl.quantity) AS total_withdrawn
            FROM withdrawal_lines wl
            JOIN withdrawals wd ON wl.withdrawal_id = wd.id
            WHERE wd.cancelled_at IS NULL
            GROUP BY wl.lot_receipt_id
        ) wl_sum ON wl_sum.lot_receipt_id = lr.id
        LEFT JOIN v_lot_allocations la ON lr.id = la.lot_id
        LEFT JOIN v_lot_active_reservations lar ON lr.id = lar.lot_id
        WHERE lr.status = 'active'
    """)

    # v_inventory_summary
    create_view("v_inventory_summary", """
        SELECT
          pw.supplier_item_id,
          pw.warehouse_id,
          COALESCE(agg.active_lot_count, 0) AS active_lot_count,
          COALESCE(agg.total_quantity, 0) AS total_quantity,
          COALESCE(agg.allocated_quantity, 0) AS allocated_quantity,
          COALESCE(agg.locked_quantity, 0) AS locked_quantity,
          COALESCE(agg.available_quantity, 0) AS available_quantity,
          COALESCE(agg.provisional_stock, 0) AS provisional_stock,
          COALESCE(agg.available_with_provisional, 0) AS available_with_provisional,
          COALESCE(agg.last_updated, pw.updated_at) AS last_updated,
          CASE
            WHEN COALESCE(agg.active_lot_count, 0) = 0 THEN 'no_lots'
            WHEN COALESCE(agg.available_quantity, 0) > 0 THEN 'in_stock'
            ELSE 'depleted_only'
          END AS inventory_state
        FROM product_warehouse pw
        LEFT JOIN (
          SELECT
            lrs.supplier_item_id,
            lrs.warehouse_id,
            COUNT(*) AS active_lot_count,
            SUM(lrs.remaining_quantity) AS total_quantity,
            SUM(lrs.reserved_quantity) AS allocated_quantity,
            SUM(lrs.locked_quantity) AS locked_quantity,
            SUM(lrs.available_quantity) AS available_quantity,
            COALESCE(SUM(ipl.planned_quantity), 0) AS provisional_stock,
            GREATEST(
              SUM(lrs.available_quantity) + COALESCE(SUM(ipl.planned_quantity), 0),
              0
            ) AS available_with_provisional,
            MAX(lrs.updated_at) AS last_updated
          FROM v_lot_receipt_stock lrs
          LEFT JOIN inbound_plan_lines ipl ON lrs.supplier_item_id = ipl.supplier_item_id
          LEFT JOIN inbound_plans ip ON ipl.inbound_plan_id = ip.id AND ip.status = 'planned'
          GROUP BY lrs.supplier_item_id, lrs.warehouse_id
        ) agg ON agg.supplier_item_id = pw.supplier_item_id AND agg.warehouse_id = pw.warehouse_id
        WHERE pw.is_active = true
    """)

    # v_lot_details
    create_view("v_lot_details", """
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
    """)

    # v_order_line_details
    create_view("v_order_line_details", """
        SELECT
            o.id AS order_id,
            o.order_date,
            o.customer_id,
            COALESCE(c.customer_code, '') AS customer_code,
            COALESCE(c.customer_name, '[削除済み得意先]') AS customer_name,
            ol.id AS line_id,
            ol.supplier_item_id,
            ol.delivery_date,
            ol.order_quantity,
            ol.unit,
            ol.delivery_place_id,
            ol.status AS line_status,
            ol.shipping_document_text,
            COALESCE(p.maker_part_no, '') AS product_code,
            COALESCE(p.maker_part_no, '') AS maker_part_code,
            COALESCE(p.maker_part_no, '') AS maker_part_no,
            COALESCE(p.display_name, '[削除済み製品]') AS product_name,
            COALESCE(p.display_name, '[削除済み製品]') AS display_name,
            p.internal_unit AS product_internal_unit,
            p.external_unit AS product_external_unit,
            p.qty_per_internal_unit AS product_qty_per_internal_unit,
            COALESCE(dp.delivery_place_code, '') AS delivery_place_code,
            COALESCE(dp.delivery_place_name, '[削除済み納入先]') AS delivery_place_name,
            dp.jiku_code,
            ci.customer_part_no,
            COALESCE(s.supplier_name, '[削除済み仕入先]') AS supplier_name,
            COALESCE(res_sum.allocated_qty, 0) AS allocated_quantity,
            CASE WHEN c.valid_to IS NOT NULL AND c.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS customer_deleted,
            CASE WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS product_deleted,
            CASE WHEN dp.valid_to IS NOT NULL AND dp.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS delivery_place_deleted
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN order_lines ol ON ol.order_id = o.id
        LEFT JOIN supplier_items p ON ol.supplier_item_id = p.id
        LEFT JOIN delivery_places dp ON ol.delivery_place_id = dp.id
        LEFT JOIN customer_items ci ON ci.customer_id = o.customer_id AND ci.supplier_item_id = ol.supplier_item_id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN (
            SELECT source_id, SUM(reserved_qty) as allocated_qty
            FROM lot_reservations
            WHERE source_type = 'ORDER' AND status IN ('active', 'confirmed')
            GROUP BY source_id
        ) res_sum ON res_sum.source_id = ol.id
    """)


def downgrade() -> None:
    pass
