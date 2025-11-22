"""add v2.5 views

Revision ID: 2025112208ac01
Revises: 121128300ac0
Create Date: 2025-11-22 08:50:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '2025112208ac01'
down_revision = '121128300ac0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create all v2.5 views"""
    
    # 1. v_lot_current_stock
    op.execute("""
        CREATE OR REPLACE VIEW public.v_lot_current_stock AS
        SELECT 
            l.id AS lot_id,
            l.product_id,
            l.warehouse_id,
            l.current_quantity,
            l.updated_at AS last_updated
        FROM public.lots l
        WHERE l.current_quantity > 0
    """)
    
    # 2. v_customer_daily_products
    op.execute("""
        CREATE OR REPLACE VIEW public.v_customer_daily_products AS
        SELECT DISTINCT 
            f.customer_id,
            f.product_id
        FROM public.forecast_current f
        WHERE f.forecast_period IS NOT NULL
    """)
    
    # 3. v_lot_available_qty
    op.execute("""
        CREATE OR REPLACE VIEW public.v_lot_available_qty AS
        SELECT 
            l.id AS lot_id,
            l.product_id,
            l.warehouse_id,
            (l.current_quantity - l.allocated_quantity) AS available_qty,
            l.received_date AS receipt_date,
            l.expiry_date,
            l.status AS lot_status
        FROM public.lots l
        WHERE 
            l.status = 'active'
            AND (l.expiry_date IS NULL OR l.expiry_date >= CURRENT_DATE)
            AND (l.current_quantity - l.allocated_quantity) > 0
    """)
    
    # 4. v_order_line_context
    op.execute("""
        CREATE OR REPLACE VIEW public.v_order_line_context AS
        SELECT 
            ol.id AS order_line_id,
            o.id AS order_id,
            o.customer_id,
            ol.product_id,
            ol.delivery_place_id,
            ol.order_quantity AS quantity
        FROM public.order_lines ol
        JOIN public.orders o ON o.id = ol.order_id
    """)
    
    # 5. v_customer_code_to_id
    op.execute("""
        CREATE OR REPLACE VIEW public.v_customer_code_to_id AS
        SELECT 
            c.customer_code,
            c.id AS customer_id,
            c.customer_name
        FROM public.customers c
    """)
    
    # 6. v_delivery_place_code_to_id
    op.execute("""
        CREATE OR REPLACE VIEW public.v_delivery_place_code_to_id AS
        SELECT 
            d.delivery_place_code,
            d.id AS delivery_place_id,
            d.delivery_place_name
        FROM public.delivery_places d
    """)
    
    # 7. v_forecast_order_pairs
    op.execute("""
        CREATE OR REPLACE VIEW public.v_forecast_order_pairs AS
        SELECT DISTINCT
            f.id AS forecast_id,
            f.customer_id,
            f.product_id,
            o.id AS order_id,
            ol.delivery_place_id
        FROM public.forecast_current f
        JOIN public.orders o ON o.customer_id = f.customer_id
        JOIN public.order_lines ol ON ol.order_id = o.id 
            AND ol.product_id = f.product_id
    """)
    
    # 8. v_product_code_to_id
    op.execute("""
        CREATE OR REPLACE VIEW public.v_product_code_to_id AS
        SELECT 
            p.maker_part_code AS product_code,
            p.id AS product_id,
            p.product_name
        FROM public.products p
    """)
    
    # 9. v_candidate_lots_by_order_line (depends on other views)
    op.execute("""
        CREATE OR REPLACE VIEW public.v_candidate_lots_by_order_line AS
        SELECT 
            c.order_line_id,
            l.lot_id,
            l.product_id,
            l.warehouse_id,
            l.available_qty,
            l.receipt_date,
            l.expiry_date
        FROM public.v_order_line_context c
        JOIN public.v_customer_daily_products f 
            ON f.customer_id = c.customer_id 
            AND f.product_id = c.product_id
        JOIN public.v_lot_available_qty l 
            ON l.product_id = c.product_id 
            AND l.available_qty > 0
        ORDER BY 
            c.order_line_id, 
            l.expiry_date, 
            l.receipt_date, 
            l.lot_id
    """)
    
    # 10. v_lot_details (new in v2.5)
    op.execute("""
        CREATE OR REPLACE VIEW public.v_lot_details AS
        SELECT 
            laq.lot_id,
            l.lot_number,
            laq.product_id,
            laq.warehouse_id,
            w.warehouse_name,
            laq.available_qty,
            laq.receipt_date,
            laq.expiry_date,
            laq.lot_status
        FROM public.v_lot_available_qty laq
        JOIN public.lots l ON l.id = laq.lot_id
        JOIN public.warehouses w ON w.id = laq.warehouse_id
    """)


def downgrade() -> None:
    """Drop all v2.5 views"""
    op.execute("DROP VIEW IF EXISTS public.v_lot_details CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_candidate_lots_by_order_line CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_product_code_to_id CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_forecast_order_pairs CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_delivery_place_code_to_id CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_customer_code_to_id CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_order_line_context CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_lot_available_qty CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_customer_daily_products CASCADE")
    op.execute("DROP VIEW IF EXISTS public.v_lot_current_stock CASCADE")
