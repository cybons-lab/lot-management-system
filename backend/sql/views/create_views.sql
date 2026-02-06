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
DROP VIEW IF EXISTS public.v_material_order_forecasts CASCADE;
-- 追加ビュー
DROP VIEW IF EXISTS public.v_supplier_code_to_id CASCADE;
DROP VIEW IF EXISTS public.v_warehouse_code_to_id CASCADE;
DROP VIEW IF EXISTS public.v_user_supplier_assignments CASCADE;
DROP VIEW IF EXISTS public.v_customer_item_jiku_mappings CASCADE;
DROP VIEW IF EXISTS public.v_ocr_results CASCADE;

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
    lr.supplier_item_id,
    lr.warehouse_id,
    lr.received_quantity AS current_quantity,
    lr.updated_at AS last_updated
FROM public.lot_receipts lr
WHERE lr.received_quantity > 0;

-- 顧客別日次製品ビュー（フォーキャスト連携用）
CREATE VIEW public.v_customer_daily_products AS
SELECT DISTINCT
    f.customer_id,
    f.supplier_item_id
FROM public.forecast_current f
WHERE f.forecast_period IS NOT NULL;

-- 受注明細コンテキストビュー
CREATE VIEW public.v_order_line_context AS
SELECT
    ol.id AS order_line_id,
    o.id AS order_id,
    o.customer_id,
    ol.supplier_item_id,
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
    p.maker_part_no AS product_code,
    p.maker_part_no AS maker_part_code,
    p.maker_part_no AS maker_part_no, -- Alias for backward compatibility
    p.id AS supplier_item_id,
    COALESCE(p.display_name, '[削除済み製品]') AS product_name,
    COALESCE(p.display_name, '[削除済み製品]') AS display_name,
    CASE WHEN p.valid_to IS NOT NULL AND p.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS is_deleted
FROM public.supplier_items p;

-- フォーキャスト-受注ペアビュー
CREATE VIEW public.v_forecast_order_pairs AS
SELECT DISTINCT
    f.id AS forecast_id,
    f.customer_id,
    f.supplier_item_id,
    o.id AS order_id,
    ol.delivery_place_id
FROM public.forecast_current f
JOIN public.orders o ON o.customer_id = f.customer_id
JOIN public.order_lines ol ON ol.order_id = o.id
    AND ol.supplier_item_id = f.supplier_item_id;

-- v_lot_available_qty (B-Plan: lot_receipts + withdrawal calc)
CREATE VIEW public.v_lot_available_qty AS
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
    lr.supplier_item_id,
    p.maker_part_no AS product_code,
    p.maker_part_no AS maker_part_code,
    p.maker_part_no AS maker_part_no, -- Alias for backward compatibility
    p.display_name AS product_name,
    p.display_name AS display_name,
    p.capacity,
    p.warranty_period_days,
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
FROM public.lot_receipts lr
JOIN public.lot_master lm ON lr.lot_master_id = lm.id
LEFT JOIN public.supplier_items p ON lr.supplier_item_id = p.id
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
LEFT JOIN public.v_lot_allocations la ON lr.id = la.lot_id
LEFT JOIN public.v_lot_active_reservations lar ON lr.id = lar.lot_id
WHERE lr.status = 'active';

COMMENT ON VIEW public.v_lot_receipt_stock IS '在庫一覧（残量は集計で算出、current_quantityキャッシュ化対応準備済み）';

-- v_inventory_summary (B-Plan: lot_receipts base)
CREATE VIEW public.v_inventory_summary AS
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
FROM public.product_warehouse pw
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
  FROM public.v_lot_receipt_stock lrs
  LEFT JOIN public.inbound_plan_lines ipl ON lrs.supplier_item_id = ipl.supplier_item_id
  LEFT JOIN public.inbound_plans ip ON ipl.inbound_plan_id = ip.id AND ip.status = 'planned'
  GROUP BY lrs.supplier_item_id, lrs.warehouse_id
) agg ON agg.supplier_item_id = pw.supplier_item_id AND agg.warehouse_id = pw.warehouse_id
WHERE pw.is_active = true;

COMMENT ON VIEW public.v_inventory_summary IS '在庫集計ビュー（product_warehouse起点、lot_receipts対応）';

-- v_lot_details (B-Plan: lot_receipts + lot_master + Phase2 customer_part_no)
CREATE VIEW public.v_lot_details AS
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

