-- ============================================================
-- ビュー再作成スクリプト (v2.3: soft-delete対応版)
-- ============================================================
-- 変更履歴:
-- v2.3: 論理削除されたマスタ参照時のNULL対応（COALESCE追加）

-- 1. 既存ビューの削除
DROP VIEW IF EXISTS public.v_candidate_lots_by_order_line CASCADE;
DROP VIEW IF EXISTS public.v_lot_available_qty CASCADE;
DROP VIEW IF EXISTS public.v_inventory_summary CASCADE;
DROP VIEW IF EXISTS public.v_lot_details CASCADE;
DROP VIEW IF EXISTS public.v_order_line_details CASCADE;

-- 2. 新規ビューの作成

-- ヘルパー: ロットごとの引当数量集計
-- NOTE: ビュー内でのCTEはパフォーマンスに影響する場合があるが、ここでは可読性優先
-- view定義内ではCTE使えない場合もあるので、LATERAL JOINなど検討したが
-- PostgreSQLならCTEで問題ない。

CREATE VIEW public.v_lot_allocations AS
SELECT 
    lot_id, 
    SUM(reserved_qty) as allocated_quantity
FROM public.lot_reservations
WHERE status = 'active'
GROUP BY lot_id;


CREATE VIEW public.v_lot_available_qty AS
SELECT 
    l.id AS lot_id,
    l.product_id,
    l.warehouse_id,
    GREATEST(l.current_quantity - COALESCE(la.allocated_quantity, 0) - l.locked_quantity, 0) AS available_qty,
    l.received_date AS receipt_date,
    l.expiry_date,
    l.status AS lot_status
FROM public.lots l
LEFT JOIN public.v_lot_allocations la ON l.id = la.lot_id
WHERE 
    l.status = 'active'
    AND (l.expiry_date IS NULL OR l.expiry_date >= CURRENT_DATE)
    AND (l.current_quantity - COALESCE(la.allocated_quantity, 0) - l.locked_quantity) > 0;


CREATE VIEW public.v_inventory_summary AS
SELECT
    l.product_id,
    l.warehouse_id,
    SUM(l.current_quantity) AS total_quantity,
    SUM(COALESCE(la.allocated_quantity, 0)) AS allocated_quantity,
    SUM(l.locked_quantity) AS locked_quantity,
    GREATEST(SUM(l.current_quantity) - SUM(COALESCE(la.allocated_quantity, 0)) - SUM(l.locked_quantity), 0) AS available_quantity,
    -- 入荷予定（仮在庫）
    COALESCE(SUM(ipl.planned_quantity), 0) AS provisional_stock,
    GREATEST(SUM(l.current_quantity) - SUM(COALESCE(la.allocated_quantity, 0)) - SUM(l.locked_quantity) + COALESCE(SUM(ipl.planned_quantity), 0), 0) AS available_with_provisional,
    MAX(l.updated_at) AS last_updated
FROM public.lots l
LEFT JOIN public.v_lot_allocations la ON l.id = la.lot_id
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
    COALESCE(p.maker_part_code, '') AS maker_part_code,
    COALESCE(p.product_name, '[削除済み製品]') AS product_name,
    l.warehouse_id,
    COALESCE(w.warehouse_code, '') AS warehouse_code,
    COALESCE(w.warehouse_name, '[削除済み倉庫]') AS warehouse_name,
    l.supplier_id,
    COALESCE(s.supplier_code, '') AS supplier_code,
    COALESCE(s.supplier_name, '[削除済み仕入先]') AS supplier_name,
    l.received_date,
    l.expiry_date,
    l.current_quantity,
    COALESCE(la.allocated_quantity, 0) AS allocated_quantity,
    l.locked_quantity,
    GREATEST(l.current_quantity - COALESCE(la.allocated_quantity, 0) - l.locked_quantity, 0) AS available_quantity,
    l.unit,
    l.status,
    l.lock_reason,
    CASE WHEN l.expiry_date IS NOT NULL THEN CAST((l.expiry_date - CURRENT_DATE) AS INTEGER) ELSE NULL END AS days_to_expiry,
    -- 担当者情報を追加
    usa_primary.user_id AS primary_user_id,
    u_primary.username AS primary_username,
    u_primary.display_name AS primary_user_display_name,
    -- 論理削除フラグ（マスタの状態確認用）
    CASE WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS product_deleted,
    CASE WHEN w.valid_to IS NOT NULL AND w.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS warehouse_deleted,
    CASE WHEN s.valid_to IS NOT NULL AND s.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS supplier_deleted,
    l.created_at,
    l.updated_at
