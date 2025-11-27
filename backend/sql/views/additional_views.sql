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