-- v_candidate_lots_by_order_line (B-Plan)
CREATE VIEW public.v_candidate_lots_by_order_line AS
SELECT 
    c.order_line_id,
    l.lot_id,
    l.supplier_item_id,
    l.warehouse_id,
    l.available_qty,
    l.receipt_date,
    l.expiry_date
FROM public.v_order_line_context c
JOIN public.v_customer_daily_products f 
    ON f.customer_id = c.customer_id 
    AND f.supplier_item_id = c.supplier_item_id
JOIN public.v_lot_available_qty l 
    ON l.supplier_item_id = c.supplier_item_id 
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
    ol.supplier_item_id,
    ol.delivery_date,
    ol.order_quantity,
    ol.unit,
    ol.delivery_place_id,
    ol.status AS line_status,
    ol.shipping_document_text,
    COALESCE(p.maker_part_no, '') AS product_code,
    COALESCE(p.maker_part_no, '') AS maker_part_code,
    COALESCE(p.maker_part_no, '') AS maker_part_no, -- Alias for backward compatibility
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
FROM public.orders o
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.order_lines ol ON ol.order_id = o.id
LEFT JOIN public.supplier_items p ON ol.supplier_item_id = p.id
LEFT JOIN public.delivery_places dp ON ol.delivery_place_id = dp.id
LEFT JOIN public.customer_items ci ON ci.customer_id = o.customer_id AND ci.supplier_item_id = ol.supplier_item_id
LEFT JOIN public.suppliers s ON p.supplier_id = s.id
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
    ci.customer_id,
    COALESCE(c.customer_code, '') AS customer_code,
    COALESCE(c.customer_name, '[削除済み得意先]') AS customer_name,
    ci.customer_part_no,
    cijm.jiku_code,
    cijm.delivery_place_id,
    COALESCE(dp.delivery_place_code, '') AS delivery_place_code,
    COALESCE(dp.delivery_place_name, '[削除済み納入先]') AS delivery_place_name,
    cijm.is_default,
    cijm.created_at,
    CASE WHEN c.valid_to IS NOT NULL AND c.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS customer_deleted,
    CASE WHEN dp.valid_to IS NOT NULL AND dp.valid_to <= CURRENT_DATE THEN TRUE ELSE FALSE END AS delivery_place_deleted
FROM public.customer_item_jiku_mappings cijm
JOIN public.customer_items ci ON cijm.customer_item_id = ci.id
LEFT JOIN public.customers c ON ci.customer_id = c.id
LEFT JOIN public.delivery_places dp ON cijm.delivery_place_id = dp.id;

COMMENT ON VIEW public.v_customer_item_jiku_mappings IS '顧客商品-次区マッピングビュー（soft-delete対応）';

-- 材料発注フォーキャストビュー（マスタ動的補完）
CREATE VIEW public.v_material_order_forecasts AS
WITH dp_one AS (
    SELECT
        delivery_place_code,
        jiku_code,
        ROW_NUMBER() OVER (PARTITION BY delivery_place_code ORDER BY id) AS rn
    FROM public.delivery_places
    WHERE valid_to >= CURRENT_DATE
),
mk_one AS (
    SELECT
        maker_code,
        maker_name,
        ROW_NUMBER() OVER (PARTITION BY maker_code ORDER BY id) AS rn
    FROM public.makers
    WHERE valid_to >= CURRENT_DATE
)
SELECT
    mof.id,
    mof.target_month,
    mof.customer_item_id,
    mof.warehouse_id,
    mof.maker_id,
    mof.material_code,
    mof.unit,
    mof.warehouse_code,
    COALESCE(NULLIF(mof.jiku_code, ''), dp.jiku_code, '') AS jiku_code,
    mof.delivery_place,
    mof.support_division,
    mof.procurement_type,
    mof.maker_code,
    COALESCE(NULLIF(mof.maker_name, ''), mk.maker_name) AS maker_name,
    mof.material_name,
    mof.delivery_lot,
    mof.order_quantity,
    mof.month_start_instruction,
    mof.manager_name,
    mof.monthly_instruction_quantity,
    mof.next_month_notice,
    mof.daily_quantities,
    mof.period_quantities,
    mof.snapshot_at,
    mof.imported_by,
    mof.source_file_name,
    mof.created_at,
    mof.updated_at
FROM public.material_order_forecasts mof
LEFT JOIN dp_one dp
    ON mof.delivery_place = dp.delivery_place_code
    AND dp.rn = 1
LEFT JOIN mk_one mk
    ON mof.maker_code = mk.maker_code
    AND mk.rn = 1;

COMMENT ON VIEW public.v_material_order_forecasts IS '材料発注フォーキャスト（納入先/メーカーマスタ動的補完）';

