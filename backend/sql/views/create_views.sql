-- ============================================================
-- ビュー再作成スクリプト (v2.4: B-Plan lot_receipts対応版)
-- ============================================================
-- 変更履歴:
-- v2.3: 論理削除されたマスタ参照時のNULL対応（COALESCE追加）
-- v2.4: lot_receipts対応、v_lot_receipt_stock導入

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
DROP VIEW IF EXISTS public.v_lot_allocations CASCADE;
DROP VIEW IF EXISTS public.v_lot_active_reservations CASCADE;
DROP VIEW IF EXISTS public.v_lot_receipt_stock CASCADE;
-- 追加ビュー
DROP VIEW IF EXISTS public.v_supplier_code_to_id CASCADE;
DROP VIEW IF EXISTS public.v_warehouse_code_to_id CASCADE;
DROP VIEW IF EXISTS public.v_user_supplier_assignments CASCADE;
DROP VIEW IF EXISTS public.v_customer_item_jiku_mappings CASCADE;

-- 2. 新規ビューの作成

-- ヘルパー: ロットごとの引当数量集計 (CONFIRMEDのみ)
CREATE VIEW public.v_lot_allocations AS
SELECT
    lot_id,
    SUM(reserved_qty) as allocated_quantity
FROM public.lot_reservations
WHERE status = 'confirmed'
GROUP BY lot_id;

-- ヘルパー: ロットごとの予約数量集計 (ACTIVEのみ)
CREATE VIEW public.v_lot_active_reservations AS
SELECT
    lot_id,
    SUM(reserved_qty) as reserved_quantity_active
FROM public.lot_reservations
WHERE status = 'active'
GROUP BY lot_id;

-- 現在在庫ビュー (互換用、lot_receipts参照)
CREATE VIEW public.v_lot_current_stock AS
SELECT
    lr.id AS lot_id,
    lr.product_id,
    lr.warehouse_id,
    lr.received_quantity AS current_quantity,
    lr.updated_at AS last_updated
FROM public.lot_receipts lr
WHERE lr.received_quantity > 0;

-- 顧客別日次製品ビュー（フォーキャスト連携用）
CREATE VIEW public.v_customer_daily_products AS
SELECT DISTINCT
    f.customer_id,
    f.product_id
FROM public.forecast_current f
WHERE f.forecast_period IS NOT NULL;

-- 受注明細コンテキストビュー
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

-- 顧客コード→IDマッピング（論理削除対応）
CREATE VIEW public.v_customer_code_to_id AS
SELECT
    c.customer_code,
    c.id AS customer_id,
    COALESCE(c.customer_name, '[削除済み得意先]') AS customer_name,
    CASE WHEN c.valid_to IS NOT NULL AND c.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS is_deleted
FROM public.customers c;

-- 納入先コード→IDマッピング（論理削除対応）
CREATE VIEW public.v_delivery_place_code_to_id AS
SELECT
    d.delivery_place_code,
    d.id AS delivery_place_id,
    COALESCE(d.delivery_place_name, '[削除済み納入先]') AS delivery_place_name,
    CASE WHEN d.valid_to IS NOT NULL AND d.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS is_deleted
FROM public.delivery_places d;

-- 製品コード→IDマッピング（論理削除対応）
CREATE VIEW public.v_product_code_to_id AS
SELECT
    p.maker_part_code AS product_code,
    p.id AS product_id,
    COALESCE(p.product_name, '[削除済み製品]') AS product_name,
    CASE WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS is_deleted
FROM public.products p;

-- フォーキャスト-受注ペアビュー
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

-- v_lot_available_qty (B-Plan: lot_receipts + withdrawal calc)
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
    AND (lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - COALESCE(la.allocated_quantity, 0) - lr.locked_quantity) > 0;

