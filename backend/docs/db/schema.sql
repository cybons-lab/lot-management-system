--
-- PostgreSQL database dump
--

\restrict oHbH7pzMUSsFFJLRq305TRhnyKJ4OEtsthIdpc0ZceKgSqgGBQ0Qx1U2blatoWb

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO admin;

--
-- Name: allocations; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.allocations (
    id integer NOT NULL,
    order_line_id integer NOT NULL,
    lot_id integer NOT NULL,
    allocated_qty double precision NOT NULL,
    allocated_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    destination_id bigint
);


ALTER TABLE public.allocations OWNER TO admin;

--
-- Name: allocations_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.allocations_history (
    id integer NOT NULL,
    allocation_id integer NOT NULL,
    order_line_id integer NOT NULL,
    lot_id integer NOT NULL,
    allocated_qty numeric(15,4) NOT NULL,
    valid_from timestamp without time zone NOT NULL,
    valid_to timestamp without time zone,
    changed_by character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.allocations_history OWNER TO admin;

--
-- Name: allocations_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.allocations_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.allocations_history_id_seq OWNER TO admin;

--
-- Name: allocations_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.allocations_history_id_seq OWNED BY public.allocations_history.id;


--
-- Name: allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.allocations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.allocations_id_seq OWNER TO admin;

--
-- Name: allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.allocations_id_seq OWNED BY public.allocations.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.customers (
    customer_code text NOT NULL,
    customer_name text NOT NULL,
    address text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.customers OWNER TO admin;

--
-- Name: delivery_places; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.delivery_places (
    id bigint NOT NULL,
    delivery_place_code character varying NOT NULL,
    delivery_place_name character varying NOT NULL,
    address character varying,
    postal_code character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.delivery_places OWNER TO admin;

--
-- Name: delivery_places_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.delivery_places_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.delivery_places_id_seq OWNER TO admin;

--
-- Name: delivery_places_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.delivery_places_id_seq OWNED BY public.delivery_places.id;


--
-- Name: expiry_rules; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.expiry_rules (
    id integer NOT NULL,
    product_code text,
    supplier_code text,
    rule_type text NOT NULL,
    days integer,
    fixed_date date,
    is_active integer,
    priority integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.expiry_rules OWNER TO admin;

--
-- Name: expiry_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.expiry_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.expiry_rules_id_seq OWNER TO admin;

--
-- Name: expiry_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.expiry_rules_id_seq OWNED BY public.expiry_rules.id;


--
-- Name: forecasts; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.forecasts (
    id integer NOT NULL,
    forecast_id character varying(36) NOT NULL,
    product_id character varying(64) NOT NULL,
    customer_id character varying(64) NOT NULL,
    supplier_id character varying(64) NOT NULL,
    granularity character varying(16) NOT NULL,
    date_day date,
    date_dekad_start date,
    year_month character varying(7),
    qty_forecast integer NOT NULL,
    version_no integer NOT NULL,
    version_issued_at timestamp with time zone NOT NULL,
    source_system character varying(32) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    CONSTRAINT ck_forecast_granularity CHECK (((granularity)::text = ANY ((ARRAY['daily'::character varying, 'dekad'::character varying, 'monthly'::character varying])::text[]))),
    CONSTRAINT ck_forecast_period_key_exclusivity CHECK (((((granularity)::text = 'daily'::text) AND (date_day IS NOT NULL) AND (date_dekad_start IS NULL) AND (year_month IS NULL)) OR (((granularity)::text = 'dekad'::text) AND (date_dekad_start IS NOT NULL) AND (date_day IS NULL) AND (year_month IS NULL)) OR (((granularity)::text = 'monthly'::text) AND (year_month IS NOT NULL) AND (date_day IS NULL) AND (date_dekad_start IS NULL)))),
    CONSTRAINT ck_forecast_qty_nonneg CHECK ((qty_forecast >= 0))
);


ALTER TABLE public.forecasts OWNER TO admin;

--
-- Name: forecast_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.forecast_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.forecast_id_seq OWNER TO admin;

--
-- Name: forecast_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.forecast_id_seq OWNED BY public.forecasts.id;


--
-- Name: inbound_submissions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.inbound_submissions (
    id integer NOT NULL,
    submission_id text,
    source_file text,
    source character varying(20) DEFAULT 'ocr'::character varying NOT NULL,
    operator text,
    schema_version text,
    target_type text,
    submission_date timestamp without time zone,
    status text,
    total_records integer,
    processed_records integer,
    failed_records integer,
    skipped_records integer,
    error_details text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.inbound_submissions OWNER TO admin;

--
-- Name: lot_current_stock; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.lot_current_stock (
    lot_id integer NOT NULL,
    current_quantity double precision NOT NULL,
    last_updated timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.lot_current_stock OWNER TO admin;

--
-- Name: lots; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.lots (
    id integer NOT NULL,
    supplier_code text NOT NULL,
    product_code text NOT NULL,
    lot_number text NOT NULL,
    receipt_date date NOT NULL,
    mfg_date date,
    expiry_date date,
    warehouse_code text,
    kanban_class text,
    sales_unit text,
    inventory_unit text,
    received_by text,
    source_doc text,
    qc_certificate_status text,
    qc_certificate_file text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    warehouse_code_old text,
    lot_unit character varying(10),
    is_locked boolean DEFAULT false NOT NULL,
    lock_reason text,
    inspection_date date,
    inspection_result text,
    warehouse_id bigint
);


ALTER TABLE public.lots OWNER TO admin;

--
-- Name: COLUMN lots.warehouse_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.warehouse_id IS 'warehouses.id へ移行用一時列';


--
-- Name: lots_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.lots_history (
    id integer NOT NULL,
    lot_id integer NOT NULL,
    lot_number text NOT NULL,
    product_code text NOT NULL,
    warehouse_id text NOT NULL,
    quantity_total numeric(15,4) NOT NULL,
    quantity_available numeric(15,4) NOT NULL,
    valid_from timestamp without time zone NOT NULL,
    valid_to timestamp without time zone,
    changed_by character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.lots_history OWNER TO admin;

--
-- Name: lots_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.lots_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lots_history_id_seq OWNER TO admin;

--
-- Name: lots_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.lots_history_id_seq OWNED BY public.lots_history.id;


--
-- Name: lots_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.lots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lots_id_seq OWNER TO admin;

--
-- Name: lots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.lots_id_seq OWNED BY public.lots.id;


--
-- Name: next_div_map; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.next_div_map (
    id integer NOT NULL,
    customer_code text NOT NULL,
    ship_to_code text NOT NULL,
    product_code text NOT NULL,
    next_div text NOT NULL
);


ALTER TABLE public.next_div_map OWNER TO admin;

--
-- Name: next_div_map_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.next_div_map_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.next_div_map_id_seq OWNER TO admin;

--
-- Name: next_div_map_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.next_div_map_id_seq OWNED BY public.next_div_map.id;


--
-- Name: ocr_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.ocr_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ocr_submissions_id_seq OWNER TO admin;

--
-- Name: ocr_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.ocr_submissions_id_seq OWNED BY public.inbound_submissions.id;


--
-- Name: order_line_warehouse_allocation; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.order_line_warehouse_allocation (
    id integer NOT NULL,
    order_line_id integer NOT NULL,
    warehouse_id integer NOT NULL,
    quantity double precision NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    CONSTRAINT ck_olwa_quantity_positive CHECK ((quantity > (0)::double precision))
);


ALTER TABLE public.order_line_warehouse_allocation OWNER TO admin;

--
-- Name: order_line_warehouse_allocation_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.order_line_warehouse_allocation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.order_line_warehouse_allocation_id_seq OWNER TO admin;

--
-- Name: order_line_warehouse_allocation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.order_line_warehouse_allocation_id_seq OWNED BY public.order_line_warehouse_allocation.id;


--
-- Name: order_lines; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.order_lines (
    id integer NOT NULL,
    order_id integer NOT NULL,
    line_no integer NOT NULL,
    product_code text NOT NULL,
    quantity double precision NOT NULL,
    unit text,
    due_date date,
    created_at timestamp without time zone,
    forecast_id integer,
    forecast_granularity text,
    forecast_match_status text,
    forecast_qty double precision,
    forecast_version_no integer,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    next_div text,
    destination_id bigint
);


ALTER TABLE public.order_lines OWNER TO admin;

--
-- Name: order_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.order_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.order_lines_id_seq OWNER TO admin;

--
-- Name: order_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.order_lines_id_seq OWNED BY public.order_lines.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    order_no text NOT NULL,
    customer_code text NOT NULL,
    order_date date,
    status text,
    sap_order_id text,
    sap_status text,
    sap_sent_at timestamp without time zone,
    sap_error_msg text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    customer_order_no text,
    customer_order_no_last6 character varying(6),
    delivery_mode text
);


ALTER TABLE public.orders OWNER TO admin;

--
-- Name: orders_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.orders_history (
    id integer NOT NULL,
    order_id integer NOT NULL,
    order_no character varying(50) NOT NULL,
    customer_code text NOT NULL,
    order_date timestamp without time zone NOT NULL,
    due_date timestamp without time zone,
    remarks text,
    valid_from timestamp without time zone NOT NULL,
    valid_to timestamp without time zone,
    changed_by character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.orders_history OWNER TO admin;

--
-- Name: orders_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.orders_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.orders_history_id_seq OWNER TO admin;

--
-- Name: orders_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.orders_history_id_seq OWNED BY public.orders_history.id;


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.orders_id_seq OWNER TO admin;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: product_uom_conversions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.product_uom_conversions (
    id integer NOT NULL,
    product_code text NOT NULL,
    source_unit text NOT NULL,
    source_value double precision NOT NULL,
    internal_unit_value double precision NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.product_uom_conversions OWNER TO admin;

--
-- Name: product_uom_conversions_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.product_uom_conversions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.product_uom_conversions_id_seq OWNER TO admin;

--
-- Name: product_uom_conversions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.product_uom_conversions_id_seq OWNED BY public.product_uom_conversions.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.products (
    product_code text NOT NULL,
    product_name text NOT NULL,
    customer_part_no text,
    maker_item_code text,
    internal_unit text NOT NULL,
    assemble_div text,
    next_div text,
    shelf_life_days integer,
    requires_lot_number integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    base_unit character varying(10) DEFAULT 'EA'::character varying NOT NULL,
    packaging_qty numeric(10,2) DEFAULT '1'::numeric NOT NULL,
    packaging_unit character varying(20) DEFAULT 'EA'::character varying NOT NULL,
    supplier_item_code character varying,
    supplier_code text,
    delivery_place_id bigint,
    ji_ku_text character varying,
    kumitsuke_ku_text character varying,
    delivery_place_name character varying,
    shipping_warehouse_name character varying
);


ALTER TABLE public.products OWNER TO admin;

--
-- Name: purchase_requests; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.purchase_requests (
    id integer NOT NULL,
    product_code text NOT NULL,
    supplier_code text NOT NULL,
    requested_qty double precision NOT NULL,
    unit text,
    reason_code text NOT NULL,
    src_order_line_id integer,
    requested_date date,
    desired_receipt_date date,
    status text,
    sap_po_id text,
    notes text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.purchase_requests OWNER TO admin;

--
-- Name: purchase_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.purchase_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.purchase_requests_id_seq OWNER TO admin;

--
-- Name: purchase_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.purchase_requests_id_seq OWNED BY public.purchase_requests.id;


--
-- Name: receipt_headers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.receipt_headers (
    id integer NOT NULL,
    receipt_no text,
    supplier_code text NOT NULL,
    warehouse_code text NOT NULL,
    receipt_date date NOT NULL,
    created_by text,
    notes text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.receipt_headers OWNER TO admin;

--
-- Name: receipt_headers_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.receipt_headers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.receipt_headers_id_seq OWNER TO admin;

--
-- Name: receipt_headers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.receipt_headers_id_seq OWNED BY public.receipt_headers.id;


--
-- Name: receipt_lines; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.receipt_lines (
    id integer NOT NULL,
    header_id integer NOT NULL,
    line_no integer NOT NULL,
    product_code text NOT NULL,
    lot_id integer NOT NULL,
    quantity double precision NOT NULL,
    unit text,
    notes text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.receipt_lines OWNER TO admin;

--
-- Name: receipt_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.receipt_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.receipt_lines_id_seq OWNER TO admin;

--
-- Name: receipt_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.receipt_lines_id_seq OWNED BY public.receipt_lines.id;


--
-- Name: sap_sync_logs; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.sap_sync_logs (
    id integer NOT NULL,
    order_id integer,
    payload text,
    result text,
    status text,
    executed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.sap_sync_logs OWNER TO admin;

--
-- Name: sap_sync_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.sap_sync_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sap_sync_logs_id_seq OWNER TO admin;

--
-- Name: sap_sync_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.sap_sync_logs_id_seq OWNED BY public.sap_sync_logs.id;


--
-- Name: shipping; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.shipping (
    id integer NOT NULL,
    lot_id integer NOT NULL,
    order_line_id integer,
    shipped_quantity double precision NOT NULL,
    shipping_date date NOT NULL,
    destination_code text,
    destination_name text,
    destination_address text,
    contact_person text,
    contact_phone text,
    delivery_time_slot text,
    tracking_number text,
    carrier text,
    carrier_service text,
    notes text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.shipping OWNER TO admin;

--
-- Name: shipping_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.shipping_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.shipping_id_seq OWNER TO admin;

--
-- Name: shipping_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.shipping_id_seq OWNED BY public.shipping.id;


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.stock_movements (
    id integer NOT NULL,
    lot_id integer,
    reason text NOT NULL,
    quantity_delta numeric(15,4) NOT NULL,
    occurred_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    product_id text NOT NULL,
    warehouse_id text NOT NULL,
    source_table character varying(50),
    source_id integer,
    batch_id character varying(100)
);


ALTER TABLE public.stock_movements OWNER TO admin;

--
-- Name: stock_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.stock_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.stock_movements_id_seq OWNER TO admin;

--
-- Name: stock_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.stock_movements_id_seq OWNED BY public.stock_movements.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.suppliers (
    supplier_code text NOT NULL,
    supplier_name text NOT NULL,
    address text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.suppliers OWNER TO admin;

--
-- Name: unit_conversions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.unit_conversions (
    id integer NOT NULL,
    product_id text NOT NULL,
    from_unit character varying(10) NOT NULL,
    to_unit character varying(10) NOT NULL,
    factor numeric(10,4) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.unit_conversions OWNER TO admin;

--
-- Name: unit_conversions_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.unit_conversions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.unit_conversions_id_seq OWNER TO admin;

--
-- Name: unit_conversions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.unit_conversions_id_seq OWNED BY public.unit_conversions.id;


--
-- Name: warehouse; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.warehouse (
    id integer NOT NULL,
    warehouse_code character varying(32) NOT NULL,
    warehouse_name character varying(128) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.warehouse OWNER TO admin;

--
-- Name: warehouse_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.warehouse_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.warehouse_id_seq OWNER TO admin;

--
-- Name: warehouse_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.warehouse_id_seq OWNED BY public.warehouse.id;


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.warehouses (
    warehouse_code text NOT NULL,
    warehouse_name text NOT NULL,
    address text,
    is_active integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    id bigint NOT NULL
);


ALTER TABLE public.warehouses OWNER TO admin;

--
-- Name: warehouses_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.warehouses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.warehouses_id_seq OWNER TO admin;

--
-- Name: warehouses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.warehouses_id_seq OWNED BY public.warehouses.id;


--
-- Name: allocations id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.allocations ALTER COLUMN id SET DEFAULT nextval('public.allocations_id_seq'::regclass);


--
-- Name: allocations_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.allocations_history ALTER COLUMN id SET DEFAULT nextval('public.allocations_history_id_seq'::regclass);


--
-- Name: delivery_places id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.delivery_places ALTER COLUMN id SET DEFAULT nextval('public.delivery_places_id_seq'::regclass);


--
-- Name: expiry_rules id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expiry_rules ALTER COLUMN id SET DEFAULT nextval('public.expiry_rules_id_seq'::regclass);


--
-- Name: forecasts id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecasts ALTER COLUMN id SET DEFAULT nextval('public.forecast_id_seq'::regclass);


--
-- Name: inbound_submissions id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inbound_submissions ALTER COLUMN id SET DEFAULT nextval('public.ocr_submissions_id_seq'::regclass);


--
-- Name: lots id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots ALTER COLUMN id SET DEFAULT nextval('public.lots_id_seq'::regclass);


--
-- Name: lots_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots_history ALTER COLUMN id SET DEFAULT nextval('public.lots_history_id_seq'::regclass);


--
-- Name: next_div_map id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.next_div_map ALTER COLUMN id SET DEFAULT nextval('public.next_div_map_id_seq'::regclass);


--
-- Name: order_line_warehouse_allocation id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_line_warehouse_allocation ALTER COLUMN id SET DEFAULT nextval('public.order_line_warehouse_allocation_id_seq'::regclass);


--
-- Name: order_lines id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines ALTER COLUMN id SET DEFAULT nextval('public.order_lines_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: orders_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders_history ALTER COLUMN id SET DEFAULT nextval('public.orders_history_id_seq'::regclass);


--
-- Name: product_uom_conversions id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.product_uom_conversions ALTER COLUMN id SET DEFAULT nextval('public.product_uom_conversions_id_seq'::regclass);


--
-- Name: purchase_requests id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchase_requests ALTER COLUMN id SET DEFAULT nextval('public.purchase_requests_id_seq'::regclass);


--
-- Name: receipt_headers id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.receipt_headers ALTER COLUMN id SET DEFAULT nextval('public.receipt_headers_id_seq'::regclass);


--
-- Name: receipt_lines id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.receipt_lines ALTER COLUMN id SET DEFAULT nextval('public.receipt_lines_id_seq'::regclass);


--
-- Name: sap_sync_logs id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.sap_sync_logs ALTER COLUMN id SET DEFAULT nextval('public.sap_sync_logs_id_seq'::regclass);


--
-- Name: shipping id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.shipping ALTER COLUMN id SET DEFAULT nextval('public.shipping_id_seq'::regclass);


--
-- Name: stock_movements id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_movements ALTER COLUMN id SET DEFAULT nextval('public.stock_movements_id_seq'::regclass);


--
-- Name: unit_conversions id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.unit_conversions ALTER COLUMN id SET DEFAULT nextval('public.unit_conversions_id_seq'::regclass);


--
-- Name: warehouse id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warehouse ALTER COLUMN id SET DEFAULT nextval('public.warehouse_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: allocations_history allocations_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.allocations_history
    ADD CONSTRAINT allocations_history_pkey PRIMARY KEY (id);


--
-- Name: allocations allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_code);


--
-- Name: delivery_places delivery_places_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.delivery_places
    ADD CONSTRAINT delivery_places_pkey PRIMARY KEY (id);


--
-- Name: expiry_rules expiry_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expiry_rules
    ADD CONSTRAINT expiry_rules_pkey PRIMARY KEY (id);


--
-- Name: forecasts forecast_forecast_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecasts
    ADD CONSTRAINT forecast_forecast_id_key UNIQUE (forecast_id);


--
-- Name: forecasts forecast_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecasts
    ADD CONSTRAINT forecast_pkey PRIMARY KEY (id);


--
-- Name: lot_current_stock lot_current_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lot_current_stock
    ADD CONSTRAINT lot_current_stock_pkey PRIMARY KEY (lot_id);


--
-- Name: lots_history lots_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots_history
    ADD CONSTRAINT lots_history_pkey PRIMARY KEY (id);


--
-- Name: lots lots_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_pkey PRIMARY KEY (id);


--
-- Name: next_div_map next_div_map_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.next_div_map
    ADD CONSTRAINT next_div_map_pkey PRIMARY KEY (id);


--
-- Name: inbound_submissions ocr_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inbound_submissions
    ADD CONSTRAINT ocr_submissions_pkey PRIMARY KEY (id);


--
-- Name: inbound_submissions ocr_submissions_submission_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inbound_submissions
    ADD CONSTRAINT ocr_submissions_submission_id_key UNIQUE (submission_id);


--
-- Name: order_line_warehouse_allocation order_line_warehouse_allocation_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_line_warehouse_allocation
    ADD CONSTRAINT order_line_warehouse_allocation_pkey PRIMARY KEY (id);


--
-- Name: order_lines order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_pkey PRIMARY KEY (id);


--
-- Name: orders_history orders_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders_history
    ADD CONSTRAINT orders_history_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_no_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_no_key UNIQUE (order_no);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_uom_conversions product_uom_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.product_uom_conversions
    ADD CONSTRAINT product_uom_conversions_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (product_code);


--
-- Name: purchase_requests purchase_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_pkey PRIMARY KEY (id);


--
-- Name: receipt_headers receipt_headers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.receipt_headers
    ADD CONSTRAINT receipt_headers_pkey PRIMARY KEY (id);


--
-- Name: receipt_headers receipt_headers_receipt_no_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.receipt_headers
    ADD CONSTRAINT receipt_headers_receipt_no_key UNIQUE (receipt_no);


--
-- Name: receipt_lines receipt_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT receipt_lines_pkey PRIMARY KEY (id);


--
-- Name: sap_sync_logs sap_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.sap_sync_logs
    ADD CONSTRAINT sap_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: shipping shipping_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.shipping
    ADD CONSTRAINT shipping_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (supplier_code);


--
-- Name: unit_conversions unit_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.unit_conversions
    ADD CONSTRAINT unit_conversions_pkey PRIMARY KEY (id);


--
-- Name: delivery_places uq_delivery_places_code; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.delivery_places
    ADD CONSTRAINT uq_delivery_places_code UNIQUE (delivery_place_code);


--
-- Name: lots uq_lot_supplier_product_no; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT uq_lot_supplier_product_no UNIQUE (supplier_code, product_code, lot_number);


--
-- Name: next_div_map uq_next_div_map_customer_ship_to_product; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.next_div_map
    ADD CONSTRAINT uq_next_div_map_customer_ship_to_product UNIQUE (customer_code, ship_to_code, product_code);


--
-- Name: order_lines uq_order_line; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT uq_order_line UNIQUE (order_id, line_no);


--
-- Name: order_line_warehouse_allocation uq_order_line_warehouse; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_line_warehouse_allocation
    ADD CONSTRAINT uq_order_line_warehouse UNIQUE (order_line_id, warehouse_id);


--
-- Name: product_uom_conversions uq_product_unit; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.product_uom_conversions
    ADD CONSTRAINT uq_product_unit UNIQUE (product_code, source_unit);


--
-- Name: unit_conversions uq_product_units; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.unit_conversions
    ADD CONSTRAINT uq_product_units UNIQUE (product_id, from_unit, to_unit);


--
-- Name: products uq_products_supplier_maker_item; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT uq_products_supplier_maker_item UNIQUE (supplier_code, maker_item_code);


--
-- Name: products uq_products_supplier_supplier_item; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT uq_products_supplier_supplier_item UNIQUE (supplier_code, supplier_item_code);


--
-- Name: receipt_lines uq_receipt_header_line; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT uq_receipt_header_line UNIQUE (header_id, line_no);


--
-- Name: warehouse warehouse_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warehouse
    ADD CONSTRAINT warehouse_pkey PRIMARY KEY (id);


--
-- Name: warehouse warehouse_warehouse_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warehouse
    ADD CONSTRAINT warehouse_warehouse_code_key UNIQUE (warehouse_code);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (warehouse_code);


--
-- Name: idx_allocations_history_alloc_valid; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_allocations_history_alloc_valid ON public.allocations_history USING btree (allocation_id, valid_from);


--
-- Name: idx_customer_product; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_customer_product ON public.forecasts USING btree (customer_id, product_id);


--
-- Name: idx_lots_history_lot_valid; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_lots_history_lot_valid ON public.lots_history USING btree (lot_id, valid_from);


--
-- Name: idx_orders_history_order_valid; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_orders_history_order_valid ON public.orders_history USING btree (order_id, valid_from);


--
-- Name: idx_stock_movements_occurred_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_stock_movements_occurred_at ON public.stock_movements USING btree (occurred_at);


--
-- Name: idx_stock_movements_product_warehouse; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_stock_movements_product_warehouse ON public.stock_movements USING btree (product_id, warehouse_id);


--
-- Name: ix_alloc_lot; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_alloc_lot ON public.allocations USING btree (lot_id);


--
-- Name: ix_alloc_ol; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_alloc_ol ON public.allocations USING btree (order_line_id);


--
-- Name: ix_delivery_places_delivery_place_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_delivery_places_delivery_place_code ON public.delivery_places USING btree (delivery_place_code);


--
-- Name: ix_lots_warehouse_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_lots_warehouse_id ON public.lots USING btree (warehouse_id);


--
-- Name: ix_stock_movements_lot; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_stock_movements_lot ON public.stock_movements USING btree (lot_id);


--
-- Name: uq_warehouses_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX uq_warehouses_id ON public.warehouses USING btree (id);


--
-- Name: allocations allocations_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: allocations allocations_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_order_line_id_fkey FOREIGN KEY (order_line_id) REFERENCES public.order_lines(id) ON DELETE CASCADE;


--
-- Name: expiry_rules expiry_rules_product_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expiry_rules
    ADD CONSTRAINT expiry_rules_product_code_fkey FOREIGN KEY (product_code) REFERENCES public.products(product_code);


--
-- Name: expiry_rules expiry_rules_supplier_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expiry_rules
    ADD CONSTRAINT expiry_rules_supplier_code_fkey FOREIGN KEY (supplier_code) REFERENCES public.suppliers(supplier_code);


--
-- Name: allocations fk_allocations_destination; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT fk_allocations_destination FOREIGN KEY (destination_id) REFERENCES public.delivery_places(id);


--
-- Name: lots fk_lots_warehouse_id__warehouses_id; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT fk_lots_warehouse_id__warehouses_id FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;


--
-- Name: order_lines fk_order_lines_destination; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT fk_order_lines_destination FOREIGN KEY (destination_id) REFERENCES public.delivery_places(id);


--
-- Name: order_lines fk_order_lines_forecast; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT fk_order_lines_forecast FOREIGN KEY (forecast_id) REFERENCES public.forecasts(id);


--
-- Name: products fk_products_delivery_place; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_delivery_place FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id);


--
-- Name: products fk_products_supplier_code; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_supplier_code FOREIGN KEY (supplier_code) REFERENCES public.suppliers(supplier_code);


--
-- Name: stock_movements fk_stock_movements_product; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) REFERENCES public.products(product_code);


--
-- Name: stock_movements fk_stock_movements_warehouse; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT fk_stock_movements_warehouse FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(warehouse_code);


--
-- Name: lot_current_stock lot_current_stock_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lot_current_stock
    ADD CONSTRAINT lot_current_stock_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: lots lots_product_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_product_code_fkey FOREIGN KEY (product_code) REFERENCES public.products(product_code);


--
-- Name: lots lots_supplier_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_supplier_code_fkey FOREIGN KEY (supplier_code) REFERENCES public.suppliers(supplier_code);


--
-- Name: lots lots_warehouse_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_warehouse_code_fkey FOREIGN KEY (warehouse_code) REFERENCES public.warehouses(warehouse_code);


--
-- Name: order_line_warehouse_allocation order_line_warehouse_allocation_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_line_warehouse_allocation
    ADD CONSTRAINT order_line_warehouse_allocation_order_line_id_fkey FOREIGN KEY (order_line_id) REFERENCES public.order_lines(id);


--
-- Name: order_line_warehouse_allocation order_line_warehouse_allocation_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_line_warehouse_allocation
    ADD CONSTRAINT order_line_warehouse_allocation_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouse(id);


--
-- Name: order_lines order_lines_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_lines order_lines_product_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_product_code_fkey FOREIGN KEY (product_code) REFERENCES public.products(product_code);


--
-- Name: orders orders_customer_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_code_fkey FOREIGN KEY (customer_code) REFERENCES public.customers(customer_code);


--
-- Name: product_uom_conversions product_uom_conversions_product_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.product_uom_conversions
    ADD CONSTRAINT product_uom_conversions_product_code_fkey FOREIGN KEY (product_code) REFERENCES public.products(product_code);


--
-- Name: purchase_requests purchase_requests_product_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_product_code_fkey FOREIGN KEY (product_code) REFERENCES public.products(product_code);


--
-- Name: purchase_requests purchase_requests_src_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_src_order_line_id_fkey FOREIGN KEY (src_order_line_id) REFERENCES public.order_lines(id);


--
-- Name: purchase_requests purchase_requests_supplier_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_supplier_code_fkey FOREIGN KEY (supplier_code) REFERENCES public.suppliers(supplier_code);


--
-- Name: receipt_headers receipt_headers_supplier_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.receipt_headers
    ADD CONSTRAINT receipt_headers_supplier_code_fkey FOREIGN KEY (supplier_code) REFERENCES public.suppliers(supplier_code);


--
-- Name: receipt_headers receipt_headers_warehouse_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.receipt_headers
    ADD CONSTRAINT receipt_headers_warehouse_code_fkey FOREIGN KEY (warehouse_code) REFERENCES public.warehouses(warehouse_code);


--
-- Name: receipt_lines receipt_lines_header_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT receipt_lines_header_id_fkey FOREIGN KEY (header_id) REFERENCES public.receipt_headers(id) ON DELETE CASCADE;


--
-- Name: receipt_lines receipt_lines_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT receipt_lines_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id);


--
-- Name: receipt_lines receipt_lines_product_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT receipt_lines_product_code_fkey FOREIGN KEY (product_code) REFERENCES public.products(product_code);


--
-- Name: sap_sync_logs sap_sync_logs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.sap_sync_logs
    ADD CONSTRAINT sap_sync_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: shipping shipping_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.shipping
    ADD CONSTRAINT shipping_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id);


--
-- Name: shipping shipping_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.shipping
    ADD CONSTRAINT shipping_order_line_id_fkey FOREIGN KEY (order_line_id) REFERENCES public.order_lines(id);


--
-- Name: stock_movements stock_movements_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: unit_conversions unit_conversions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.unit_conversions
    ADD CONSTRAINT unit_conversions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_code);


--
-- PostgreSQL database dump complete
--

\unrestrict oHbH7pzMUSsFFJLRq305TRhnyKJ4OEtsthIdpc0ZceKgSqgGBQ0Qx1U2blatoWb

