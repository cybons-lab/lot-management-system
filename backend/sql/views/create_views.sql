-- ============================================================
-- ビュー再作成スクリプト
-- ============================================================

-- 1. 既存ビューの削除（CASCADEで依存関係もまとめて削除）
DROP VIEW IF EXISTS public.v_candidate_lots_by_order_line CASCADE;
DROP VIEW IF EXISTS public.v_forecast_order_pairs CASCADE;
DROP VIEW IF EXISTS public.v_delivery_place_code_to_id CASCADE;
DROP VIEW IF EXISTS public.v_customer_code_to_id CASCADE;
DROP VIEW IF EXISTS public.v_order_line_context CASCADE;
DROP VIEW IF EXISTS public.v_lot_available_qty CASCADE;
DROP VIEW IF EXISTS public.v_customer_daily_products CASCADE;
DROP VIEW IF EXISTS public.v_lot_current_stock CASCADE;
DROP VIEW IF EXISTS public.v_product_code_to_id CASCADE;
DROP VIEW IF EXISTS public.v_order_line_details CASCADE;
DROP VIEW IF EXISTS public.v_inventory_summary CASCADE;
DROP VIEW IF EXISTS public.v_lot_details CASCADE;
-- 追加ビュー
DROP VIEW IF EXISTS public.v_supplier_code_to_id CASCADE;
DROP VIEW IF EXISTS public.v_warehouse_code_to_id CASCADE;
DROP VIEW IF EXISTS public.v_user_supplier_assignments CASCADE;
DROP VIEW IF EXISTS public.v_customer_item_jiku_mappings CASCADE;

-- 2. 新規ビューの作成

CREATE VIEW public.v_lot_current_stock AS
SELECT 
    l.id AS lot_id,
    l.product_id,
    l.warehouse_id,
    l.current_quantity,
    l.updated_at AS last_updated
FROM public.lots l
WHERE l.current_quantity > 0;

CREATE VIEW public.v_customer_daily_products AS
SELECT DISTINCT 
    f.customer_id,
    f.product_id
FROM public.forecast_current f
WHERE f.forecast_period IS NOT NULL;

CREATE VIEW public.v_lot_available_qty AS
SELECT 
    l.id AS lot_id,
    l.product_id,
    l.warehouse_id,
    GREATEST(l.current_quantity - l.allocated_quantity - l.locked_quantity, 0) AS available_qty,
    l.received_date AS receipt_date,
    l.expiry_date,
    l.status AS lot_status
FROM public.lots l
WHERE 
    l.status = 'active'
    AND (l.expiry_date IS NULL OR l.expiry_date >= CURRENT_DATE)
    AND (l.current_quantity - l.allocated_quantity - l.locked_quantity) > 0;

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

CREATE VIEW public.v_customer_code_to_id AS
SELECT 
    c.customer_code,
    c.id AS customer_id,
    c.customer_name
FROM public.customers c;

CREATE VIEW public.v_delivery_place_code_to_id AS
SELECT 
    d.delivery_place_code,
    d.id AS delivery_place_id,
    d.delivery_place_name
FROM public.delivery_places d;

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

CREATE VIEW public.v_product_code_to_id AS
SELECT 
    p.maker_part_code AS product_code,
    p.id AS product_id,
    p.product_name
FROM public.products p;

-- 依存ビュー
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

CREATE VIEW public.v_order_line_details AS
SELECT
    o.id AS order_id,
    o.order_date,
    o.customer_id,
    c.customer_code,
    c.customer_name,
    ol.id AS line_id,
    ol.product_id,
    ol.delivery_date,
    ol.order_quantity,
    ol.unit,
    ol.delivery_place_id,
    ol.status AS line_status,
    ol.shipping_document_text,
    p.maker_part_code AS product_code,
    p.product_name,
    p.internal_unit AS product_internal_unit,
    p.external_unit AS product_external_unit,
    p.qty_per_internal_unit AS product_qty_per_internal_unit,
    dp.delivery_place_code,
    dp.delivery_place_name,
    dp.jiku_code,
    ci.external_product_code,
    s.supplier_name,
    COALESCE(SUM(a.allocated_quantity), 0) AS allocated_quantity
FROM public.orders o
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.order_lines ol ON ol.order_id = o.id
LEFT JOIN public.products p ON ol.product_id = p.id
LEFT JOIN public.delivery_places dp ON ol.delivery_place_id = dp.id
LEFT JOIN public.customer_items ci ON ci.customer_id = o.customer_id AND ci.product_id = ol.product_id
LEFT JOIN public.suppliers s ON ci.supplier_id = s.id
LEFT JOIN public.allocations a ON a.order_line_id = ol.id
GROUP BY
    o.id, o.order_date, o.customer_id,
    c.customer_code, c.customer_name,
    ol.id, ol.product_id, ol.delivery_date, ol.order_quantity, ol.unit, ol.delivery_place_id, ol.status, ol.shipping_document_text,
    p.maker_part_code, p.product_name, p.internal_unit, p.external_unit, p.qty_per_internal_unit,
    dp.delivery_place_code, dp.delivery_place_name, dp.jiku_code,
    ci.external_product_code,
    s.supplier_name;