-- v_lot_receipt_stock (B-Plan: Canonical stock view)
CREATE VIEW public.v_lot_receipt_stock AS
SELECT
    lr.id AS receipt_id,
    lm.id AS lot_master_id,
    lm.lot_number,
    lr.product_id,
    p.maker_part_code AS product_code,
    p.product_name,
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
    COALESCE(res_sum.total_reserved, 0) AS reserved_quantity,
    GREATEST(
        lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) 
        - lr.locked_quantity - COALESCE(res_sum.total_reserved, 0),
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
FROM public.lot_receipts lr
JOIN public.lot_master lm ON lr.lot_master_id = lm.id
LEFT JOIN public.products p ON lr.product_id = p.id
LEFT JOIN public.warehouses w ON lr.warehouse_id = w.id
LEFT JOIN public.suppliers s ON lm.supplier_id = s.id
LEFT JOIN (
    SELECT 
        wl.lot_receipt_id, 
        SUM(wl.quantity) AS total_withdrawn
    FROM public.withdrawal_lines wl
    JOIN public.withdrawals wd ON wl.withdrawal_id = wd.id
    WHERE wd.cancelled_at IS NULL
    GROUP BY wl.lot_receipt_id
) wl_sum ON wl_sum.lot_receipt_id = lr.id
LEFT JOIN (
    SELECT 
        lot_id, 
        SUM(reserved_qty) AS total_reserved
    FROM public.lot_reservations
    WHERE status IN ('active', 'confirmed')
    GROUP BY lot_id
) res_sum ON res_sum.lot_id = lr.id
WHERE lr.status = 'active';

COMMENT ON VIEW public.v_lot_receipt_stock IS '在庫一覧（残量は集計で算出、current_quantityキャッシュ化対応準備済み）';

-- v_inventory_summary (B-Plan: lot_receipts base)
CREATE VIEW public.v_inventory_summary AS
SELECT
  pw.product_id,
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
FROM public.product_warehouse pw
LEFT JOIN (
  SELECT
    lr.product_id,
    lr.warehouse_id,
    COUNT(*) FILTER (WHERE lr.status = 'active') AS active_lot_count,
    SUM(lr.received_quantity) FILTER (WHERE lr.status = 'active') AS total_quantity,
    SUM(COALESCE(la.allocated_quantity, 0)) FILTER (WHERE lr.status = 'active') AS allocated_quantity,
    SUM(lr.locked_quantity) FILTER (WHERE lr.status = 'active') AS locked_quantity,
    GREATEST(
      SUM(lr.received_quantity) FILTER (WHERE lr.status = 'active')
      - SUM(COALESCE(la.allocated_quantity, 0)) FILTER (WHERE lr.status = 'active')
      - SUM(lr.locked_quantity) FILTER (WHERE lr.status = 'active'),
      0
    ) AS available_quantity,
    COALESCE(SUM(ipl.planned_quantity), 0) AS provisional_stock,
    GREATEST(
      SUM(lr.received_quantity) FILTER (WHERE lr.status = 'active')
      - SUM(COALESCE(la.allocated_quantity, 0)) FILTER (WHERE lr.status = 'active')
      - SUM(lr.locked_quantity) FILTER (WHERE lr.status = 'active')
      + COALESCE(SUM(ipl.planned_quantity), 0),
      0
    ) AS available_with_provisional,
    MAX(lr.updated_at) AS last_updated
  FROM public.lot_receipts lr
  LEFT JOIN public.v_lot_allocations la ON lr.id = la.lot_id
  LEFT JOIN public.inbound_plan_lines ipl ON lr.product_id = ipl.product_id
  LEFT JOIN public.inbound_plans ip ON ipl.inbound_plan_id = ip.id AND ip.status = 'planned'
  GROUP BY lr.product_id, lr.warehouse_id
) agg ON agg.product_id = pw.product_id AND agg.warehouse_id = pw.warehouse_id
WHERE pw.is_active = true;

COMMENT ON VIEW public.v_inventory_summary IS '在庫集計ビュー（product_warehouse起点、lot_receipts対応）';

-- v_lot_details (B-Plan: lot_receipts + lot_master)
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
    
    -- Origin Tracking
    lr.origin_type,
    lr.origin_reference,

    -- Financial & Logistic
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
FROM public.lot_receipts lr
JOIN public.lot_master lm ON lr.lot_master_id = lm.id
LEFT JOIN public.v_lot_allocations la ON lr.id = la.lot_id
LEFT JOIN public.v_lot_active_reservations lar ON lr.id = lar.lot_id
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

