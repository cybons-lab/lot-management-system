-- 新規ビュー: 仕入先コードマッピング
CREATE VIEW public.v_supplier_code_to_id AS
SELECT 
    s.supplier_code,
    s.id AS supplier_id,
    s.supplier_name
FROM public.suppliers s;

COMMENT ON VIEW public.v_supplier_code_to_id IS '仕入先コード→IDマッピング';

-- 新規ビュー: 倉庫コードマッピング  
CREATE VIEW public.v_warehouse_code_to_id AS
SELECT 
    w.warehouse_code,
    w.id AS warehouse_id,
    w.warehouse_name,
    w.warehouse_type
FROM public.warehouses w;

COMMENT ON VIEW public.v_warehouse_code_to_id IS '倉庫コード→IDマッピング';

-- 新規ビュー: ユーザー-仕入先担当割り当て
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

-- 新規ビュー: 顧客商品-次区マッピング
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