COMMENT ON VIEW public.v_order_line_details IS '受注明細の詳細情報ビュー';

CREATE VIEW public.v_inventory_summary AS
SELECT
    l.product_id,
    l.warehouse_id,
    SUM(l.current_quantity) AS total_quantity,
    SUM(l.allocated_quantity) AS allocated_quantity,
    SUM(l.locked_quantity) AS locked_quantity,
    GREATEST(SUM(l.current_quantity) - SUM(l.allocated_quantity) - SUM(l.locked_quantity), 0) AS available_quantity,
    COALESCE(SUM(ipl.planned_quantity), 0) AS provisional_stock,
    GREATEST(SUM(l.current_quantity) - SUM(l.allocated_quantity) - SUM(l.locked_quantity) + COALESCE(SUM(ipl.planned_quantity), 0), 0) AS available_with_provisional,
    MAX(l.updated_at) AS last_updated
FROM public.lots l
LEFT JOIN public.inbound_plan_lines ipl ON l.product_id = ipl.product_id
LEFT JOIN public.inbound_plans ip ON ipl.inbound_plan_id = ip.id AND ip.status = 'planned'
WHERE l.status = 'active'
GROUP BY l.product_id, l.warehouse_id;

COMMENT ON VIEW public.v_inventory_summary IS '在庫集計ビュー（仮在庫含む）';

CREATE VIEW public.v_lot_details AS
SELECT
    l.id AS lot_id,
    l.lot_number,
    l.product_id,
    p.maker_part_code,
    p.product_name,
    l.warehouse_id,
    w.warehouse_code,
    w.warehouse_name,
    l.supplier_id,
    s.supplier_code,
    s.supplier_name,
    l.received_date,
    l.expiry_date,
    l.current_quantity,
    l.allocated_quantity,
    l.locked_quantity,
    GREATEST(l.current_quantity - l.allocated_quantity - l.locked_quantity, 0) AS available_quantity,
    l.unit,
    l.status,
    l.lock_reason,
    CASE WHEN l.expiry_date IS NOT NULL THEN CAST((l.expiry_date - CURRENT_DATE) AS INTEGER) ELSE NULL END AS days_to_expiry,
    -- 担当者情報を追加
    usa_primary.user_id AS primary_user_id,
    u_primary.username AS primary_username,
    u_primary.display_name AS primary_user_display_name,
    l.created_at,
    l.updated_at
FROM public.lots l
LEFT JOIN public.products p ON l.product_id = p.id
LEFT JOIN public.warehouses w ON l.warehouse_id = w.id
LEFT JOIN public.suppliers s ON l.supplier_id = s.id
-- 主担当者を結合
LEFT JOIN public.user_supplier_assignments usa_primary 
    ON usa_primary.supplier_id = l.supplier_id 
    AND usa_primary.is_primary = TRUE
LEFT JOIN public.users u_primary 
    ON u_primary.id = usa_primary.user_id;

COMMENT ON VIEW public.v_lot_details IS 'ロット詳細ビュー（担当者情報含む）';

-- ============================================================
-- 追加ビュー（マスタコード変換・担当者割り当て）
-- ============================================================

-- 仕入先コードマッピング
CREATE VIEW public.v_supplier_code_to_id AS
SELECT 
    s.supplier_code,
    s.id AS supplier_id,
    s.supplier_name
FROM public.suppliers s;

COMMENT ON VIEW public.v_supplier_code_to_id IS '仕入先コード→IDマッピング';

-- 倉庫コードマッピング  
CREATE VIEW public.v_warehouse_code_to_id AS
SELECT 
    w.warehouse_code,
    w.id AS warehouse_id,
    w.warehouse_name,
    w.warehouse_type
FROM public.warehouses w;

COMMENT ON VIEW public.v_warehouse_code_to_id IS '倉庫コード→IDマッピング';

-- ユーザー-仕入先担当割り当て
CREATE VIEW public.v_user_supplier_assignments AS
SELECT
    usa.id,
    usa.user_id,
    u.username,
    u.display_name,
    usa.supplier_id,
    s.supplier_code,
    s.supplier_name,
    usa.is_primary,
    usa.assigned_at,
    usa.created_at,
    usa.updated_at
FROM public.user_supplier_assignments usa
JOIN public.users u ON usa.user_id = u.id
JOIN public.suppliers s ON usa.supplier_id = s.id;

COMMENT ON VIEW public.v_user_supplier_assignments IS 'ユーザー-仕入先担当割り当てビュー';

-- 顧客商品-次区マッピング
CREATE VIEW public.v_customer_item_jiku_mappings AS
SELECT
    cijm.id,
    cijm.customer_id,
    c.customer_code,
    c.customer_name,
    cijm.external_product_code,
    cijm.jiku_code,
    cijm.delivery_place_id,
    dp.delivery_place_code,
    dp.delivery_place_name,
    cijm.is_default,
    cijm.created_at
FROM public.customer_item_jiku_mappings cijm
JOIN public.customers c ON cijm.customer_id = c.id
JOIN public.delivery_places dp ON cijm.delivery_place_id = dp.id;

COMMENT ON VIEW public.v_customer_item_jiku_mappings IS '顧客商品-次区マッピングビュー';