-- ============================================================
-- OCR結果ビュー（SmartRead縦持ちデータ + 出荷用マスタ）
-- ============================================================

-- OCR結果ビュー: 縦持ちデータと出荷用マスタをJOINしてリアルタイム表示
-- デフォルト得意先コード: 100427105（OCRで取得できない場合の補間値）
CREATE VIEW public.v_ocr_results AS
SELECT
    ld.id,
    ld.wide_data_id,
    ld.config_id,
    ld.task_id,
    ld.task_date,
    ld.request_id_ref,
    ld.row_index,
    ld.status,
    ld.error_reason,
    ld.content,
    ld.created_at,

    -- OCR由来（contentから抽出）+ 得意先コード補間 + 手入力補間
    COALESCE(ld.content->>'得意先コード', '100427105') AS customer_code,
    COALESCE(oe.material_code, ld.content->>'材質コード', ld.content->>'材料コード') AS material_code,
    COALESCE(oe.jiku_code, ld.content->>'次区') AS jiku_code,
    COALESCE(oe.delivery_date, ld.content->>'納期', ld.content->>'納入日') AS delivery_date,
    COALESCE(oe.delivery_quantity, ld.content->>'納入量') AS delivery_quantity,
    COALESCE(ld.content->>'アイテムNo', ld.content->>'アイテム') AS item_no,
    COALESCE(ld.content->>'数量単位', ld.content->>'単位') AS order_unit,
    ld.content->>'入庫No' AS inbound_no,
    COALESCE(ld.content->>'Lot No1', ld.content->>'Lot No', ld.content->>'ロットNo') AS lot_no,
    
    -- ロット・数量別（OCR由来、手入力優先）
    COALESCE(oe.lot_no_1, ld.content->>'Lot No1', ld.content->>'Lot No') AS lot_no_1,
    COALESCE(oe.quantity_1, ld.content->>'数量1', ld.content->>'数量') AS quantity_1,
    COALESCE(oe.lot_no_2, ld.content->>'Lot No2') AS lot_no_2,
    COALESCE(oe.quantity_2, ld.content->>'数量2') AS quantity_2,

    -- 手入力結果（OCR結果編集）
    oe.lot_no_1 AS manual_lot_no_1,
    oe.quantity_1 AS manual_quantity_1,
    oe.lot_no_2 AS manual_lot_no_2,
    oe.quantity_2 AS manual_quantity_2,
    oe.inbound_no AS manual_inbound_no,
    oe.inbound_no_2 AS manual_inbound_no_2,
    oe.shipping_date AS manual_shipping_date,
    oe.shipping_slip_text AS manual_shipping_slip_text,
    oe.shipping_slip_text_edited AS manual_shipping_slip_text_edited,
    oe.jiku_code AS manual_jiku_code,
    oe.material_code AS manual_material_code,
    oe.delivery_quantity AS manual_delivery_quantity,
    oe.delivery_date AS manual_delivery_date,
    oe.updated_at AS manual_updated_at,
    COALESCE(oe.version, 0) AS manual_version,
    -- 処理ステータス: pending/downloaded/sap_linked/completed
    COALESCE(oe.process_status, 'pending') AS process_status,
    -- バリデーションエラーフラグ（DB保存分）
    COALESCE(oe.error_flags, '{}'::jsonb) AS error_flags,

    -- マスタ由来（LEFT JOIN）
    m.id AS master_id,
    m.customer_name,
    m.supplier_code,
    -- 仕入先名称はmaker_name（メーカー名）から取得
    m.maker_name AS supplier_name,
    m.delivery_place_code,
    m.delivery_place_name,
    m.warehouse_code AS shipping_warehouse_code,
    m.shipping_warehouse AS shipping_warehouse_name,
    m.shipping_slip_text,
    m.transport_lt_days,
    m.customer_part_no,
    m.maker_part_no,
    m.has_order,

    -- SAP突合ステータス
    CASE
        WHEN sap_exact.id IS NOT NULL THEN 'exact'
        WHEN sap_prefix.id IS NOT NULL THEN 'prefix'
        ELSE 'not_found'
    END AS sap_match_type,

    COALESCE(sap_exact.zkdmat_b, sap_prefix.zkdmat_b) AS sap_matched_zkdmat_b,

    COALESCE(sap_exact.raw_data, sap_prefix.raw_data) AS sap_raw_data,

    -- エラーフラグ: マスタ未登録
    CASE WHEN m.id IS NULL THEN true ELSE false END AS master_not_found,

    -- エラーフラグ: SAP未登録
    CASE
        WHEN sap_exact.id IS NULL AND sap_prefix.id IS NULL THEN true
        ELSE false
    END AS sap_not_found,

    -- バリデーションエラー: 次区フォーマット（アルファベット+数字）
    CASE
        WHEN COALESCE(oe.jiku_code, ld.content->>'次区') IS NOT NULL
             AND COALESCE(oe.jiku_code, ld.content->>'次区') !~ '^[A-Za-z][0-9]+$'
        THEN true
        ELSE false
    END AS jiku_format_error,

    -- バリデーションエラー: 日付フォーマット（YYYY-MM-DD or YYYY/MM/DD）
    CASE 
        WHEN COALESCE(oe.delivery_date, ld.content->>'納期') IS NOT NULL 
             AND COALESCE(oe.delivery_date, ld.content->>'納期') !~ '^\d{4}[-/]\d{1,2}[-/]\d{1,2}$' 
        THEN true 
        ELSE false 
    END AS date_format_error,
    
    -- 総合エラーフラグ（従来互換）
    CASE
        WHEN ld.status = 'ERROR' THEN true
        WHEN m.id IS NULL THEN true
        WHEN COALESCE(oe.jiku_code, ld.content->>'次区') IS NOT NULL AND COALESCE(oe.jiku_code, ld.content->>'次区') !~ '^[A-Za-z][0-9]+$' THEN true
        WHEN COALESCE(oe.delivery_date, ld.content->>'納期') IS NOT NULL AND COALESCE(oe.delivery_date, ld.content->>'納期') !~ '^\d{4}[-/]\d{1,2}[-/]\d{1,2}$' THEN true
        ELSE false
    END AS has_error,

    -- 総合突合ステータス（SAP + マスタ）
    CASE
        WHEN ld.status = 'ERROR' THEN 'error'
        WHEN m.id IS NULL THEN 'error'
        WHEN sap_exact.id IS NULL AND sap_prefix.id IS NULL THEN 'error'
        WHEN sap_prefix.id IS NOT NULL AND sap_exact.id IS NULL THEN 'warning'
        WHEN COALESCE(oe.jiku_code, ld.content->>'次区') IS NOT NULL
             AND COALESCE(oe.jiku_code, ld.content->>'次区') !~ '^[A-Za-z][0-9]+$' THEN 'error'
        WHEN COALESCE(oe.delivery_date, ld.content->>'納期') IS NOT NULL
             AND COALESCE(oe.delivery_date, ld.content->>'納期') !~ '^\d{4}[-/]\d{1,2}[-/]\d{1,2}$' THEN 'warning'
        ELSE 'ok'
    END AS overall_reconcile_status