FROM public.lots l
LEFT JOIN public.v_lot_allocations la ON l.id = la.lot_id
LEFT JOIN public.products p ON l.product_id = p.id
LEFT JOIN public.warehouses w ON l.warehouse_id = w.id
LEFT JOIN public.suppliers s ON l.supplier_id = s.id
-- 主担当者を結合
LEFT JOIN public.user_supplier_assignments usa_primary
    ON usa_primary.supplier_id = l.supplier_id
    AND usa_primary.is_primary = TRUE
LEFT JOIN public.users u_primary
    ON u_primary.id = usa_primary.user_id;

COMMENT ON VIEW public.v_lot_details IS 'ロット詳細ビュー（担当者情報含む、soft-delete対応）';


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


-- v_order_line_details は allocations テーブル結合も必要だが
-- allocationsテーブルが lot_reference に変更されたため
-- 引当数量の集計方法を見直す必要がある。
-- ただし、今回の要件では v_order_line_details のエラー報告はないので
-- 一旦 v_lot_details 等の復旧を優先する。
-- allocationsテーブルも残ってはいるが lot_id がないので注意。

CREATE VIEW public.v_order_line_details AS
SELECT
    o.id AS order_id,
    o.order_date,
    o.customer_id,
    COALESCE(c.customer_code, '') AS customer_code,
    COALESCE(c.customer_name, '[削除済み得意先]') AS customer_name,
    ol.id AS line_id,
    ol.product_id,
    ol.delivery_date,
    ol.order_quantity,
    ol.unit,
    ol.delivery_place_id,
    ol.status AS line_status,
    ol.shipping_document_text,
    COALESCE(p.maker_part_code, '') AS product_code,
    COALESCE(p.product_name, '[削除済み製品]') AS product_name,
    p.internal_unit AS product_internal_unit,
    p.external_unit AS product_external_unit,
    p.qty_per_internal_unit AS product_qty_per_internal_unit,
    COALESCE(dp.delivery_place_code, '') AS delivery_place_code,
    COALESCE(dp.delivery_place_name, '[削除済み納入先]') AS delivery_place_name,
    dp.jiku_code,
    ci.external_product_code,
    COALESCE(s.supplier_name, '[削除済み仕入先]') AS supplier_name,
    -- allocationsテーブルからの集計 (lot_reference経由でなく order_line_id で集計)
    COALESCE(alloc_sum.allocated_qty, 0) AS allocated_quantity,
    -- 論理削除フラグ
    CASE WHEN c.valid_to IS NOT NULL AND c.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS customer_deleted,
    CASE WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS product_deleted,
    CASE WHEN dp.valid_to IS NOT NULL AND dp.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS delivery_place_deleted
FROM public.orders o
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.order_lines ol ON ol.order_id = o.id
LEFT JOIN public.products p ON ol.product_id = p.id
LEFT JOIN public.delivery_places dp ON ol.delivery_place_id = dp.id
LEFT JOIN public.customer_items ci ON ci.customer_id = o.customer_id AND ci.product_id = ol.product_id
LEFT JOIN public.suppliers s ON ci.supplier_id = s.id
-- allocations集計サブクエリ
LEFT JOIN (
    SELECT order_line_id, SUM(allocated_quantity) as allocated_qty
    FROM public.allocations
    GROUP BY order_line_id
) alloc_sum ON alloc_sum.order_line_id = ol.id;

COMMENT ON VIEW public.v_order_line_details IS '受注明細の詳細情報ビュー（soft-delete対応）';
