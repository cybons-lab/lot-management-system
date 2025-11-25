-- ============================================================
-- v_order_line_details ビュー
-- 目的: 受注明細の詳細情報を1クエリで取得し、
--       OrderService._populate_additional_info の処理を削減
-- ============================================================

DROP VIEW IF EXISTS public.v_order_line_details CASCADE;

CREATE VIEW public.v_order_line_details AS
SELECT
    -- 受注情報
    o.id AS order_id,
    o.order_number,
    o.order_date,
    o.customer_id,
    
    -- 顧客情報
    c.customer_code,
    c.customer_name,
    
    -- 受注明細情報
    ol.id AS line_id,
    ol.product_id,
    ol.delivery_date,
    ol.order_quantity,
    ol.unit,
    ol.converted_quantity,
    ol.delivery_place_id,
    ol.status AS line_status,
    
    -- 商品情報
    p.maker_part_code AS product_code,
    p.product_name,
    p.internal_unit AS product_internal_unit,
    p.external_unit AS product_external_unit,
    p.qty_per_internal_unit AS product_qty_per_internal_unit,
    
    -- 納入先情報
    dp.delivery_place_code,
    dp.delivery_place_name,
    
    -- 仕入元情報（customer_items経由）
    s.supplier_name,
    
    -- 引当情報（集計）
    COALESCE(SUM(a.allocated_quantity), 0) AS allocated_quantity
    
FROM public.orders o
LEFT JOIN public.customers c 
    ON o.customer_id = c.id
LEFT JOIN public.order_lines ol 
    ON ol.order_id = o.id
LEFT JOIN public.products p 
    ON ol.product_id = p.id
LEFT JOIN public.delivery_places dp 
    ON ol.delivery_place_id = dp.id
LEFT JOIN public.customer_items ci 
    ON ci.customer_id = o.customer_id 
    AND ci.product_id = ol.product_id
LEFT JOIN public.suppliers s 
    ON ci.supplier_id = s.id
LEFT JOIN public.allocations a 
    ON a.order_line_id = ol.id

GROUP BY
    -- 受注情報
    o.id, o.order_number, o.order_date, o.customer_id,
    -- 顧客情報
    c.customer_code, c.customer_name,
    -- 受注明細情報
    ol.id, ol.product_id, ol.delivery_date, 
    ol.order_quantity, ol.unit, ol.converted_quantity, 
    ol.delivery_place_id, ol.status,
    -- 商品情報
    p.maker_part_code, p.product_name, 
    p.internal_unit, p.external_unit, p.qty_per_internal_unit,
    -- 納入先情報
    dp.delivery_place_code, dp.delivery_place_name,
    -- 仕入元情報
    s.supplier_name;

ALTER TABLE public.v_order_line_details OWNER TO admin;

COMMENT ON VIEW public.v_order_line_details IS 
'受注明細の詳細情報ビュー - 顧客、商品、納入先、仕入元、引当情報を含む';
