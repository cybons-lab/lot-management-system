-- ============================================================
-- v_inventory_summary ビュー
-- 目的: 在庫一覧の集計処理（InventoryService.get_inventory_items）を
--       DB側のビューに委譲し、パフォーマンスを向上させる
-- ============================================================

DROP VIEW IF EXISTS public.v_inventory_summary CASCADE;

CREATE VIEW public.v_inventory_summary AS
SELECT
    l.product_id,
    l.warehouse_id,
    SUM(l.current_quantity) AS total_quantity,
    SUM(l.allocated_quantity) AS allocated_quantity,
    (SUM(l.current_quantity) - SUM(l.allocated_quantity)) AS available_quantity,
    MAX(l.updated_at) AS last_updated
FROM public.lots l
WHERE l.status = 'active'
GROUP BY l.product_id, l.warehouse_id;

ALTER TABLE public.v_inventory_summary OWNER TO admin;

COMMENT ON VIEW public.v_inventory_summary IS 
'在庫集計ビュー - 商品・倉庫ごとの在庫総数、引当済数、有効在庫数を集計';
