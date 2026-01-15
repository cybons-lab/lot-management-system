"""refresh views to fix schema mismatch

Revision ID: f1e2d3c4b5a6
Revises: 9decff574dcb
Create Date: 2026-01-15 11:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "f1e2d3c4b5a6"
down_revision = "9decff574dcb"
branch_labels = None
depends_on = None

sql_views = r"""
-- ============================================================
-- ビュー再作成スクリプト (v2.3: soft-delete対応版)
-- ============================================================
-- 変更履歴:
-- v2.3: 論理削除されたマスタ参照時のNULL対応（COALESCE追加）

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
-- 追加ビュー
DROP VIEW IF EXISTS public.v_supplier_code_to_id CASCADE;
DROP VIEW IF EXISTS public.v_warehouse_code_to_id CASCADE;
DROP VIEW IF EXISTS public.v_user_supplier_assignments CASCADE;
DROP VIEW IF EXISTS public.v_customer_item_jiku_mappings CASCADE;

-- 2. 新規ビューの作成

-- ヘルパー: ロットごとの引当数量集計
-- NOTE: ビュー内でのCTEはパフォーマンスに影響する場合があるが、ここでは可読性優先
-- view定義内ではCTE使えない場合もあるので、LATERAL JOINなど検討したが
-- PostgreSQLならCTEで問題ない。

-- Per §1.2 invariant: Available = Current - Locked - ConfirmedReserved
-- Only CONFIRMED reservations affect Available Qty
CREATE VIEW public.v_lot_allocations AS
SELECT
    lot_id,
    SUM(reserved_qty) as allocated_quantity
FROM public.lot_reservations
WHERE status IN ('active', 'confirmed')
GROUP BY lot_id;

-- 現在在庫ビュー
CREATE VIEW public.v_lot_current_stock AS
SELECT
    l.id AS lot_id,
    l.product_id,
    l.warehouse_id,
    l.current_quantity,
    l.updated_at AS last_updated
FROM public.lots l
WHERE l.current_quantity > 0;

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
    -- 仮入庫識別キー（UUID）
    l.temporary_lot_key,
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

COMMENT ON VIEW public.v_lot_details IS 'ロット詳細ビュー（担当者情報含む、soft-delete対応、仮入庫対応）';


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


-- v_order_line_details: P3統一により lot_reservations を使用
-- allocations テーブルは廃止済み、lot_reservations が唯一の正
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
    -- lot_reservations から集計（ACTIVE + CONFIRMED = 有効な予約）
    COALESCE(res_sum.allocated_qty, 0) AS allocated_quantity,
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
-- lot_reservations 集計サブクエリ（ORDER タイプ、非リリース状態）
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
"""


def upgrade() -> None:
    # Execute the view creation script
    op.execute(sql_views)


def downgrade() -> None:
    # Do nothing explicitly for infinite loading fix (preserve current state)
    pass
