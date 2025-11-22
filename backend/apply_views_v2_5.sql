-- ============================================================
-- ビュー再作成スクリプト（v2.5用）
-- 実行順序: 1. 既存ビュー削除 → 2. 新規ビュー作成
-- ============================================================

-- ============================================================
-- ステップ1: 既存ビューの削除（CASCADEで依存関係も削除）
-- ============================================================
DROP VIEW IF EXISTS public.v_candidate_lots_by_order_line CASCADE;
DROP VIEW IF EXISTS public.v_forecast_order_pairs CASCADE;
DROP VIEW IF EXISTS public.v_delivery_place_code_to_id CASCADE;
DROP VIEW IF EXISTS public.v_customer_code_to_id CASCADE;
DROP VIEW IF EXISTS public.v_order_line_context CASCADE;
DROP VIEW IF EXISTS public.v_lot_available_qty CASCADE;
DROP VIEW IF EXISTS public.v_customer_daily_products CASCADE;
DROP VIEW IF EXISTS public.v_lot_current_stock CASCADE;
DROP VIEW IF EXISTS public.v_product_code_to_id CASCADE;


-- ============================================================
-- ステップ2: 新規ビューの作成
-- ============================================================

-- ------------------------------------------------------------
-- 1. v_lot_current_stock
-- ------------------------------------------------------------
CREATE VIEW public.v_lot_current_stock AS
SELECT 
    l.id AS lot_id,
    l.product_id,
    l.warehouse_id,
    l.current_quantity,
    l.updated_at AS last_updated
FROM public.lots l
WHERE l.current_quantity > 0;

ALTER TABLE public.v_lot_current_stock OWNER TO admin;


-- ------------------------------------------------------------
-- 2. v_customer_daily_products
-- ------------------------------------------------------------
CREATE VIEW public.v_customer_daily_products AS
SELECT DISTINCT 
    f.customer_id,
    f.product_id
FROM public.forecast_current f
WHERE f.forecast_period IS NOT NULL;

ALTER TABLE public.v_customer_daily_products OWNER TO admin;


-- ------------------------------------------------------------
-- 3. v_lot_available_qty
-- ------------------------------------------------------------
CREATE VIEW public.v_lot_available_qty AS
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
    AND (l.current_quantity - l.allocated_quantity) > 0;

ALTER TABLE public.v_lot_available_qty OWNER TO admin;


-- ------------------------------------------------------------
-- 4. v_order_line_context
-- ------------------------------------------------------------
CREATE VIEW public.v_order_line_context AS
SELECT 
    ol.id AS order_line_id,
    o.id AS order_id,
    o.customer_id,
    ol.product_id,
    ol.delivery_place_id,
    ol.order_quantity AS quantity
FROM public.order_lines ol
JOIN public.orders o ON o.id = ol.order_id;

ALTER TABLE public.v_order_line_context OWNER TO admin;


-- ------------------------------------------------------------
-- 5. v_customer_code_to_id
-- ------------------------------------------------------------
CREATE VIEW public.v_customer_code_to_id AS
SELECT 
    c.customer_code,
    c.id AS customer_id,
    c.customer_name
FROM public.customers c;

ALTER TABLE public.v_customer_code_to_id OWNER TO admin;


-- ------------------------------------------------------------
-- 6. v_delivery_place_code_to_id
-- ------------------------------------------------------------
CREATE VIEW public.v_delivery_place_code_to_id AS
SELECT 
    d.delivery_place_code,
    d.id AS delivery_place_id,
    d.delivery_place_name
FROM public.delivery_places d;

ALTER TABLE public.v_delivery_place_code_to_id OWNER TO admin;


-- ------------------------------------------------------------
-- 7. v_forecast_order_pairs
-- ------------------------------------------------------------
CREATE VIEW public.v_forecast_order_pairs AS
SELECT DISTINCT
    f.id AS forecast_id,
    f.customer_id,
    f.product_id,
    o.id AS order_id,
    ol.delivery_place_id
FROM public.forecast_current f
JOIN public.orders o ON o.customer_id = f.customer_id
JOIN public.order_lines ol ON ol.order_id = o.id 
    AND ol.product_id = f.product_id;

ALTER TABLE public.v_forecast_order_pairs OWNER TO admin;


-- ------------------------------------------------------------
-- 8. v_product_code_to_id
-- ------------------------------------------------------------
CREATE VIEW public.v_product_code_to_id AS
SELECT 
    p.maker_part_code AS product_code,
    p.id AS product_id,
    p.product_name
FROM public.products p;

ALTER TABLE public.v_product_code_to_id OWNER TO admin;


-- ------------------------------------------------------------
-- 9. v_candidate_lots_by_order_line（依存ビュー - 最後に作成）
-- ------------------------------------------------------------
CREATE VIEW public.v_candidate_lots_by_order_line AS
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
    l.lot_id;

ALTER TABLE public.v_candidate_lots_by_order_line OWNER TO admin;


-- ============================================================
-- 完了メッセージ
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'ビューの再作成が完了しました';
    RAISE NOTICE '作成されたビュー:';
    RAISE NOTICE '  1. v_lot_current_stock';
    RAISE NOTICE '  2. v_customer_daily_products';
    RAISE NOTICE '  3. v_lot_available_qty';
    RAISE NOTICE '  4. v_order_line_context';
    RAISE NOTICE '  5. v_customer_code_to_id';
    RAISE NOTICE '  6. v_delivery_place_code_to_id';
    RAISE NOTICE '  7. v_forecast_order_pairs';
    RAISE NOTICE '  8. v_product_code_to_id';
    RAISE NOTICE '  9. v_candidate_lots_by_order_line';
    RAISE NOTICE '==============================================';
END $$;
