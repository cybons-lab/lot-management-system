--
-- PostgreSQL database dump
--

\restrict WtFggcCpTOqfp5br56dBDcELa049aNeEMD9HyWpBvkw2ZemAnWS7tv4MPNGzwAc

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: v_customer_code_to_id; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_customer_code_to_id AS
 SELECT c.customer_code,
    c.id AS customer_id,
    COALESCE(c.customer_name, '[削除済み得意先]'::character varying) AS customer_name,
        CASE
            WHEN ((c.valid_to IS NOT NULL) AND (c.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS is_deleted
   FROM public.customers c;


--
-- Name: v_customer_daily_products; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_customer_daily_products AS
 SELECT DISTINCT f.customer_id,
    f.product_id
   FROM public.forecast_current f
  WHERE (f.forecast_period IS NOT NULL);


--
-- Name: v_customer_item_jiku_mappings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_customer_item_jiku_mappings AS
 SELECT cijm.id,
    cijm.customer_id,
    COALESCE(c.customer_code, ''::character varying) AS customer_code,
    COALESCE(c.customer_name, '[削除済み得意先]'::character varying) AS customer_name,
    cijm.external_product_code,
    cijm.jiku_code,
    cijm.delivery_place_id,
    COALESCE(dp.delivery_place_code, ''::character varying) AS delivery_place_code,
    COALESCE(dp.delivery_place_name, '[削除済み納入先]'::character varying) AS delivery_place_name,
    cijm.is_default,
    cijm.created_at,
        CASE
            WHEN ((c.valid_to IS NOT NULL) AND (c.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS customer_deleted,
        CASE
            WHEN ((dp.valid_to IS NOT NULL) AND (dp.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS delivery_place_deleted
   FROM ((public.customer_item_jiku_mappings cijm
     LEFT JOIN public.customers c ON ((cijm.customer_id = c.id)))
     LEFT JOIN public.delivery_places dp ON ((cijm.delivery_place_id = dp.id)));


--
-- Name: VIEW v_customer_item_jiku_mappings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_customer_item_jiku_mappings IS '顧客商品-次区マッピングビュー（soft-delete対応）';


--
-- Name: v_delivery_place_code_to_id; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_delivery_place_code_to_id AS
 SELECT d.delivery_place_code,
    d.id AS delivery_place_id,
    COALESCE(d.delivery_place_name, '[削除済み納入先]'::character varying) AS delivery_place_name,
        CASE
            WHEN ((d.valid_to IS NOT NULL) AND (d.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS is_deleted
   FROM public.delivery_places d;


--
-- Name: v_forecast_order_pairs; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_forecast_order_pairs AS
 SELECT DISTINCT f.id AS forecast_id,
    f.customer_id,
    f.product_id,
    o.id AS order_id,
    ol.delivery_place_id
   FROM ((public.forecast_current f
     JOIN public.orders o ON ((o.customer_id = f.customer_id)))
     JOIN public.order_lines ol ON (((ol.order_id = o.id) AND (ol.product_id = f.product_id))));


--
-- Name: v_lot_allocations; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lot_allocations AS
 SELECT lot_reservations.lot_id,
    sum(lot_reservations.reserved_qty) AS allocated_quantity
   FROM public.lot_reservations
  WHERE ((lot_reservations.status)::text = 'confirmed'::text)
  GROUP BY lot_reservations.lot_id;


--
-- Name: v_inventory_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_inventory_summary AS
 WITH lot_agg AS (
         SELECT l.product_id,
            l.warehouse_id,
            count(l.id) FILTER (WHERE (((l.status)::text = 'active'::text) AND ((l.received_quantity - l.consumed_quantity) > (0)::numeric))) AS active_lot_count,
            count(l.id) FILTER (WHERE ((l.status)::text = 'archived'::text)) AS archived_lot_count,
            sum(GREATEST((l.received_quantity - l.consumed_quantity), (0)::numeric)) FILTER (WHERE ((l.status)::text = 'active'::text)) AS total_quantity,
            sum(COALESCE(la_1.allocated_quantity, (0)::numeric)) AS allocated_quantity,
            sum(l.locked_quantity) AS locked_quantity,
            max(l.updated_at) AS last_updated
           FROM (public.lot_receipts l
             LEFT JOIN public.v_lot_allocations la_1 ON ((l.id = la_1.lot_id)))
          GROUP BY l.product_id, l.warehouse_id
        ), plan_agg AS (
         SELECT ipl.product_id,
            sum(ipl.planned_quantity) AS provisional_stock
           FROM (public.inbound_plan_lines ipl
             JOIN public.inbound_plans ip ON ((ipl.inbound_plan_id = ip.id)))
          WHERE ((ip.status)::text = 'planned'::text)
          GROUP BY ipl.product_id
        )
 SELECT la.product_id,
    la.warehouse_id,
    la.active_lot_count,
    la.archived_lot_count,
    COALESCE(la.total_quantity, (0)::numeric) AS total_quantity,
    la.allocated_quantity,
    la.locked_quantity,
    GREATEST(((COALESCE(la.total_quantity, (0)::numeric) - la.locked_quantity) - la.allocated_quantity), (0)::numeric) AS available_quantity,
    COALESCE(pa.provisional_stock, (0)::numeric) AS provisional_stock,
    GREATEST((((COALESCE(la.total_quantity, (0)::numeric) - la.locked_quantity) - la.allocated_quantity) + COALESCE(pa.provisional_stock, (0)::numeric)), (0)::numeric) AS available_with_provisional,
    la.last_updated,
        CASE
            WHEN (la.active_lot_count = 0) THEN 'no_lots'::character varying
            WHEN (GREATEST(((COALESCE(la.total_quantity, (0)::numeric) - la.locked_quantity) - la.allocated_quantity), (0)::numeric) > (0)::numeric) THEN 'in_stock'::character varying
            ELSE 'depleted_only'::character varying
        END AS inventory_state
   FROM (lot_agg la
     LEFT JOIN plan_agg pa ON ((la.product_id = pa.product_id)));


--
-- Name: v_lot_active_reservations; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lot_active_reservations AS
 SELECT lot_reservations.lot_id,
    sum(lot_reservations.reserved_qty) AS reserved_quantity_active
   FROM public.lot_reservations
  WHERE ((lot_reservations.status)::text = 'active'::text)
  GROUP BY lot_reservations.lot_id;


--
-- Name: v_lot_available_qty; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lot_available_qty AS
 SELECT lr.id AS lot_id,
    lr.product_id,
    lr.warehouse_id,
    GREATEST((((lr.received_quantity - lr.consumed_quantity) - COALESCE(la.allocated_quantity, (0)::numeric)) - lr.locked_quantity), (0)::numeric) AS available_qty,
    lr.received_date AS receipt_date,
    lr.expiry_date,
    lr.status AS lot_status
   FROM (public.lot_receipts lr
     LEFT JOIN public.v_lot_allocations la ON ((lr.id = la.lot_id)))
  WHERE (((lr.status)::text = 'active'::text) AND ((lr.expiry_date IS NULL) OR (lr.expiry_date >= CURRENT_DATE)) AND ((((lr.received_quantity - lr.consumed_quantity) - COALESCE(la.allocated_quantity, (0)::numeric)) - lr.locked_quantity) > (0)::numeric));


--
-- Name: v_lot_current_stock; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lot_current_stock AS
 SELECT lr.id AS lot_id,
    lr.product_id,
    lr.warehouse_id,
    lr.received_quantity AS current_quantity,
    lr.updated_at AS last_updated
   FROM public.lot_receipts lr
  WHERE (lr.received_quantity > (0)::numeric);


--
-- Name: v_lot_details; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lot_details AS
 SELECT lr.id AS lot_id,
    lm.lot_number,
    lr.product_id,
    COALESCE(p.maker_part_code, ''::character varying) AS maker_part_code,
    COALESCE(p.product_name, '[削除済み製品]'::character varying) AS product_name,
    lr.warehouse_id,
    COALESCE(w.warehouse_code, ''::character varying) AS warehouse_code,
    COALESCE(w.warehouse_name, '[削除済み倉庫]'::character varying) AS warehouse_name,
    COALESCE(w.short_name, ("left"((w.warehouse_name)::text, 10))::character varying) AS warehouse_short_name,
    lm.supplier_id,
    COALESCE(s.supplier_code, ''::character varying) AS supplier_code,
    COALESCE(s.supplier_name, '[削除済み仕入先]'::character varying) AS supplier_name,
    COALESCE(s.short_name, ("left"((s.supplier_name)::text, 10))::character varying) AS supplier_short_name,
    lr.received_date,
    lr.expiry_date,
    lr.received_quantity,
    lr.consumed_quantity AS withdrawn_quantity,
    GREATEST((lr.received_quantity - lr.consumed_quantity), (0)::numeric) AS remaining_quantity,
    GREATEST((lr.received_quantity - lr.consumed_quantity), (0)::numeric) AS current_quantity,
    COALESCE(la.allocated_quantity, (0)::numeric) AS allocated_quantity,
    COALESCE(lres.reserved_quantity_active, (0)::numeric) AS reserved_quantity_active,
    lr.locked_quantity,
    GREATEST((((lr.received_quantity - lr.consumed_quantity) - lr.locked_quantity) - COALESCE(la.allocated_quantity, (0)::numeric)), (0)::numeric) AS available_quantity,
    lr.unit,
    lr.status,
    lr.lock_reason,
        CASE
            WHEN (lr.expiry_date IS NOT NULL) THEN (lr.expiry_date - CURRENT_DATE)
            ELSE NULL::integer
        END AS days_to_expiry,
    'not_required'::character varying AS inspection_status,
    NULL::date AS inspection_date,
    NULL::character varying AS inspection_cert_number,
    lr.temporary_lot_key,
    lr.receipt_key,
    lr.lot_master_id,
    lr.origin_type,
    lr.origin_reference,
    lr.shipping_date,
    lr.cost_price,
    lr.sales_price,
    lr.tax_rate,
    usa_primary.user_id AS primary_user_id,
    u_primary.username AS primary_username,
    u_primary.display_name AS primary_user_display_name,
        CASE
            WHEN ((p.valid_to IS NOT NULL) AND (p.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS product_deleted,
        CASE
            WHEN ((w.valid_to IS NOT NULL) AND (w.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS warehouse_deleted,
        CASE
            WHEN ((s.valid_to IS NOT NULL) AND (s.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS supplier_deleted,
    lr.created_at,
    lr.updated_at
   FROM ((((((((public.lot_receipts lr
     JOIN public.lot_master lm ON ((lr.lot_master_id = lm.id)))
     LEFT JOIN public.v_lot_allocations la ON ((lr.id = la.lot_id)))
     LEFT JOIN ( SELECT lot_reservations.lot_id,
            sum(lot_reservations.reserved_qty) AS reserved_quantity_active
           FROM public.lot_reservations
          WHERE ((lot_reservations.status)::text = 'active'::text)
          GROUP BY lot_reservations.lot_id) lres ON ((lr.id = lres.lot_id)))
     LEFT JOIN public.products p ON ((lr.product_id = p.id)))
     LEFT JOIN public.warehouses w ON ((lr.warehouse_id = w.id)))
     LEFT JOIN public.suppliers s ON ((lm.supplier_id = s.id)))
     LEFT JOIN public.user_supplier_assignments usa_primary ON (((usa_primary.supplier_id = lm.supplier_id) AND (usa_primary.is_primary = true))))
     LEFT JOIN public.users u_primary ON ((u_primary.id = usa_primary.user_id)));


--
-- Name: v_lot_receipt_stock; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lot_receipt_stock AS
 SELECT lr.id AS receipt_id,
    lm.id AS lot_master_id,
    lm.lot_number,
    lr.product_id,
    p.maker_part_code AS product_code,
    p.product_name,
    lr.warehouse_id,
    w.warehouse_code,
    w.warehouse_name,
    COALESCE(w.short_name, ("left"((w.warehouse_name)::text, 10))::character varying) AS warehouse_short_name,
    lm.supplier_id,
    s.supplier_code,
    s.supplier_name,
    COALESCE(s.short_name, ("left"((s.supplier_name)::text, 10))::character varying) AS supplier_short_name,
    lr.received_date,
    lr.expiry_date,
    lr.unit,
    lr.status,
    lr.received_quantity AS initial_quantity,
    COALESCE(wl_sum.total_withdrawn, (0)::numeric) AS withdrawn_quantity,
    GREATEST(((lr.received_quantity - COALESCE(wl_sum.total_withdrawn, (0)::numeric)) - lr.locked_quantity), (0)::numeric) AS remaining_quantity,
    COALESCE(res_sum.total_reserved, (0)::numeric) AS reserved_quantity,
    GREATEST((((lr.received_quantity - COALESCE(wl_sum.total_withdrawn, (0)::numeric)) - lr.locked_quantity) - COALESCE(res_sum.total_reserved, (0)::numeric)), (0)::numeric) AS available_quantity,
    lr.locked_quantity,
    lr.lock_reason,
    lr.inspection_status,
    lr.receipt_key,
    lr.created_at,
    lr.updated_at,
        CASE
            WHEN (lr.expiry_date IS NOT NULL) THEN (lr.expiry_date - CURRENT_DATE)
            ELSE NULL::integer
        END AS days_to_expiry
   FROM ((((((public.lot_receipts lr
     JOIN public.lot_master lm ON ((lr.lot_master_id = lm.id)))
     LEFT JOIN public.products p ON ((lr.product_id = p.id)))
     LEFT JOIN public.warehouses w ON ((lr.warehouse_id = w.id)))
     LEFT JOIN public.suppliers s ON ((lm.supplier_id = s.id)))
     LEFT JOIN ( SELECT wl.lot_receipt_id,
            sum(wl.quantity) AS total_withdrawn
           FROM (public.withdrawal_lines wl
             JOIN public.withdrawals wd ON ((wl.withdrawal_id = wd.id)))
          WHERE (wd.cancelled_at IS NULL)
          GROUP BY wl.lot_receipt_id) wl_sum ON ((wl_sum.lot_receipt_id = lr.id)))
     LEFT JOIN ( SELECT lot_reservations.lot_id,
            sum(lot_reservations.reserved_qty) AS total_reserved
           FROM public.lot_reservations
          WHERE ((lot_reservations.status)::text = ANY ((ARRAY['active'::character varying, 'confirmed'::character varying])::text[]))
          GROUP BY lot_reservations.lot_id) res_sum ON ((res_sum.lot_id = lr.id)))
  WHERE ((lr.status)::text = 'active'::text);


--
-- Name: VIEW v_lot_receipt_stock; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_lot_receipt_stock IS '在庫一覧（残量は集計で算出、current_quantityキャッシュ化対応準備済み）';


--
-- Name: v_order_line_context; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_order_line_context AS
 SELECT ol.id AS order_line_id,
    o.id AS order_id,
    o.customer_id,
    ol.product_id,
    ol.delivery_place_id,
    ol.order_quantity AS quantity
   FROM (public.order_lines ol
     JOIN public.orders o ON ((o.id = ol.order_id)));


--
-- Name: v_order_line_details; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_order_line_details AS
 SELECT o.id AS order_id,
    o.order_date,
    o.customer_id,
    COALESCE(c.customer_code, ''::character varying) AS customer_code,
    COALESCE(c.customer_name, '[削除済み得意先]'::character varying) AS customer_name,
    ol.id AS line_id,
    ol.product_id,
    ol.delivery_date,
    ol.order_quantity,
    ol.unit,
    ol.delivery_place_id,
    ol.status AS line_status,
    ol.shipping_document_text,
    COALESCE(p.maker_part_code, ''::character varying) AS product_code,
    COALESCE(p.product_name, '[削除済み製品]'::character varying) AS product_name,
    p.internal_unit AS product_internal_unit,
    p.external_unit AS product_external_unit,
    p.qty_per_internal_unit AS product_qty_per_internal_unit,
    COALESCE(dp.delivery_place_code, ''::character varying) AS delivery_place_code,
    COALESCE(dp.delivery_place_name, '[削除済み納入先]'::character varying) AS delivery_place_name,
    dp.jiku_code,
    ci.external_product_code,
    COALESCE(s.supplier_name, '[削除済み仕入先]'::character varying) AS supplier_name,
    COALESCE(res_sum.allocated_qty, (0)::numeric) AS allocated_quantity,
        CASE
            WHEN ((c.valid_to IS NOT NULL) AND (c.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS customer_deleted,
        CASE
            WHEN ((p.valid_to IS NOT NULL) AND (p.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS product_deleted,
        CASE
            WHEN ((dp.valid_to IS NOT NULL) AND (dp.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS delivery_place_deleted
   FROM (((((((public.orders o
     LEFT JOIN public.customers c ON ((o.customer_id = c.id)))
     LEFT JOIN public.order_lines ol ON ((ol.order_id = o.id)))
     LEFT JOIN public.products p ON ((ol.product_id = p.id)))
     LEFT JOIN public.delivery_places dp ON ((ol.delivery_place_id = dp.id)))
     LEFT JOIN public.customer_items ci ON (((ci.customer_id = o.customer_id) AND (ci.product_id = ol.product_id))))
     LEFT JOIN public.suppliers s ON ((ci.supplier_id = s.id)))
     LEFT JOIN ( SELECT lot_reservations.source_id,
            sum(lot_reservations.reserved_qty) AS allocated_qty
           FROM public.lot_reservations
          WHERE (((lot_reservations.source_type)::text = 'ORDER'::text) AND ((lot_reservations.status)::text = ANY ((ARRAY['active'::character varying, 'confirmed'::character varying])::text[])))
          GROUP BY lot_reservations.source_id) res_sum ON ((res_sum.source_id = ol.id)));


--
-- Name: VIEW v_order_line_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_order_line_details IS '受注明細の詳細情報ビュー（soft-delete対応）';


--
-- Name: v_product_code_to_id; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_product_code_to_id AS
 SELECT p.maker_part_code AS product_code,
    p.id AS product_id,
    COALESCE(p.product_name, '[削除済み製品]'::character varying) AS product_name,
        CASE
            WHEN ((p.valid_to IS NOT NULL) AND (p.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS is_deleted
   FROM public.products p;


--
-- Name: v_supplier_code_to_id; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_supplier_code_to_id AS
 SELECT s.supplier_code,
    s.id AS supplier_id,
    COALESCE(s.supplier_name, '[削除済み仕入先]'::character varying) AS supplier_name,
        CASE
            WHEN ((s.valid_to IS NOT NULL) AND (s.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS is_deleted
   FROM public.suppliers s;


--
-- Name: VIEW v_supplier_code_to_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_supplier_code_to_id IS '仕入先コード→IDマッピング（soft-delete対応）';


--
-- Name: v_user_supplier_assignments; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_user_supplier_assignments AS
 SELECT usa.id,
    usa.user_id,
    u.username,
    u.display_name,
    usa.supplier_id,
    COALESCE(s.supplier_code, ''::character varying) AS supplier_code,
    COALESCE(s.supplier_name, '[削除済み仕入先]'::character varying) AS supplier_name,
    usa.is_primary,
    usa.assigned_at,
    usa.created_at,
    usa.updated_at,
        CASE
            WHEN ((s.valid_to IS NOT NULL) AND (s.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS supplier_deleted
   FROM ((public.user_supplier_assignments usa
     JOIN public.users u ON ((usa.user_id = u.id)))
     LEFT JOIN public.suppliers s ON ((usa.supplier_id = s.id)));


--
-- Name: VIEW v_user_supplier_assignments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_user_supplier_assignments IS 'ユーザー-仕入先担当割り当てビュー（soft-delete対応）';


--
-- Name: v_warehouse_code_to_id; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_warehouse_code_to_id AS
 SELECT w.warehouse_code,
    w.id AS warehouse_id,
    COALESCE(w.warehouse_name, '[削除済み倉庫]'::character varying) AS warehouse_name,
    w.warehouse_type,
        CASE
            WHEN ((w.valid_to IS NOT NULL) AND (w.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS is_deleted
   FROM public.warehouses w;


--
-- Name: VIEW v_warehouse_code_to_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_warehouse_code_to_id IS '倉庫コード→IDマッピング（soft-delete対応）';


--
-- PostgreSQL database dump complete
--

\unrestrict WtFggcCpTOqfp5br56dBDcELa049aNeEMD9HyWpBvkw2ZemAnWS7tv4MPNGzwAc