FROM public.smartread_long_data ld
LEFT JOIN public.ocr_result_edits oe
    ON oe.smartread_long_data_id = ld.id
LEFT JOIN public.shipping_master_curated m
    ON COALESCE(ld.content->>'得意先コード', '100427105') = m.customer_code
    AND COALESCE(oe.material_code, ld.content->>'材質コード', ld.content->>'材料コード') = m.material_code
    AND COALESCE(oe.jiku_code, ld.content->>'次区') = m.jiku_code
-- SAP完全一致: 材質コード == ZKDMAT_B
LEFT JOIN public.sap_material_cache sap_exact
    ON sap_exact.kunnr = COALESCE(ld.content->>'得意先コード', '100427105')
    AND sap_exact.zkdmat_b = COALESCE(oe.material_code, ld.content->>'材質コード', ld.content->>'材料コード')
-- SAP前方一致: 材質コードでZKDMAT_Bが始まる（一意の場合のみ）
LEFT JOIN LATERAL (
    SELECT sc.id, sc.zkdmat_b, sc.raw_data
    FROM (
        SELECT id, zkdmat_b, raw_data,
               COUNT(*) OVER () as cnt
        FROM public.sap_material_cache
        WHERE kunnr = COALESCE(ld.content->>'得意先コード', '100427105')
          AND zkdmat_b LIKE COALESCE(oe.material_code, ld.content->>'材質コード', ld.content->>'材料コード') || '%'
    ) sc
    WHERE sc.cnt = 1
      AND sap_exact.id IS NULL  -- 完全一致がない場合のみ
    LIMIT 1
) sap_prefix ON true;

COMMENT ON VIEW public.v_ocr_results IS 'OCR結果ビュー（SmartRead縦持ちデータ + 出荷用マスタJOIN、エラー検出含む）';