COMMENT ON VIEW public.v_lot_details IS 'ロット詳細ビュー（担当者情報含む、soft-delete対応、仮入庫対応）Phase1拡張版';

-- v_candidate_lots_by_order_line (B-Plan)
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

-- v_order_line_details (Legacy but compatible)
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
    COALESCE(res_sum.allocated_qty, 0) AS allocated_quantity,
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
LEFT JOIN (
    SELECT source_id, SUM(reserved_qty) as allocated_qty
    FROM public.lot_reservations
    WHERE source_type = 'ORDER' AND status IN ('active', 'confirmed')
    GROUP BY source_id
) res_sum ON res_sum.source_id = ol.id;

COMMENT ON VIEW public.v_order_line_details IS '受注明細の詳細情報ビュー（soft-delete対応）';

-- ============================================================
-- 追加ビュー（マスタコード変換・担当者割り当て）
-- ============================================================

-- 仕入先コード→IDマッピング（論理削除対応）
CREATE VIEW public.v_supplier_code_to_id AS
SELECT
    s.supplier_code,
    s.id AS supplier_id,
    COALESCE(s.supplier_name, '[削除済み仕入先]') AS supplier_name,
    CASE WHEN s.valid_to IS NOT NULL AND s.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS is_deleted
FROM public.suppliers s;

COMMENT ON VIEW public.v_supplier_code_to_id IS '仕入先コード→IDマッピング（soft-delete対応）';

-- 倉庫コード→IDマッピング（論理削除対応）
CREATE VIEW public.v_warehouse_code_to_id AS
SELECT
    w.warehouse_code,
    w.id AS warehouse_id,
    COALESCE(w.warehouse_name, '[削除済み倉庫]') AS warehouse_name,
    w.warehouse_type,
    CASE WHEN w.valid_to IS NOT NULL AND w.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS is_deleted
FROM public.warehouses w;

COMMENT ON VIEW public.v_warehouse_code_to_id IS '倉庫コード→IDマッピング（soft-delete対応）';

-- ユーザー-仕入先担当割り当てビュー（論理削除対応）
CREATE VIEW public.v_user_supplier_assignments AS
SELECT
    usa.id,
    usa.user_id,
    u.username,
    u.display_name,
    usa.supplier_id,
    COALESCE(s.supplier_code, '') AS supplier_code,
    COALESCE(s.supplier_name, '[削除済み仕入先]') AS supplier_name,
    usa.is_primary,
    usa.assigned_at,
    usa.created_at,
    usa.updated_at,
    CASE WHEN s.valid_to IS NOT NULL AND s.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS supplier_deleted
FROM public.user_supplier_assignments usa
JOIN public.users u ON usa.user_id = u.id
LEFT JOIN public.suppliers s ON usa.supplier_id = s.id;

COMMENT ON VIEW public.v_user_supplier_assignments IS 'ユーザー-仕入先担当割り当てビュー（soft-delete対応）';

-- 顧客商品-次区マッピングビュー（論理削除対応）
CREATE VIEW public.v_customer_item_jiku_mappings AS
SELECT
    cijm.id,
    cijm.customer_id,
    COALESCE(c.customer_code, '') AS customer_code,
    COALESCE(c.customer_name, '[削除済み得意先]') AS customer_name,
    cijm.external_product_code,
    cijm.jiku_code,
    cijm.delivery_place_id,
    COALESCE(dp.delivery_place_code, '') AS delivery_place_code,
    COALESCE(dp.delivery_place_name, '[削除済み納入先]') AS delivery_place_name,
    cijm.is_default,
    cijm.created_at,
    CASE WHEN c.valid_to IS NOT NULL AND c.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS customer_deleted,
    CASE WHEN dp.valid_to IS NOT NULL AND dp.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS delivery_place_deleted
FROM public.customer_item_jiku_mappings cijm
LEFT JOIN public.customers c ON cijm.customer_id = c.id
LEFT JOIN public.delivery_places dp ON cijm.delivery_place_id = dp.id;

COMMENT ON VIEW public.v_customer_item_jiku_mappings IS '顧客商品-次区マッピングビュー（soft-delete対応）';
