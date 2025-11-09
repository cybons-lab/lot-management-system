--
-- PostgreSQL database dump
--

\restrict j3VSBrRd7LB65qE3a1abQDlqqfu3s2Vlp7fAbsOk1yyJbhNROdCoTcZ2AiNaJ6j

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: stockmovementreason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stockmovementreason AS ENUM (
    'RECEIPT',
    'SHIPMENT',
    'ALLOCATION_HOLD',
    'ALLOCATION_RELEASE',
    'ADJUSTMENT'
);


--
-- Name: audit_write(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_write() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
  v_op  text;
  v_row jsonb;
  v_user text := current_user;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_op := 'I';
    v_row := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_op := 'U';
    v_row := to_jsonb(NEW);
  ELSE
    v_op := 'D';
    v_row := to_jsonb(OLD);
  END IF;

  EXECUTE format(
    'INSERT INTO %I.%I_history(op, changed_at, changed_by, row_data)
     VALUES ($1, now(), $2, $3)',
     TG_TABLE_SCHEMA, TG_TABLE_NAME
  ) USING v_op, v_user, v_row;

  RETURN COALESCE(NEW, OLD);
END
$_$;


--
-- Name: FUNCTION audit_write(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.audit_write() IS '任意テーブルの *_history に I/U/D と行スナップショット(JSONB)を書き込むトリガ関数';


--
-- Name: comment_on_column_if_exists(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.comment_on_column_if_exists(sch text, tbl text, col text, comm text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  exists_col boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = sch AND table_name = tbl AND column_name = col
  ) INTO exists_col;

  IF exists_col THEN
    EXECUTE format('COMMENT ON COLUMN %I.%I.%I IS %L', sch, tbl, col, comm);
  END IF;
END$$;


--
-- Name: comment_on_table_if_exists(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.comment_on_table_if_exists(sch text, tbl text, comm text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF to_regclass(format('%I.%I', sch, tbl)) IS NOT NULL THEN
    EXECUTE format('COMMENT ON TABLE %I.%I IS %L', sch, tbl, comm);
  END IF;
END$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: TABLE alembic_version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.alembic_version IS 'Alembicの現在リビジョンを保持する内部管理テーブル';


--
-- Name: COLUMN alembic_version.version_num; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.alembic_version.version_num IS 'Alembic リビジョン番号（現在HEAD）';


--
-- Name: allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allocations (
    id integer NOT NULL,
    order_line_id integer NOT NULL,
    lot_id integer NOT NULL,
    allocated_qty double precision NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    destination_id integer
);


--
-- Name: allocations_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allocations_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE allocations_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.allocations_history IS '監査履歴（allocations 用）';


--
-- Name: COLUMN allocations_history.op; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocations_history.op IS '操作種別: I/U/D';


--
-- Name: COLUMN allocations_history.changed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocations_history.changed_at IS '変更日時（トリガ時刻）';


--
-- Name: COLUMN allocations_history.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocations_history.changed_by IS '変更ユーザー（DBユーザー）';


--
-- Name: COLUMN allocations_history.row_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocations_history.row_data IS '変更後(または削除時の旧)レコードJSON';


--
-- Name: allocations_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.allocations_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: allocations_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.allocations_history_id_seq OWNED BY public.allocations_history.id;


--
-- Name: allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.allocations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.allocations_id_seq OWNED BY public.allocations.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
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
    revision integer DEFAULT 1 NOT NULL,
    id integer NOT NULL
);


--
-- Name: customers_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE customers_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customers_history IS 'customers の変更履歴（監査ログ）';


--
-- Name: customers_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_history_id_seq OWNED BY public.customers_history.id;


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: delivery_places; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_places (
    id integer NOT NULL,
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


--
-- Name: delivery_places_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_places_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE delivery_places_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.delivery_places_history IS 'delivery_places の変更履歴（監査ログ）';


--
-- Name: delivery_places_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delivery_places_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delivery_places_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delivery_places_history_id_seq OWNED BY public.delivery_places_history.id;


--
-- Name: delivery_places_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delivery_places_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delivery_places_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delivery_places_id_seq OWNED BY public.delivery_places.id;


--
-- Name: expiry_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expiry_rules (
    id integer NOT NULL,
    rule_type text NOT NULL,
    days integer,
    fixed_date date,
    is_active boolean DEFAULT true NOT NULL,
    priority integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    product_id integer,
    supplier_id integer
);


--
-- Name: expiry_rules_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expiry_rules_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE expiry_rules_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.expiry_rules_history IS 'expiry_rules の変更履歴（監査ログ）';


--
-- Name: expiry_rules_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expiry_rules_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expiry_rules_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expiry_rules_history_id_seq OWNED BY public.expiry_rules_history.id;


--
-- Name: expiry_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expiry_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expiry_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expiry_rules_id_seq OWNED BY public.expiry_rules.id;


--
-- Name: forecasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forecasts (
    id integer NOT NULL,
    forecast_id character varying(36) NOT NULL,
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
    product_id integer NOT NULL,
    customer_id integer NOT NULL,
    CONSTRAINT ck_forecast_granularity CHECK (((granularity)::text = ANY (ARRAY[('daily'::character varying)::text, ('dekad'::character varying)::text, ('monthly'::character varying)::text]))),
    CONSTRAINT ck_forecast_period_key_exclusivity CHECK (((((granularity)::text = 'daily'::text) AND (date_day IS NOT NULL) AND (date_dekad_start IS NULL) AND (year_month IS NULL)) OR (((granularity)::text = 'dekad'::text) AND (date_dekad_start IS NOT NULL) AND (date_day IS NULL) AND (year_month IS NULL)) OR (((granularity)::text = 'monthly'::text) AND (year_month IS NOT NULL) AND (date_day IS NULL) AND (date_dekad_start IS NULL)))),
    CONSTRAINT ck_forecast_qty_nonneg CHECK ((qty_forecast >= 0))
);


--
-- Name: forecast_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forecast_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forecast_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forecast_id_seq OWNED BY public.forecasts.id;


--
-- Name: forecasts_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forecasts_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE forecasts_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.forecasts_history IS 'forecasts の変更履歴（監査ログ）';


--
-- Name: forecasts_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forecasts_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forecasts_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forecasts_history_id_seq OWNED BY public.forecasts_history.id;


--
-- Name: inbound_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inbound_submissions (
    id integer NOT NULL,
    submission_id text,
    source_uri text,
    source character varying(20) DEFAULT 'ocr'::character varying NOT NULL,
    operator text,
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
    revision integer DEFAULT 1 NOT NULL,
    CONSTRAINT ck_inbound_submissions_source CHECK (((source)::text = ANY (ARRAY[('ocr'::character varying)::text, ('manual'::character varying)::text, ('edi'::character varying)::text])))
);


--
-- Name: inbound_submissions_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inbound_submissions_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE inbound_submissions_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inbound_submissions_history IS 'inbound_submissions の変更履歴（監査ログ）';


--
-- Name: inbound_submissions_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inbound_submissions_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inbound_submissions_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inbound_submissions_history_id_seq OWNED BY public.inbound_submissions_history.id;


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
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
    warehouse_id integer NOT NULL,
    source_table character varying(50),
    source_id integer,
    batch_id character varying(100),
    product_id integer NOT NULL
);


--
-- Name: lot_current_stock; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lot_current_stock AS
 SELECT sm.lot_id,
    sm.product_id,
    sm.warehouse_id,
    (sum(sm.quantity_delta))::numeric(15,4) AS current_quantity,
    COALESCE(max(sm.occurred_at), max(sm.created_at)) AS last_updated
   FROM public.stock_movements sm
  WHERE ((sm.deleted_at IS NULL) AND (sm.lot_id IS NOT NULL))
  GROUP BY sm.lot_id, sm.product_id, sm.warehouse_id
 HAVING (sum(sm.quantity_delta) <> (0)::numeric);


--
-- Name: lot_current_stock_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_current_stock_backup (
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


--
-- Name: lot_current_stock_history_backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_current_stock_history_backup (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE lot_current_stock_history_backup; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lot_current_stock_history_backup IS 'lot_current_stock の変更履歴（監査ログ）';


--
-- Name: lot_current_stock_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lot_current_stock_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lot_current_stock_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lot_current_stock_history_id_seq OWNED BY public.lot_current_stock_history_backup.id;


--
-- Name: lots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lots (
    id integer NOT NULL,
    lot_number text NOT NULL,
    receipt_date date NOT NULL,
    mfg_date date,
    expiry_date date,
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
    warehouse_id integer,
    product_id integer,
    supplier_id integer,
    product_code text,
    supplier_code text,
    warehouse_code text
);


--
-- Name: lots_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lots_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE lots_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lots_history IS '監査履歴（lots 用）';


--
-- Name: COLUMN lots_history.op; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lots_history.op IS '操作種別: I/U/D';


--
-- Name: COLUMN lots_history.changed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lots_history.changed_at IS '変更日時（トリガ時刻）';


--
-- Name: COLUMN lots_history.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lots_history.changed_by IS '変更ユーザー（DBユーザー）';


--
-- Name: COLUMN lots_history.row_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lots_history.row_data IS '変更後(または削除時の旧)レコードJSON';


--
-- Name: lots_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lots_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lots_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lots_history_id_seq OWNED BY public.lots_history.id;


--
-- Name: lots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lots_id_seq OWNED BY public.lots.id;


--
-- Name: next_div_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.next_div_map (
    id integer NOT NULL,
    customer_code text NOT NULL,
    ship_to_code text NOT NULL,
    product_code text NOT NULL,
    next_div text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


--
-- Name: next_div_map_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.next_div_map_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: next_div_map_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.next_div_map_id_seq OWNED BY public.next_div_map.id;


--
-- Name: ocr_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ocr_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ocr_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ocr_submissions_id_seq OWNED BY public.inbound_submissions.id;


--
-- Name: order_line_warehouse_allocation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_line_warehouse_allocation (
    id integer NOT NULL,
    order_line_id integer NOT NULL,
    warehouse_id integer NOT NULL,
    quantity numeric(15,4) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    CONSTRAINT ck_olwa_quantity_positive CHECK (((quantity)::double precision > (0)::double precision))
);


--
-- Name: order_line_warehouse_allocation_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_line_warehouse_allocation_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE order_line_warehouse_allocation_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.order_line_warehouse_allocation_history IS 'order_line_warehouse_allocation の変更履歴（監査ログ）';


--
-- Name: order_line_warehouse_allocation_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_line_warehouse_allocation_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_line_warehouse_allocation_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_line_warehouse_allocation_history_id_seq OWNED BY public.order_line_warehouse_allocation_history.id;


--
-- Name: order_line_warehouse_allocation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_line_warehouse_allocation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_line_warehouse_allocation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_line_warehouse_allocation_id_seq OWNED BY public.order_line_warehouse_allocation.id;


--
-- Name: order_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_lines (
    id integer NOT NULL,
    order_id integer NOT NULL,
    line_no integer NOT NULL,
    quantity numeric(15,4) NOT NULL,
    unit text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    product_id integer,
    product_code text
);


--
-- Name: order_lines_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_lines_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE order_lines_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.order_lines_history IS '監査履歴（order_lines 用）';


--
-- Name: COLUMN order_lines_history.op; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines_history.op IS '操作種別: I/U/D';


--
-- Name: COLUMN order_lines_history.changed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines_history.changed_at IS '変更日時（トリガ時刻）';


--
-- Name: COLUMN order_lines_history.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines_history.changed_by IS '変更ユーザー（DBユーザー）';


--
-- Name: COLUMN order_lines_history.row_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines_history.row_data IS '変更後(または削除時の旧)レコードJSON';


--
-- Name: order_lines_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_lines_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_lines_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_lines_history_id_seq OWNED BY public.order_lines_history.id;


--
-- Name: order_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_lines_id_seq OWNED BY public.order_lines.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    order_no text NOT NULL,
    order_date date NOT NULL,
    status text NOT NULL,
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
    delivery_mode text,
    customer_id integer,
    customer_order_no_last6 character varying(6) GENERATED ALWAYS AS ("right"(customer_order_no, 6)) STORED,
    customer_code text,
    CONSTRAINT ck_orders_delivery_mode CHECK (((delivery_mode IS NULL) OR (delivery_mode = ANY (ARRAY['normal'::text, 'express'::text, 'pickup'::text])))),
    CONSTRAINT ck_orders_status CHECK ((status = ANY (ARRAY['draft'::text, 'confirmed'::text, 'shipped'::text, 'closed'::text])))
);


--
-- Name: orders_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE orders_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.orders_history IS '監査履歴（orders 用）';


--
-- Name: COLUMN orders_history.op; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders_history.op IS '操作種別: I/U/D';


--
-- Name: COLUMN orders_history.changed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders_history.changed_at IS '変更日時（トリガ時刻）';


--
-- Name: COLUMN orders_history.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders_history.changed_by IS '変更ユーザー（DBユーザー）';


--
-- Name: COLUMN orders_history.row_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders_history.row_data IS '変更後(または削除時の旧)レコードJSON';


--
-- Name: orders_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_history_id_seq OWNED BY public.orders_history.id;


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: product_uom_conversions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: product_uom_conversions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_uom_conversions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_uom_conversions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_uom_conversions_id_seq OWNED BY public.product_uom_conversions.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
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
    delivery_place_id integer,
    ji_ku_text character varying,
    kumitsuke_ku_text character varying,
    delivery_place_name character varying,
    shipping_warehouse_name character varying,
    id integer NOT NULL,
    supplier_id integer
);


--
-- Name: products_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE products_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.products_history IS '監査履歴（products 用）';


--
-- Name: COLUMN products_history.op; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products_history.op IS '操作種別: I/U/D';


--
-- Name: COLUMN products_history.changed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products_history.changed_at IS '変更日時（トリガ時刻）';


--
-- Name: COLUMN products_history.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products_history.changed_by IS '変更ユーザー（DBユーザー）';


--
-- Name: COLUMN products_history.row_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products_history.row_data IS '変更後(または削除時の旧)レコードJSON';


--
-- Name: products_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_history_id_seq OWNED BY public.products_history.id;


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: purchase_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_requests (
    id integer NOT NULL,
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
    revision integer DEFAULT 1 NOT NULL,
    product_id integer,
    supplier_id integer
);


--
-- Name: purchase_requests_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_requests_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE purchase_requests_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.purchase_requests_history IS 'purchase_requests の変更履歴（監査ログ）';


--
-- Name: purchase_requests_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_requests_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_requests_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_requests_history_id_seq OWNED BY public.purchase_requests_history.id;


--
-- Name: purchase_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_requests_id_seq OWNED BY public.purchase_requests.id;


--
-- Name: receipt_headers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipt_headers (
    id integer NOT NULL,
    receipt_no text,
    supplier_code text NOT NULL,
    warehouse_id integer NOT NULL,
    receipt_date date NOT NULL,
    created_by text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


--
-- Name: receipt_headers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.receipt_headers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: receipt_headers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.receipt_headers_id_seq OWNED BY public.receipt_headers.id;


--
-- Name: receipt_lines; Type: TABLE; Schema: public; Owner: -
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
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


--
-- Name: receipt_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.receipt_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: receipt_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.receipt_lines_id_seq OWNED BY public.receipt_lines.id;


--
-- Name: sap_sync_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: sap_sync_logs_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_sync_logs_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE sap_sync_logs_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sap_sync_logs_history IS 'sap_sync_logs の変更履歴（監査ログ）';


--
-- Name: sap_sync_logs_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sap_sync_logs_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sap_sync_logs_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sap_sync_logs_history_id_seq OWNED BY public.sap_sync_logs_history.id;


--
-- Name: sap_sync_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sap_sync_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sap_sync_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sap_sync_logs_id_seq OWNED BY public.sap_sync_logs.id;


--
-- Name: shipping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping (
    id integer NOT NULL,
    lot_id integer NOT NULL,
    order_line_id integer,
    shipped_qty double precision NOT NULL,
    shipped_date date,
    shipping_address text,
    contact_person text,
    contact_phone text,
    delivery_time_slot text,
    tracking_number text,
    carrier text,
    carrier_service text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


--
-- Name: shipping_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shipping_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shipping_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shipping_id_seq OWNED BY public.shipping.id;


--
-- Name: stock_movements_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movements_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE stock_movements_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stock_movements_history IS 'stock_movements の変更履歴（監査ログ）';


--
-- Name: stock_movements_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_movements_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_movements_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_movements_history_id_seq OWNED BY public.stock_movements_history.id;


--
-- Name: stock_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_movements_id_seq OWNED BY public.stock_movements.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
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
    revision integer DEFAULT 1 NOT NULL,
    id integer NOT NULL
);


--
-- Name: suppliers_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE suppliers_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.suppliers_history IS 'suppliers の変更履歴（監査ログ）';


--
-- Name: suppliers_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_history_id_seq OWNED BY public.suppliers_history.id;


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: unit_conversions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unit_conversions (
    id integer NOT NULL,
    from_unit character varying(10) NOT NULL,
    to_unit character varying(10) NOT NULL,
    factor numeric(10,4) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    product_id integer NOT NULL
);


--
-- Name: unit_conversions_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unit_conversions_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE unit_conversions_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.unit_conversions_history IS 'unit_conversions の変更履歴（監査ログ）';


--
-- Name: unit_conversions_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unit_conversions_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unit_conversions_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unit_conversions_history_id_seq OWNED BY public.unit_conversions_history.id;


--
-- Name: unit_conversions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unit_conversions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unit_conversions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unit_conversions_id_seq OWNED BY public.unit_conversions.id;


--
-- Name: warehouse; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouse (
    id integer NOT NULL,
    warehouse_code character varying(32) NOT NULL,
    warehouse_name character varying(128) NOT NULL,
    address text,
    is_active integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL
);


--
-- Name: warehouse_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouse_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouse_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouse_id_seq OWNED BY public.warehouse.id;


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouses (
    warehouse_code text NOT NULL,
    warehouse_name text NOT NULL,
    address text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    id integer NOT NULL
);


--
-- Name: warehouses_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouses_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


--
-- Name: TABLE warehouses_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.warehouses_history IS '監査履歴（warehouses 用）';


--
-- Name: COLUMN warehouses_history.op; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouses_history.op IS '操作種別: I/U/D';


--
-- Name: COLUMN warehouses_history.changed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouses_history.changed_at IS '変更日時（トリガ時刻）';


--
-- Name: COLUMN warehouses_history.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouses_history.changed_by IS '変更ユーザー（DBユーザー）';


--
-- Name: COLUMN warehouses_history.row_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouses_history.row_data IS '変更後(または削除時の旧)レコードJSON';


--
-- Name: warehouses_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouses_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouses_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouses_history_id_seq OWNED BY public.warehouses_history.id;


--
-- Name: warehouses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouses_id_seq OWNED BY public.warehouses.id;


--
-- Name: allocations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations ALTER COLUMN id SET DEFAULT nextval('public.allocations_id_seq'::regclass);


--
-- Name: allocations_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations_history ALTER COLUMN id SET DEFAULT nextval('public.allocations_history_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: customers_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers_history ALTER COLUMN id SET DEFAULT nextval('public.customers_history_id_seq'::regclass);


--
-- Name: delivery_places id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_places ALTER COLUMN id SET DEFAULT nextval('public.delivery_places_id_seq'::regclass);


--
-- Name: delivery_places_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_places_history ALTER COLUMN id SET DEFAULT nextval('public.delivery_places_history_id_seq'::regclass);


--
-- Name: expiry_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_rules ALTER COLUMN id SET DEFAULT nextval('public.expiry_rules_id_seq'::regclass);


--
-- Name: expiry_rules_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_rules_history ALTER COLUMN id SET DEFAULT nextval('public.expiry_rules_history_id_seq'::regclass);


--
-- Name: forecasts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasts ALTER COLUMN id SET DEFAULT nextval('public.forecast_id_seq'::regclass);


--
-- Name: forecasts_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasts_history ALTER COLUMN id SET DEFAULT nextval('public.forecasts_history_id_seq'::regclass);


--
-- Name: inbound_submissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_submissions ALTER COLUMN id SET DEFAULT nextval('public.ocr_submissions_id_seq'::regclass);


--
-- Name: inbound_submissions_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_submissions_history ALTER COLUMN id SET DEFAULT nextval('public.inbound_submissions_history_id_seq'::regclass);


--
-- Name: lot_current_stock_history_backup id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_current_stock_history_backup ALTER COLUMN id SET DEFAULT nextval('public.lot_current_stock_history_id_seq'::regclass);


--
-- Name: lots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots ALTER COLUMN id SET DEFAULT nextval('public.lots_id_seq'::regclass);


--
-- Name: lots_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots_history ALTER COLUMN id SET DEFAULT nextval('public.lots_history_id_seq'::regclass);


--
-- Name: next_div_map id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.next_div_map ALTER COLUMN id SET DEFAULT nextval('public.next_div_map_id_seq'::regclass);


--
-- Name: order_line_warehouse_allocation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_warehouse_allocation ALTER COLUMN id SET DEFAULT nextval('public.order_line_warehouse_allocation_id_seq'::regclass);


--
-- Name: order_line_warehouse_allocation_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_warehouse_allocation_history ALTER COLUMN id SET DEFAULT nextval('public.order_line_warehouse_allocation_history_id_seq'::regclass);


--
-- Name: order_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines ALTER COLUMN id SET DEFAULT nextval('public.order_lines_id_seq'::regclass);


--
-- Name: order_lines_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines_history ALTER COLUMN id SET DEFAULT nextval('public.order_lines_history_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: orders_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_history ALTER COLUMN id SET DEFAULT nextval('public.orders_history_id_seq'::regclass);


--
-- Name: product_uom_conversions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_uom_conversions ALTER COLUMN id SET DEFAULT nextval('public.product_uom_conversions_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: products_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products_history ALTER COLUMN id SET DEFAULT nextval('public.products_history_id_seq'::regclass);


--
-- Name: purchase_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests ALTER COLUMN id SET DEFAULT nextval('public.purchase_requests_id_seq'::regclass);


--
-- Name: purchase_requests_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests_history ALTER COLUMN id SET DEFAULT nextval('public.purchase_requests_history_id_seq'::regclass);


--
-- Name: receipt_headers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_headers ALTER COLUMN id SET DEFAULT nextval('public.receipt_headers_id_seq'::regclass);


--
-- Name: receipt_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_lines ALTER COLUMN id SET DEFAULT nextval('public.receipt_lines_id_seq'::regclass);


--
-- Name: sap_sync_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_sync_logs ALTER COLUMN id SET DEFAULT nextval('public.sap_sync_logs_id_seq'::regclass);


--
-- Name: sap_sync_logs_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_sync_logs_history ALTER COLUMN id SET DEFAULT nextval('public.sap_sync_logs_history_id_seq'::regclass);


--
-- Name: shipping id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping ALTER COLUMN id SET DEFAULT nextval('public.shipping_id_seq'::regclass);


--
-- Name: stock_movements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements ALTER COLUMN id SET DEFAULT nextval('public.stock_movements_id_seq'::regclass);


--
-- Name: stock_movements_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements_history ALTER COLUMN id SET DEFAULT nextval('public.stock_movements_history_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: suppliers_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers_history ALTER COLUMN id SET DEFAULT nextval('public.suppliers_history_id_seq'::regclass);


--
-- Name: unit_conversions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_conversions ALTER COLUMN id SET DEFAULT nextval('public.unit_conversions_id_seq'::regclass);


--
-- Name: unit_conversions_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_conversions_history ALTER COLUMN id SET DEFAULT nextval('public.unit_conversions_history_id_seq'::regclass);


--
-- Name: warehouse id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse ALTER COLUMN id SET DEFAULT nextval('public.warehouse_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Name: warehouses_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses_history ALTER COLUMN id SET DEFAULT nextval('public.warehouses_history_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
744d13c795bd
\.


--
-- Data for Name: allocations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.allocations (id, order_line_id, lot_id, allocated_qty, created_at, updated_at, created_by, updated_by, deleted_at, revision, destination_id) FROM stdin;
\.


--
-- Data for Name: allocations_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.allocations_history (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (customer_code, customer_name, address, created_at, updated_at, created_by, updated_by, deleted_at, revision, id) FROM stdin;
CUST-001	得意先A	Tokyo	2025-11-08 22:35:27.137605	2025-11-08 22:35:27.137605	\N	\N	\N	1	1
CUST-20251108224549	得意先A	Tokyo	2025-11-08 22:45:49.78652	2025-11-08 22:45:49.78652	\N	\N	\N	1	2
C-001	テスト得意先	\N	2025-11-08 23:34:11.632543	2025-11-08 23:34:11.632543	\N	\N	\N	1	3
C1043	株式会社石川運輸	\N	2025-11-09 10:56:44.478895	2025-11-09 19:56:44.620348	\N	\N	\N	1	4
C8196	株式会社鈴木建設	\N	2025-11-09 10:56:44.553923	2025-11-09 19:56:44.620348	\N	\N	\N	1	5
C2824	株式会社中島建設	\N	2025-11-09 11:13:41.962412	2025-11-09 20:13:41.960658	seed	seed	\N	1	7
C1409	株式会社石川運輸	\N	2025-11-09 11:13:41.962455	2025-11-09 20:13:41.960658	seed	seed	\N	1	8
C5506	合同会社吉田水産	\N	2025-11-09 11:13:41.962489	2025-11-09 20:13:41.960658	seed	seed	\N	1	9
C5012	株式会社中島建設	\N	2025-11-09 11:16:26.393725	2025-11-09 20:16:26.391736	\N	\N	\N	1	10
C4657	株式会社石川運輸	\N	2025-11-09 11:16:26.39381	2025-11-09 20:16:26.391736	\N	\N	\N	1	11
C3286	合同会社吉田水産	\N	2025-11-09 11:16:26.393851	2025-11-09 20:16:26.391736	\N	\N	\N	1	12
\.


--
-- Data for Name: customers_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-08 23:34:11.632543+09	admin	{"id": 3, "address": null, "revision": 1, "created_at": "2025-11-08T23:34:11.632543", "created_by": null, "deleted_at": null, "updated_at": "2025-11-08T23:34:11.632543", "updated_by": null, "customer_code": "C-001", "customer_name": "テスト得意先"}
2	I	2025-11-09 19:56:44.620348+09	admin	{"id": 4, "address": null, "revision": 1, "created_at": "2025-11-09T10:56:44.478895", "created_by": null, "deleted_at": null, "updated_at": "2025-11-09T19:56:44.620348", "updated_by": null, "customer_code": "C1043", "customer_name": "株式会社石川運輸"}
3	I	2025-11-09 19:56:44.620348+09	admin	{"id": 5, "address": null, "revision": 1, "created_at": "2025-11-09T10:56:44.553923", "created_by": null, "deleted_at": null, "updated_at": "2025-11-09T19:56:44.620348", "updated_by": null, "customer_code": "C8196", "customer_name": "株式会社鈴木建設"}
4	I	2025-11-09 20:13:41.960658+09	admin	{"id": 7, "address": null, "revision": 1, "created_at": "2025-11-09T11:13:41.962412", "created_by": "seed", "deleted_at": null, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": "seed", "customer_code": "C2824", "customer_name": "株式会社中島建設"}
5	I	2025-11-09 20:13:41.960658+09	admin	{"id": 8, "address": null, "revision": 1, "created_at": "2025-11-09T11:13:41.962455", "created_by": "seed", "deleted_at": null, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": "seed", "customer_code": "C1409", "customer_name": "株式会社石川運輸"}
6	I	2025-11-09 20:13:41.960658+09	admin	{"id": 9, "address": null, "revision": 1, "created_at": "2025-11-09T11:13:41.962489", "created_by": "seed", "deleted_at": null, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": "seed", "customer_code": "C5506", "customer_name": "合同会社吉田水産"}
7	I	2025-11-09 20:16:26.391736+09	admin	{"id": 10, "address": null, "revision": 1, "created_at": "2025-11-09T11:16:26.393725", "created_by": null, "deleted_at": null, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "customer_code": "C5012", "customer_name": "株式会社中島建設"}
8	I	2025-11-09 20:16:26.391736+09	admin	{"id": 11, "address": null, "revision": 1, "created_at": "2025-11-09T11:16:26.39381", "created_by": null, "deleted_at": null, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "customer_code": "C4657", "customer_name": "株式会社石川運輸"}
9	I	2025-11-09 20:16:26.391736+09	admin	{"id": 12, "address": null, "revision": 1, "created_at": "2025-11-09T11:16:26.393851", "created_by": null, "deleted_at": null, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "customer_code": "C3286", "customer_name": "合同会社吉田水産"}
\.


--
-- Data for Name: delivery_places; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.delivery_places (id, delivery_place_code, delivery_place_name, address, postal_code, is_active, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
1	D-001	第一納品先	\N	\N	t	2025-11-08 23:34:11.632543	2025-11-08 23:34:11.632543	\N	\N	\N	1
\.


--
-- Data for Name: delivery_places_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.delivery_places_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-08 23:34:11.632543+09	admin	{"id": 1, "address": null, "revision": 1, "is_active": true, "created_at": "2025-11-08T23:34:11.632543", "created_by": null, "deleted_at": null, "updated_at": "2025-11-08T23:34:11.632543", "updated_by": null, "postal_code": null, "delivery_place_code": "D-001", "delivery_place_name": "第一納品先"}
\.


--
-- Data for Name: expiry_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expiry_rules (id, rule_type, days, fixed_date, is_active, priority, created_at, updated_at, created_by, updated_by, deleted_at, revision, product_id, supplier_id) FROM stdin;
\.


--
-- Data for Name: expiry_rules_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expiry_rules_history (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: forecasts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.forecasts (id, forecast_id, granularity, date_day, date_dekad_start, year_month, qty_forecast, version_no, version_issued_at, source_system, is_active, created_at, updated_at, created_by, updated_by, deleted_at, revision, product_id, customer_id) FROM stdin;
\.


--
-- Data for Name: forecasts_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.forecasts_history (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: inbound_submissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inbound_submissions (id, submission_id, source_uri, source, operator, submission_date, status, total_records, processed_records, failed_records, skipped_records, error_details, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: inbound_submissions_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inbound_submissions_history (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: lot_current_stock_backup; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lot_current_stock_backup (lot_id, current_quantity, last_updated, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: lot_current_stock_history_backup; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lot_current_stock_history_backup (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: lots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lots (id, lot_number, receipt_date, mfg_date, expiry_date, kanban_class, sales_unit, inventory_unit, received_by, source_doc, qc_certificate_status, qc_certificate_file, created_at, updated_at, created_by, updated_by, deleted_at, revision, warehouse_code_old, lot_unit, is_locked, lock_reason, inspection_date, inspection_result, warehouse_id, product_id, supplier_id, product_code, supplier_code, warehouse_code) FROM stdin;
1	LOT-40781618	2025-10-17	\N	2026-10-23	\N	\N	\N	\N	\N	\N	\N	2025-11-09 10:56:44.679016	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	9	4	\N	\N	\N	\N
2	LOT-49593103	2025-10-17	\N	2026-08-25	\N	\N	\N	\N	\N	\N	\N	2025-11-09 10:56:44.693139	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	9	2	\N	\N	\N	\N
3	LOT-41316475	2025-10-27	\N	2026-01-06	\N	\N	\N	\N	\N	\N	\N	2025-11-09 10:56:44.704706	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	9	4	\N	\N	\N	\N
4	LOT-25534192	2025-11-02	\N	2026-07-16	\N	\N	\N	\N	\N	\N	\N	2025-11-09 10:56:44.708168	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	9	2	\N	\N	\N	\N
5	LOT-83276483	2025-11-03	\N	2026-01-21	\N	\N	\N	\N	\N	\N	\N	2025-11-09 10:56:44.712289	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	9	4	\N	\N	\N	\N
6	LOT-34131647	2025-10-17	\N	2026-08-25	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:41.992292	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	6	\N	\N	\N	\N
7	LOT-52553419	2025-10-27	\N	2026-01-06	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.000869	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	9	\N	\N	\N	\N
8	LOT-28327648	2025-11-02	\N	2026-07-16	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.009984	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	5	\N	\N	\N	\N
9	LOT-35030564	2025-11-03	\N	2026-01-21	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.015473	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	9	\N	\N	\N	\N
10	LOT-13953767	2025-10-26	\N	2026-07-15	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.019978	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	9	\N	\N	\N	\N
11	LOT-24238849	2025-10-18	\N	2026-08-15	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.024835	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	7	\N	\N	\N	\N
12	LOT-69653287	2025-11-03	\N	2026-08-17	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.0312	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	7	\N	\N	\N	\N
13	LOT-10122691	2025-10-28	\N	2026-09-18	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.036249	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	7	\N	\N	\N	\N
14	LOT-66978480	2025-11-01	\N	2025-12-30	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.040011	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	7	\N	\N	\N	\N
15	LOT-18451462	2025-11-07	\N	2026-04-25	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.044979	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	8	\N	\N	\N	\N
16	LOT-70482814	2025-11-03	\N	2026-01-13	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.04936	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	7	\N	\N	\N	\N
17	LOT-89325288	2025-11-02	\N	2025-12-01	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.052852	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	5	\N	\N	\N	\N
18	LOT-09570154	2025-10-28	\N	2026-09-14	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.057333	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	5	\N	\N	\N	\N
19	LOT-30391171	2025-10-29	\N	2026-08-13	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.061525	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	8	\N	\N	\N	\N
20	LOT-82278248	2025-10-11	\N	2025-11-10	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.066498	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	6	\N	\N	\N	\N
21	LOT-96383465	2025-10-17	\N	2026-02-04	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.070938	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	5	\N	\N	\N	\N
22	LOT-78713315	2025-11-01	\N	2026-04-24	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.074891	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	6	\N	\N	\N	\N
23	LOT-09839301	2025-10-30	\N	2025-11-19	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.080507	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	9	\N	\N	\N	\N
24	LOT-03105183	2025-10-28	\N	2026-05-27	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.086009	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	6	\N	\N	\N	\N
25	LOT-47382997	2025-10-12	\N	2026-01-18	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.089897	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	5	\N	\N	\N	\N
26	LOT-37631165	2025-10-25	\N	2025-12-04	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.094722	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	7	\N	\N	\N	\N
27	LOT-66701065	2025-11-05	\N	2026-06-22	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.099955	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	8	\N	\N	\N	\N
28	LOT-13338726	2025-10-27	\N	2026-01-09	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.104277	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	9	\N	\N	\N	\N
29	LOT-24731781	2025-11-05	\N	2026-07-15	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.109512	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	8	\N	\N	\N	\N
30	LOT-08013267	2025-10-13	\N	2026-10-11	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.114903	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	8	\N	\N	\N	\N
31	LOT-73602606	2025-10-27	\N	2025-11-21	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.120311	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	6	\N	\N	\N	\N
32	LOT-47468723	2025-10-21	\N	2026-04-23	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.12651	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	5	\N	\N	\N	\N
33	LOT-43098050	2025-10-13	\N	2026-01-25	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.131418	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	9	\N	\N	\N	\N
34	LOT-09788208	2025-10-30	\N	2025-12-11	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.135994	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	5	\N	\N	\N	\N
35	LOT-12191361	2025-10-26	\N	2026-08-16	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.141628	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	7	\N	\N	\N	\N
36	LOT-93990916	2025-10-11	\N	2026-02-18	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.146553	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	7	\N	\N	\N	\N
37	LOT-99854353	2025-10-29	\N	2026-08-18	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.150861	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	7	\N	\N	\N	\N
38	LOT-46247510	2025-10-30	\N	2026-01-02	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.156125	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	6	\N	\N	\N	\N
39	LOT-79911838	2025-10-12	\N	2026-05-03	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.160244	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	5	\N	\N	\N	\N
40	LOT-42513542	2025-10-12	\N	2026-07-04	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.163886	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	6	\N	\N	\N	\N
41	LOT-78498084	2025-10-14	\N	2026-03-01	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.16822	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	5	\N	\N	\N	\N
42	LOT-12411824	2025-10-19	\N	2026-08-31	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.172453	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	9	\N	\N	\N	\N
43	LOT-49353487	2025-10-24	\N	2026-06-22	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.178291	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	9	\N	\N	\N	\N
44	LOT-40164005	2025-10-16	\N	2026-02-01	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.184824	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	8	\N	\N	\N	\N
45	LOT-24278680	2025-10-19	\N	2026-04-14	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.190792	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	6	\N	\N	\N	\N
46	LOT-11280598	2025-10-26	\N	2026-02-13	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.195663	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	7	\N	\N	\N	\N
47	LOT-26204505	2025-10-30	\N	2026-10-03	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.201006	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	6	\N	\N	\N	\N
48	LOT-33158692	2025-11-02	\N	2026-01-07	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.205912	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	9	\N	\N	\N	\N
49	LOT-32260256	2025-11-07	\N	2026-07-10	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.210786	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	5	\N	\N	\N	\N
50	LOT-34216073	2025-11-02	\N	2026-02-14	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.215094	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	7	\N	\N	\N	\N
51	LOT-37543303	2025-11-05	\N	2026-02-01	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.220739	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	8	\N	\N	\N	\N
52	LOT-65414586	2025-10-15	\N	2026-07-03	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.225577	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	9	\N	\N	\N	\N
53	LOT-85014294	2025-11-06	\N	2026-09-17	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.230465	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	8	\N	\N	\N	\N
54	LOT-01965569	2025-10-27	\N	2026-04-02	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.236329	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	8	\N	\N	\N	\N
55	LOT-81693406	2025-10-28	\N	2026-10-04	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:13:42.241186	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	5	\N	\N	\N	\N
56	LOT-23511615	2025-11-02	\N	2026-07-16	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.429197	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	8	1	\N	\N	\N	\N
57	LOT-59407816	2025-11-03	\N	2026-01-21	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.440669	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	8	10	\N	\N	\N	\N
58	LOT-18495931	2025-10-27	\N	2026-01-29	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.451351	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	13	11	\N	\N	\N	\N
59	LOT-03413164	2025-10-15	\N	2026-06-15	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.456961	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	12	8	\N	\N	\N	\N
60	LOT-75255341	2025-10-27	\N	2025-11-12	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.461596	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	9	13	\N	\N	\N	\N
61	LOT-92832764	2025-10-10	\N	2026-07-17	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.467735	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	9	5	\N	\N	\N	\N
62	LOT-83503056	2025-10-28	\N	2026-09-18	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.473731	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	8	6	\N	\N	\N	\N
63	LOT-41395376	2025-11-01	\N	2025-12-30	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.480012	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	6	\N	\N	\N	\N
64	LOT-72423884	2025-11-06	\N	2026-02-03	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.484887	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	12	\N	\N	\N	\N
65	LOT-96965328	2025-10-14	\N	2026-06-07	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.488767	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	12	2	\N	\N	\N	\N
66	LOT-71012269	2025-11-03	\N	2026-01-13	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.493872	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	10	\N	\N	\N	\N
67	LOT-16697848	2025-11-02	\N	2025-12-01	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.498638	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	8	2	\N	\N	\N	\N
68	LOT-01845146	2025-10-28	\N	2026-09-14	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.502806	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	9	2	\N	\N	\N	\N
69	LOT-27048281	2025-11-04	\N	2026-05-02	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.508018	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	13	8	\N	\N	\N	\N
70	LOT-48932528	2025-11-01	\N	2025-11-26	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.512376	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	9	6	\N	\N	\N	\N
71	LOT-80957015	2025-10-21	\N	2026-09-29	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.516659	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	13	11	\N	\N	\N	\N
72	LOT-43039117	2025-11-04	\N	2026-07-02	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.521876	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	12	3	\N	\N	\N	\N
73	LOT-18227824	2025-10-18	\N	2025-12-12	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.526319	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	7	\N	\N	\N	\N
74	LOT-89638346	2025-10-14	\N	2026-05-22	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.531454	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	13	4	\N	\N	\N	\N
75	LOT-57871331	2025-10-28	\N	2026-05-27	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.536378	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	8	4	\N	\N	\N	\N
76	LOT-50983930	2025-10-12	\N	2026-01-18	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.541995	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	9	2	\N	\N	\N	\N
77	LOT-10310518	2025-10-25	\N	2025-12-04	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.547181	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	9	6	\N	\N	\N	\N
78	LOT-34738299	2025-11-01	\N	2026-08-23	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.551511	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	11	\N	\N	\N	\N
79	LOT-73763116	2025-10-23	\N	2026-01-21	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.559943	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	13	4	\N	\N	\N	\N
80	LOT-56670106	2025-10-12	\N	2026-03-30	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.565543	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	12	12	\N	\N	\N	\N
81	LOT-51333872	2025-11-05	\N	2026-07-15	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.571243	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	7	\N	\N	\N	\N
82	LOT-62473178	2025-10-13	\N	2026-10-11	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.577234	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	8	8	\N	\N	\N	\N
83	LOT-10801326	2025-10-15	\N	2026-08-15	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.585182	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	13	3	\N	\N	\N	\N
84	LOT-77360260	2025-10-28	\N	2026-10-03	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.59164	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	12	7	\N	\N	\N	\N
85	LOT-64746872	2025-11-01	\N	2026-02-07	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.597869	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	11	10	\N	\N	\N	\N
86	LOT-34309805	2025-10-17	\N	2025-11-21	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.604494	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	8	14	\N	\N	\N	\N
87	LOT-00978820	2025-10-16	\N	2026-06-21	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.609087	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	12	11	\N	\N	\N	\N
88	LOT-81219136	2025-10-27	\N	2026-06-07	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.614412	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	8	6	\N	\N	\N	\N
89	LOT-19399091	2025-10-24	\N	2026-06-23	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.619844	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	8	8	\N	\N	\N	\N
90	LOT-69985435	2025-10-13	\N	2026-09-11	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.626402	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	12	3	\N	\N	\N	\N
91	LOT-34624751	2025-10-21	\N	2026-02-18	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.631831	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	13	5	\N	\N	\N	\N
92	LOT-07991183	2025-10-23	\N	2026-08-14	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.635354	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	3	\N	\N	\N	\N
93	LOT-84251354	2025-10-25	\N	2026-05-23	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.638561	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	12	1	\N	\N	\N	\N
94	LOT-27849808	2025-11-02	\N	2026-05-31	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.64241	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	2	\N	\N	\N	\N
95	LOT-41241182	2025-11-07	\N	2026-09-25	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.647674	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	12	4	\N	\N	\N	\N
96	LOT-44935348	2025-10-16	\N	2026-02-05	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.652553	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	8	8	\N	\N	\N	\N
97	LOT-74016400	2025-10-10	\N	2026-03-06	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.65626	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	13	3	\N	\N	\N	\N
98	LOT-52427868	2025-10-13	\N	2026-02-07	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.660194	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	3	\N	\N	\N	\N
99	LOT-01128059	2025-10-16	\N	2026-02-01	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.664403	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	9	7	\N	\N	\N	\N
100	LOT-82620450	2025-10-28	\N	2026-05-29	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.668461	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	9	12	\N	\N	\N	\N
101	LOT-53315869	2025-10-12	\N	2026-03-25	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.67305	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	10	11	\N	\N	\N	\N
102	LOT-23226025	2025-11-02	\N	2026-07-01	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.677306	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	8	8	\N	\N	\N	\N
103	LOT-63421607	2025-10-23	\N	2026-01-07	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.681172	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	8	6	\N	\N	\N	\N
104	LOT-33754330	2025-11-07	\N	2026-11-01	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.685602	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	9	10	\N	\N	\N	\N
105	LOT-36541458	2025-11-07	\N	2026-07-10	\N	\N	\N	\N	\N	\N	\N	2025-11-09 11:16:26.690054	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	8	11	\N	\N	\N	\N
\.


--
-- Data for Name: lots_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lots_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-09 19:56:44.620348+09	admin	{"id": 1, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T10:56:44.679016", "created_by": null, "deleted_at": null, "lot_number": "LOT-40781618", "product_id": 4, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-10-23", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-17", "warehouse_id": 9, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
2	I	2025-11-09 19:56:44.620348+09	admin	{"id": 2, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T10:56:44.693139", "created_by": null, "deleted_at": null, "lot_number": "LOT-49593103", "product_id": 2, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-08-25", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-17", "warehouse_id": 9, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
3	I	2025-11-09 19:56:44.620348+09	admin	{"id": 3, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T10:56:44.704706", "created_by": null, "deleted_at": null, "lot_number": "LOT-41316475", "product_id": 4, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-01-06", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-27", "warehouse_id": 9, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
4	I	2025-11-09 19:56:44.620348+09	admin	{"id": 4, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T10:56:44.708168", "created_by": null, "deleted_at": null, "lot_number": "LOT-25534192", "product_id": 2, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-07-16", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-02", "warehouse_id": 9, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
5	I	2025-11-09 19:56:44.620348+09	admin	{"id": 5, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T10:56:44.712289", "created_by": null, "deleted_at": null, "lot_number": "LOT-83276483", "product_id": 4, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-01-21", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-03", "warehouse_id": 9, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
6	I	2025-11-09 20:13:41.960658+09	admin	{"id": 6, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:41.992292", "created_by": null, "deleted_at": null, "lot_number": "LOT-34131647", "product_id": 6, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-08-25", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-17", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
7	I	2025-11-09 20:13:41.960658+09	admin	{"id": 7, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.000869", "created_by": null, "deleted_at": null, "lot_number": "LOT-52553419", "product_id": 9, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-01-06", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-27", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
8	I	2025-11-09 20:13:41.960658+09	admin	{"id": 8, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.009984", "created_by": null, "deleted_at": null, "lot_number": "LOT-28327648", "product_id": 5, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-07-16", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-02", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
9	I	2025-11-09 20:13:41.960658+09	admin	{"id": 9, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.015473", "created_by": null, "deleted_at": null, "lot_number": "LOT-35030564", "product_id": 9, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-01-21", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-03", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
10	I	2025-11-09 20:13:41.960658+09	admin	{"id": 10, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.019978", "created_by": null, "deleted_at": null, "lot_number": "LOT-13953767", "product_id": 9, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-07-15", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-26", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
11	I	2025-11-09 20:13:41.960658+09	admin	{"id": 11, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.024835", "created_by": null, "deleted_at": null, "lot_number": "LOT-24238849", "product_id": 7, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-08-15", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-18", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
12	I	2025-11-09 20:13:41.960658+09	admin	{"id": 12, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.0312", "created_by": null, "deleted_at": null, "lot_number": "LOT-69653287", "product_id": 7, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-08-17", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-03", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
13	I	2025-11-09 20:13:41.960658+09	admin	{"id": 13, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.036249", "created_by": null, "deleted_at": null, "lot_number": "LOT-10122691", "product_id": 7, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-09-18", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-28", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
14	I	2025-11-09 20:13:41.960658+09	admin	{"id": 14, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.040011", "created_by": null, "deleted_at": null, "lot_number": "LOT-66978480", "product_id": 7, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2025-12-30", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-01", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
15	I	2025-11-09 20:13:41.960658+09	admin	{"id": 15, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.044979", "created_by": null, "deleted_at": null, "lot_number": "LOT-18451462", "product_id": 8, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-04-25", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-07", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
16	I	2025-11-09 20:13:41.960658+09	admin	{"id": 16, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.04936", "created_by": null, "deleted_at": null, "lot_number": "LOT-70482814", "product_id": 7, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-01-13", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-03", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
17	I	2025-11-09 20:13:41.960658+09	admin	{"id": 17, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.052852", "created_by": null, "deleted_at": null, "lot_number": "LOT-89325288", "product_id": 5, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2025-12-01", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-02", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
18	I	2025-11-09 20:13:41.960658+09	admin	{"id": 18, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.057333", "created_by": null, "deleted_at": null, "lot_number": "LOT-09570154", "product_id": 5, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-09-14", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-28", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
19	I	2025-11-09 20:13:41.960658+09	admin	{"id": 19, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.061525", "created_by": null, "deleted_at": null, "lot_number": "LOT-30391171", "product_id": 8, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-08-13", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-29", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
20	I	2025-11-09 20:13:41.960658+09	admin	{"id": 20, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.066498", "created_by": null, "deleted_at": null, "lot_number": "LOT-82278248", "product_id": 6, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2025-11-10", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-11", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
21	I	2025-11-09 20:13:41.960658+09	admin	{"id": 21, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.070938", "created_by": null, "deleted_at": null, "lot_number": "LOT-96383465", "product_id": 5, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-02-04", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-17", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
22	I	2025-11-09 20:13:41.960658+09	admin	{"id": 22, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.074891", "created_by": null, "deleted_at": null, "lot_number": "LOT-78713315", "product_id": 6, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-04-24", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-01", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
23	I	2025-11-09 20:13:41.960658+09	admin	{"id": 23, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.080507", "created_by": null, "deleted_at": null, "lot_number": "LOT-09839301", "product_id": 9, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2025-11-19", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-30", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
24	I	2025-11-09 20:13:41.960658+09	admin	{"id": 24, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.086009", "created_by": null, "deleted_at": null, "lot_number": "LOT-03105183", "product_id": 6, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-05-27", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-28", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
25	I	2025-11-09 20:13:41.960658+09	admin	{"id": 25, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.089897", "created_by": null, "deleted_at": null, "lot_number": "LOT-47382997", "product_id": 5, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-01-18", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-12", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
26	I	2025-11-09 20:13:41.960658+09	admin	{"id": 26, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.094722", "created_by": null, "deleted_at": null, "lot_number": "LOT-37631165", "product_id": 7, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2025-12-04", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-25", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
27	I	2025-11-09 20:13:41.960658+09	admin	{"id": 27, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.099955", "created_by": null, "deleted_at": null, "lot_number": "LOT-66701065", "product_id": 8, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-06-22", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-05", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
28	I	2025-11-09 20:13:41.960658+09	admin	{"id": 28, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.104277", "created_by": null, "deleted_at": null, "lot_number": "LOT-13338726", "product_id": 9, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-01-09", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-27", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
29	I	2025-11-09 20:13:41.960658+09	admin	{"id": 29, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.109512", "created_by": null, "deleted_at": null, "lot_number": "LOT-24731781", "product_id": 8, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-07-15", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-05", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
30	I	2025-11-09 20:13:41.960658+09	admin	{"id": 30, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.114903", "created_by": null, "deleted_at": null, "lot_number": "LOT-08013267", "product_id": 8, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-10-11", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-13", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
31	I	2025-11-09 20:13:41.960658+09	admin	{"id": 31, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.120311", "created_by": null, "deleted_at": null, "lot_number": "LOT-73602606", "product_id": 6, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2025-11-21", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-27", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
32	I	2025-11-09 20:13:41.960658+09	admin	{"id": 32, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.12651", "created_by": null, "deleted_at": null, "lot_number": "LOT-47468723", "product_id": 5, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-04-23", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-21", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
33	I	2025-11-09 20:13:41.960658+09	admin	{"id": 33, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.131418", "created_by": null, "deleted_at": null, "lot_number": "LOT-43098050", "product_id": 9, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-01-25", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-13", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
34	I	2025-11-09 20:13:41.960658+09	admin	{"id": 34, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.135994", "created_by": null, "deleted_at": null, "lot_number": "LOT-09788208", "product_id": 5, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2025-12-11", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-30", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
35	I	2025-11-09 20:13:41.960658+09	admin	{"id": 35, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.141628", "created_by": null, "deleted_at": null, "lot_number": "LOT-12191361", "product_id": 7, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-08-16", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-26", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
36	I	2025-11-09 20:13:41.960658+09	admin	{"id": 36, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.146553", "created_by": null, "deleted_at": null, "lot_number": "LOT-93990916", "product_id": 7, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-02-18", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-11", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
37	I	2025-11-09 20:13:41.960658+09	admin	{"id": 37, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.150861", "created_by": null, "deleted_at": null, "lot_number": "LOT-99854353", "product_id": 7, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-08-18", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-29", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
38	I	2025-11-09 20:13:41.960658+09	admin	{"id": 38, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.156125", "created_by": null, "deleted_at": null, "lot_number": "LOT-46247510", "product_id": 6, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-01-02", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-30", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
39	I	2025-11-09 20:13:41.960658+09	admin	{"id": 39, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.160244", "created_by": null, "deleted_at": null, "lot_number": "LOT-79911838", "product_id": 5, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-05-03", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-12", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
40	I	2025-11-09 20:13:41.960658+09	admin	{"id": 40, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.163886", "created_by": null, "deleted_at": null, "lot_number": "LOT-42513542", "product_id": 6, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-07-04", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-12", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
41	I	2025-11-09 20:13:41.960658+09	admin	{"id": 41, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.16822", "created_by": null, "deleted_at": null, "lot_number": "LOT-78498084", "product_id": 5, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-03-01", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-14", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
42	I	2025-11-09 20:13:41.960658+09	admin	{"id": 42, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.172453", "created_by": null, "deleted_at": null, "lot_number": "LOT-12411824", "product_id": 9, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-08-31", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-19", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
43	I	2025-11-09 20:13:41.960658+09	admin	{"id": 43, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.178291", "created_by": null, "deleted_at": null, "lot_number": "LOT-49353487", "product_id": 9, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-06-22", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-24", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
44	I	2025-11-09 20:13:41.960658+09	admin	{"id": 44, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.184824", "created_by": null, "deleted_at": null, "lot_number": "LOT-40164005", "product_id": 8, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-02-01", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-16", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
45	I	2025-11-09 20:13:41.960658+09	admin	{"id": 45, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.190792", "created_by": null, "deleted_at": null, "lot_number": "LOT-24278680", "product_id": 6, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-04-14", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-19", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
46	I	2025-11-09 20:13:41.960658+09	admin	{"id": 46, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.195663", "created_by": null, "deleted_at": null, "lot_number": "LOT-11280598", "product_id": 7, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-02-13", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-26", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
47	I	2025-11-09 20:13:41.960658+09	admin	{"id": 47, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.201006", "created_by": null, "deleted_at": null, "lot_number": "LOT-26204505", "product_id": 6, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-10-03", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-30", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
48	I	2025-11-09 20:13:41.960658+09	admin	{"id": 48, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.205912", "created_by": null, "deleted_at": null, "lot_number": "LOT-33158692", "product_id": 9, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-01-07", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-02", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
49	I	2025-11-09 20:13:41.960658+09	admin	{"id": 49, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.210786", "created_by": null, "deleted_at": null, "lot_number": "LOT-32260256", "product_id": 5, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-07-10", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-07", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
50	I	2025-11-09 20:13:41.960658+09	admin	{"id": 50, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.215094", "created_by": null, "deleted_at": null, "lot_number": "LOT-34216073", "product_id": 7, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-02-14", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-02", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
51	I	2025-11-09 20:13:41.960658+09	admin	{"id": 51, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.220739", "created_by": null, "deleted_at": null, "lot_number": "LOT-37543303", "product_id": 8, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-02-01", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-05", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
52	I	2025-11-09 20:13:41.960658+09	admin	{"id": 52, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.225577", "created_by": null, "deleted_at": null, "lot_number": "LOT-65414586", "product_id": 9, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-07-03", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-15", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
53	I	2025-11-09 20:13:41.960658+09	admin	{"id": 53, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.230465", "created_by": null, "deleted_at": null, "lot_number": "LOT-85014294", "product_id": 8, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-09-17", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-06", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
54	I	2025-11-09 20:13:41.960658+09	admin	{"id": 54, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.236329", "created_by": null, "deleted_at": null, "lot_number": "LOT-01965569", "product_id": 8, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-04-02", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-27", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
55	I	2025-11-09 20:13:41.960658+09	admin	{"id": 55, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:13:42.241186", "created_by": null, "deleted_at": null, "lot_number": "LOT-81693406", "product_id": 5, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-10-04", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-28", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
56	I	2025-11-09 20:16:26.391736+09	admin	{"id": 56, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.429197", "created_by": null, "deleted_at": null, "lot_number": "LOT-23511615", "product_id": 1, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-07-16", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-02", "warehouse_id": 8, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
57	I	2025-11-09 20:16:26.391736+09	admin	{"id": 57, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.440669", "created_by": null, "deleted_at": null, "lot_number": "LOT-59407816", "product_id": 10, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-01-21", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-03", "warehouse_id": 8, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
58	I	2025-11-09 20:16:26.391736+09	admin	{"id": 58, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.451351", "created_by": null, "deleted_at": null, "lot_number": "LOT-18495931", "product_id": 11, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-01-29", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-27", "warehouse_id": 13, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
59	I	2025-11-09 20:16:26.391736+09	admin	{"id": 59, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.456961", "created_by": null, "deleted_at": null, "lot_number": "LOT-03413164", "product_id": 8, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-06-15", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-15", "warehouse_id": 12, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
60	I	2025-11-09 20:16:26.391736+09	admin	{"id": 60, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.461596", "created_by": null, "deleted_at": null, "lot_number": "LOT-75255341", "product_id": 13, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2025-11-12", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-27", "warehouse_id": 9, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
61	I	2025-11-09 20:16:26.391736+09	admin	{"id": 61, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.467735", "created_by": null, "deleted_at": null, "lot_number": "LOT-92832764", "product_id": 5, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-07-17", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-10", "warehouse_id": 9, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
62	I	2025-11-09 20:16:26.391736+09	admin	{"id": 62, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.473731", "created_by": null, "deleted_at": null, "lot_number": "LOT-83503056", "product_id": 6, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-09-18", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-28", "warehouse_id": 8, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
63	I	2025-11-09 20:16:26.391736+09	admin	{"id": 63, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.480012", "created_by": null, "deleted_at": null, "lot_number": "LOT-41395376", "product_id": 6, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2025-12-30", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-01", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
64	I	2025-11-09 20:16:26.391736+09	admin	{"id": 64, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.484887", "created_by": null, "deleted_at": null, "lot_number": "LOT-72423884", "product_id": 12, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-02-03", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-06", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
65	I	2025-11-09 20:16:26.391736+09	admin	{"id": 65, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.488767", "created_by": null, "deleted_at": null, "lot_number": "LOT-96965328", "product_id": 2, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-06-07", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-14", "warehouse_id": 12, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
66	I	2025-11-09 20:16:26.391736+09	admin	{"id": 66, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.493872", "created_by": null, "deleted_at": null, "lot_number": "LOT-71012269", "product_id": 10, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-01-13", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-03", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
67	I	2025-11-09 20:16:26.391736+09	admin	{"id": 67, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.498638", "created_by": null, "deleted_at": null, "lot_number": "LOT-16697848", "product_id": 2, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2025-12-01", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-02", "warehouse_id": 8, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
68	I	2025-11-09 20:16:26.391736+09	admin	{"id": 68, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.502806", "created_by": null, "deleted_at": null, "lot_number": "LOT-01845146", "product_id": 2, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-09-14", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-28", "warehouse_id": 9, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
69	I	2025-11-09 20:16:26.391736+09	admin	{"id": 69, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.508018", "created_by": null, "deleted_at": null, "lot_number": "LOT-27048281", "product_id": 8, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-05-02", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-04", "warehouse_id": 13, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
70	I	2025-11-09 20:16:26.391736+09	admin	{"id": 70, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.512376", "created_by": null, "deleted_at": null, "lot_number": "LOT-48932528", "product_id": 6, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2025-11-26", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-01", "warehouse_id": 9, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
71	I	2025-11-09 20:16:26.391736+09	admin	{"id": 71, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.516659", "created_by": null, "deleted_at": null, "lot_number": "LOT-80957015", "product_id": 11, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-09-29", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-21", "warehouse_id": 13, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
72	I	2025-11-09 20:16:26.391736+09	admin	{"id": 72, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.521876", "created_by": null, "deleted_at": null, "lot_number": "LOT-43039117", "product_id": 3, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-07-02", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-04", "warehouse_id": 12, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
73	I	2025-11-09 20:16:26.391736+09	admin	{"id": 73, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.526319", "created_by": null, "deleted_at": null, "lot_number": "LOT-18227824", "product_id": 7, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2025-12-12", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-18", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
74	I	2025-11-09 20:16:26.391736+09	admin	{"id": 74, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.531454", "created_by": null, "deleted_at": null, "lot_number": "LOT-89638346", "product_id": 4, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-05-22", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-14", "warehouse_id": 13, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
75	I	2025-11-09 20:16:26.391736+09	admin	{"id": 75, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.536378", "created_by": null, "deleted_at": null, "lot_number": "LOT-57871331", "product_id": 4, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-05-27", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-28", "warehouse_id": 8, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
76	I	2025-11-09 20:16:26.391736+09	admin	{"id": 76, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.541995", "created_by": null, "deleted_at": null, "lot_number": "LOT-50983930", "product_id": 2, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-01-18", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-12", "warehouse_id": 9, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
77	I	2025-11-09 20:16:26.391736+09	admin	{"id": 77, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.547181", "created_by": null, "deleted_at": null, "lot_number": "LOT-10310518", "product_id": 6, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2025-12-04", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-25", "warehouse_id": 9, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
78	I	2025-11-09 20:16:26.391736+09	admin	{"id": 78, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.551511", "created_by": null, "deleted_at": null, "lot_number": "LOT-34738299", "product_id": 11, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-08-23", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-01", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
79	I	2025-11-09 20:16:26.391736+09	admin	{"id": 79, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.559943", "created_by": null, "deleted_at": null, "lot_number": "LOT-73763116", "product_id": 4, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-01-21", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-23", "warehouse_id": 13, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
80	I	2025-11-09 20:16:26.391736+09	admin	{"id": 80, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.565543", "created_by": null, "deleted_at": null, "lot_number": "LOT-56670106", "product_id": 12, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-03-30", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-12", "warehouse_id": 12, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
81	I	2025-11-09 20:16:26.391736+09	admin	{"id": 81, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.571243", "created_by": null, "deleted_at": null, "lot_number": "LOT-51333872", "product_id": 7, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-07-15", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-05", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
82	I	2025-11-09 20:16:26.391736+09	admin	{"id": 82, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.577234", "created_by": null, "deleted_at": null, "lot_number": "LOT-62473178", "product_id": 8, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-10-11", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-13", "warehouse_id": 8, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
83	I	2025-11-09 20:16:26.391736+09	admin	{"id": 83, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.585182", "created_by": null, "deleted_at": null, "lot_number": "LOT-10801326", "product_id": 3, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-08-15", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-15", "warehouse_id": 13, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
84	I	2025-11-09 20:16:26.391736+09	admin	{"id": 84, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.59164", "created_by": null, "deleted_at": null, "lot_number": "LOT-77360260", "product_id": 7, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-10-03", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-28", "warehouse_id": 12, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
85	I	2025-11-09 20:16:26.391736+09	admin	{"id": 85, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.597869", "created_by": null, "deleted_at": null, "lot_number": "LOT-64746872", "product_id": 10, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-02-07", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-01", "warehouse_id": 11, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
86	I	2025-11-09 20:16:26.391736+09	admin	{"id": 86, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.604494", "created_by": null, "deleted_at": null, "lot_number": "LOT-34309805", "product_id": 14, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2025-11-21", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-17", "warehouse_id": 8, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
87	I	2025-11-09 20:16:26.391736+09	admin	{"id": 87, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.609087", "created_by": null, "deleted_at": null, "lot_number": "LOT-00978820", "product_id": 11, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-06-21", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-16", "warehouse_id": 12, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
88	I	2025-11-09 20:16:26.391736+09	admin	{"id": 88, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.614412", "created_by": null, "deleted_at": null, "lot_number": "LOT-81219136", "product_id": 6, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-06-07", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-27", "warehouse_id": 8, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
89	I	2025-11-09 20:16:26.391736+09	admin	{"id": 89, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.619844", "created_by": null, "deleted_at": null, "lot_number": "LOT-19399091", "product_id": 8, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-06-23", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-24", "warehouse_id": 8, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
90	I	2025-11-09 20:16:26.391736+09	admin	{"id": 90, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.626402", "created_by": null, "deleted_at": null, "lot_number": "LOT-69985435", "product_id": 3, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-09-11", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-13", "warehouse_id": 12, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
91	I	2025-11-09 20:16:26.391736+09	admin	{"id": 91, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.631831", "created_by": null, "deleted_at": null, "lot_number": "LOT-34624751", "product_id": 5, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-02-18", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-21", "warehouse_id": 13, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
92	I	2025-11-09 20:16:26.391736+09	admin	{"id": 92, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.635354", "created_by": null, "deleted_at": null, "lot_number": "LOT-07991183", "product_id": 3, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-08-14", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-23", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
93	I	2025-11-09 20:16:26.391736+09	admin	{"id": 93, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.638561", "created_by": null, "deleted_at": null, "lot_number": "LOT-84251354", "product_id": 1, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-05-23", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-25", "warehouse_id": 12, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
94	I	2025-11-09 20:16:26.391736+09	admin	{"id": 94, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.64241", "created_by": null, "deleted_at": null, "lot_number": "LOT-27849808", "product_id": 2, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-05-31", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-02", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
95	I	2025-11-09 20:16:26.391736+09	admin	{"id": 95, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.647674", "created_by": null, "deleted_at": null, "lot_number": "LOT-41241182", "product_id": 4, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-09-25", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-07", "warehouse_id": 12, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
96	I	2025-11-09 20:16:26.391736+09	admin	{"id": 96, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.652553", "created_by": null, "deleted_at": null, "lot_number": "LOT-44935348", "product_id": 8, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-02-05", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-16", "warehouse_id": 8, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
97	I	2025-11-09 20:16:26.391736+09	admin	{"id": 97, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.65626", "created_by": null, "deleted_at": null, "lot_number": "LOT-74016400", "product_id": 3, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-03-06", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-10", "warehouse_id": 13, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
98	I	2025-11-09 20:16:26.391736+09	admin	{"id": 98, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.660194", "created_by": null, "deleted_at": null, "lot_number": "LOT-52427868", "product_id": 3, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-02-07", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-13", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
99	I	2025-11-09 20:16:26.391736+09	admin	{"id": 99, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.664403", "created_by": null, "deleted_at": null, "lot_number": "LOT-01128059", "product_id": 7, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-02-01", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-16", "warehouse_id": 9, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
100	I	2025-11-09 20:16:26.391736+09	admin	{"id": 100, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.668461", "created_by": null, "deleted_at": null, "lot_number": "LOT-82620450", "product_id": 12, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-05-29", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-28", "warehouse_id": 9, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
101	I	2025-11-09 20:16:26.391736+09	admin	{"id": 101, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.67305", "created_by": null, "deleted_at": null, "lot_number": "LOT-53315869", "product_id": 11, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-03-25", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-12", "warehouse_id": 10, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
102	I	2025-11-09 20:16:26.391736+09	admin	{"id": 102, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.677306", "created_by": null, "deleted_at": null, "lot_number": "LOT-23226025", "product_id": 8, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-07-01", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-02", "warehouse_id": 8, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
103	I	2025-11-09 20:16:26.391736+09	admin	{"id": 103, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.681172", "created_by": null, "deleted_at": null, "lot_number": "LOT-63421607", "product_id": 6, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-01-07", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-10-23", "warehouse_id": 8, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
104	I	2025-11-09 20:16:26.391736+09	admin	{"id": 104, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.685602", "created_by": null, "deleted_at": null, "lot_number": "LOT-33754330", "product_id": 10, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-11-01", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-07", "warehouse_id": 9, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
105	I	2025-11-09 20:16:26.391736+09	admin	{"id": 105, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-09T11:16:26.690054", "created_by": null, "deleted_at": null, "lot_number": "LOT-36541458", "product_id": 11, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-07-10", "lock_reason": null, "received_by": null, "supplier_id": null, "kanban_class": null, "product_code": null, "receipt_date": "2025-11-07", "warehouse_id": 8, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
\.


--
-- Data for Name: next_div_map; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.next_div_map (id, customer_code, ship_to_code, product_code, next_div, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: order_line_warehouse_allocation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_line_warehouse_allocation (id, order_line_id, warehouse_id, quantity, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: order_line_warehouse_allocation_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_line_warehouse_allocation_history (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: order_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_lines (id, order_id, line_no, quantity, unit, created_at, updated_at, created_by, updated_by, deleted_at, revision, product_id, product_code) FROM stdin;
1	1	1	13.0000	\N	2025-11-09 11:13:42.257622	2025-11-09 20:13:41.960658	\N	\N	\N	1	6	\N
2	2	1	28.0000	\N	2025-11-09 11:13:42.269589	2025-11-09 20:13:41.960658	\N	\N	\N	1	6	\N
3	2	2	18.0000	\N	2025-11-09 11:13:42.269735	2025-11-09 20:13:41.960658	\N	\N	\N	1	6	\N
4	3	1	36.0000	\N	2025-11-09 11:13:42.276933	2025-11-09 20:13:41.960658	\N	\N	\N	1	8	\N
5	4	1	1.0000	\N	2025-11-09 11:13:42.281088	2025-11-09 20:13:41.960658	\N	\N	\N	1	9	\N
6	4	2	49.0000	\N	2025-11-09 11:13:42.281212	2025-11-09 20:13:41.960658	\N	\N	\N	1	5	\N
7	4	3	11.0000	\N	2025-11-09 11:13:42.281262	2025-11-09 20:13:41.960658	\N	\N	\N	1	6	\N
8	5	1	26.0000	\N	2025-11-09 11:13:42.286383	2025-11-09 20:13:41.960658	\N	\N	\N	1	6	\N
9	5	2	11.0000	\N	2025-11-09 11:13:42.286476	2025-11-09 20:13:41.960658	\N	\N	\N	1	5	\N
10	6	1	30.0000	\N	2025-11-09 11:13:42.290987	2025-11-09 20:13:41.960658	\N	\N	\N	1	7	\N
11	6	2	28.0000	\N	2025-11-09 11:13:42.29111	2025-11-09 20:13:41.960658	\N	\N	\N	1	7	\N
12	7	1	10.0000	\N	2025-11-09 11:13:42.296153	2025-11-09 20:13:41.960658	\N	\N	\N	1	8	\N
13	7	2	19.0000	\N	2025-11-09 11:13:42.296237	2025-11-09 20:13:41.960658	\N	\N	\N	1	6	\N
14	7	3	4.0000	\N	2025-11-09 11:13:42.29628	2025-11-09 20:13:41.960658	\N	\N	\N	1	6	\N
15	8	1	48.0000	\N	2025-11-09 11:13:42.302051	2025-11-09 20:13:41.960658	\N	\N	\N	1	5	\N
16	8	2	4.0000	\N	2025-11-09 11:13:42.302137	2025-11-09 20:13:41.960658	\N	\N	\N	1	7	\N
17	8	3	38.0000	\N	2025-11-09 11:13:42.302181	2025-11-09 20:13:41.960658	\N	\N	\N	1	5	\N
18	9	1	4.0000	\N	2025-11-09 11:13:42.307787	2025-11-09 20:13:41.960658	\N	\N	\N	1	6	\N
19	9	2	6.0000	\N	2025-11-09 11:13:42.30787	2025-11-09 20:13:41.960658	\N	\N	\N	1	9	\N
20	9	3	5.0000	\N	2025-11-09 11:13:42.30792	2025-11-09 20:13:41.960658	\N	\N	\N	1	6	\N
21	10	1	26.0000	\N	2025-11-09 11:13:42.312813	2025-11-09 20:13:41.960658	\N	\N	\N	1	6	\N
22	10	2	37.0000	\N	2025-11-09 11:13:42.31292	2025-11-09 20:13:41.960658	\N	\N	\N	1	5	\N
23	10	3	38.0000	\N	2025-11-09 11:13:42.312965	2025-11-09 20:13:41.960658	\N	\N	\N	1	6	\N
24	11	1	18.0000	\N	2025-11-09 11:16:26.712927	2025-11-09 20:16:26.391736	\N	\N	\N	1	4	\N
25	11	2	32.0000	\N	2025-11-09 11:16:26.713135	2025-11-09 20:16:26.391736	\N	\N	\N	1	11	\N
26	11	3	35.0000	\N	2025-11-09 11:16:26.713213	2025-11-09 20:16:26.391736	\N	\N	\N	1	4	\N
27	12	1	31.0000	\N	2025-11-09 11:16:26.733817	2025-11-09 20:16:26.391736	\N	\N	\N	1	10	\N
28	12	2	31.0000	\N	2025-11-09 11:16:26.733992	2025-11-09 20:16:26.391736	\N	\N	\N	1	4	\N
29	12	3	27.0000	\N	2025-11-09 11:16:26.734064	2025-11-09 20:16:26.391736	\N	\N	\N	1	13	\N
30	13	1	28.0000	\N	2025-11-09 11:16:26.743983	2025-11-09 20:16:26.391736	\N	\N	\N	1	11	\N
31	14	1	47.0000	\N	2025-11-09 11:16:26.761752	2025-11-09 20:16:26.391736	\N	\N	\N	1	8	\N
32	14	2	44.0000	\N	2025-11-09 11:16:26.764656	2025-11-09 20:16:26.391736	\N	\N	\N	1	1	\N
33	15	1	26.0000	\N	2025-11-09 11:16:26.773008	2025-11-09 20:16:26.391736	\N	\N	\N	1	1	\N
34	16	1	13.0000	\N	2025-11-09 11:16:26.789122	2025-11-09 20:16:26.391736	\N	\N	\N	1	4	\N
35	17	1	28.0000	\N	2025-11-09 11:16:26.797433	2025-11-09 20:16:26.391736	\N	\N	\N	1	3	\N
36	17	2	18.0000	\N	2025-11-09 11:16:26.79768	2025-11-09 20:16:26.391736	\N	\N	\N	1	3	\N
37	18	1	36.0000	\N	2025-11-09 11:16:26.805891	2025-11-09 20:16:26.391736	\N	\N	\N	1	8	\N
38	19	1	1.0000	\N	2025-11-09 11:16:26.815247	2025-11-09 20:16:26.391736	\N	\N	\N	1	9	\N
39	19	2	49.0000	\N	2025-11-09 11:16:26.815412	2025-11-09 20:16:26.391736	\N	\N	\N	1	2	\N
40	19	3	16.0000	\N	2025-11-09 11:16:26.815493	2025-11-09 20:16:26.391736	\N	\N	\N	1	14	\N
41	20	1	14.0000	\N	2025-11-09 11:16:26.824184	2025-11-09 20:16:26.391736	\N	\N	\N	1	8	\N
42	20	2	26.0000	\N	2025-11-09 11:16:26.824389	2025-11-09 20:16:26.391736	\N	\N	\N	1	14	\N
\.


--
-- Data for Name: order_lines_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_lines_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-09 20:13:41.960658+09	admin	{"id": 1, "unit": null, "line_no": 1, "order_id": 1, "quantity": 13.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.257622", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
2	I	2025-11-09 20:13:41.960658+09	admin	{"id": 2, "unit": null, "line_no": 1, "order_id": 2, "quantity": 28.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.269589", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
3	I	2025-11-09 20:13:41.960658+09	admin	{"id": 3, "unit": null, "line_no": 2, "order_id": 2, "quantity": 18.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.269735", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
4	I	2025-11-09 20:13:41.960658+09	admin	{"id": 4, "unit": null, "line_no": 1, "order_id": 3, "quantity": 36.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.276933", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
5	I	2025-11-09 20:13:41.960658+09	admin	{"id": 5, "unit": null, "line_no": 1, "order_id": 4, "quantity": 1.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.281088", "created_by": null, "deleted_at": null, "product_id": 9, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
6	I	2025-11-09 20:13:41.960658+09	admin	{"id": 6, "unit": null, "line_no": 2, "order_id": 4, "quantity": 49.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.281212", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
7	I	2025-11-09 20:13:41.960658+09	admin	{"id": 7, "unit": null, "line_no": 3, "order_id": 4, "quantity": 11.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.281262", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
8	I	2025-11-09 20:13:41.960658+09	admin	{"id": 8, "unit": null, "line_no": 1, "order_id": 5, "quantity": 26.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.286383", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
9	I	2025-11-09 20:13:41.960658+09	admin	{"id": 9, "unit": null, "line_no": 2, "order_id": 5, "quantity": 11.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.286476", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
10	I	2025-11-09 20:13:41.960658+09	admin	{"id": 10, "unit": null, "line_no": 1, "order_id": 6, "quantity": 30.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.290987", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
11	I	2025-11-09 20:13:41.960658+09	admin	{"id": 11, "unit": null, "line_no": 2, "order_id": 6, "quantity": 28.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.29111", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
12	I	2025-11-09 20:13:41.960658+09	admin	{"id": 12, "unit": null, "line_no": 1, "order_id": 7, "quantity": 10.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.296153", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
13	I	2025-11-09 20:13:41.960658+09	admin	{"id": 13, "unit": null, "line_no": 2, "order_id": 7, "quantity": 19.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.296237", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
14	I	2025-11-09 20:13:41.960658+09	admin	{"id": 14, "unit": null, "line_no": 3, "order_id": 7, "quantity": 4.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.29628", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
15	I	2025-11-09 20:13:41.960658+09	admin	{"id": 15, "unit": null, "line_no": 1, "order_id": 8, "quantity": 48.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.302051", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
16	I	2025-11-09 20:13:41.960658+09	admin	{"id": 16, "unit": null, "line_no": 2, "order_id": 8, "quantity": 4.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.302137", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
17	I	2025-11-09 20:13:41.960658+09	admin	{"id": 17, "unit": null, "line_no": 3, "order_id": 8, "quantity": 38.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.302181", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
18	I	2025-11-09 20:13:41.960658+09	admin	{"id": 18, "unit": null, "line_no": 1, "order_id": 9, "quantity": 4.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.307787", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
19	I	2025-11-09 20:13:41.960658+09	admin	{"id": 19, "unit": null, "line_no": 2, "order_id": 9, "quantity": 6.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.30787", "created_by": null, "deleted_at": null, "product_id": 9, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
20	I	2025-11-09 20:13:41.960658+09	admin	{"id": 20, "unit": null, "line_no": 3, "order_id": 9, "quantity": 5.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.30792", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
21	I	2025-11-09 20:13:41.960658+09	admin	{"id": 21, "unit": null, "line_no": 1, "order_id": 10, "quantity": 26.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.312813", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
22	I	2025-11-09 20:13:41.960658+09	admin	{"id": 22, "unit": null, "line_no": 2, "order_id": 10, "quantity": 37.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.31292", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
23	I	2025-11-09 20:13:41.960658+09	admin	{"id": 23, "unit": null, "line_no": 3, "order_id": 10, "quantity": 38.0000, "revision": 1, "created_at": "2025-11-09T11:13:42.312965", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "product_code": null}
24	I	2025-11-09 20:16:26.391736+09	admin	{"id": 24, "unit": null, "line_no": 1, "order_id": 11, "quantity": 18.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.712927", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
25	I	2025-11-09 20:16:26.391736+09	admin	{"id": 25, "unit": null, "line_no": 2, "order_id": 11, "quantity": 32.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.713135", "created_by": null, "deleted_at": null, "product_id": 11, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
26	I	2025-11-09 20:16:26.391736+09	admin	{"id": 26, "unit": null, "line_no": 3, "order_id": 11, "quantity": 35.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.713213", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
27	I	2025-11-09 20:16:26.391736+09	admin	{"id": 27, "unit": null, "line_no": 1, "order_id": 12, "quantity": 31.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.733817", "created_by": null, "deleted_at": null, "product_id": 10, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
28	I	2025-11-09 20:16:26.391736+09	admin	{"id": 28, "unit": null, "line_no": 2, "order_id": 12, "quantity": 31.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.733992", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
29	I	2025-11-09 20:16:26.391736+09	admin	{"id": 29, "unit": null, "line_no": 3, "order_id": 12, "quantity": 27.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.734064", "created_by": null, "deleted_at": null, "product_id": 13, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
30	I	2025-11-09 20:16:26.391736+09	admin	{"id": 30, "unit": null, "line_no": 1, "order_id": 13, "quantity": 28.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.743983", "created_by": null, "deleted_at": null, "product_id": 11, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
31	I	2025-11-09 20:16:26.391736+09	admin	{"id": 31, "unit": null, "line_no": 1, "order_id": 14, "quantity": 47.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.761752", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
32	I	2025-11-09 20:16:26.391736+09	admin	{"id": 32, "unit": null, "line_no": 2, "order_id": 14, "quantity": 44.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.764656", "created_by": null, "deleted_at": null, "product_id": 1, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
33	I	2025-11-09 20:16:26.391736+09	admin	{"id": 33, "unit": null, "line_no": 1, "order_id": 15, "quantity": 26.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.773008", "created_by": null, "deleted_at": null, "product_id": 1, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
34	I	2025-11-09 20:16:26.391736+09	admin	{"id": 34, "unit": null, "line_no": 1, "order_id": 16, "quantity": 13.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.789122", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
35	I	2025-11-09 20:16:26.391736+09	admin	{"id": 35, "unit": null, "line_no": 1, "order_id": 17, "quantity": 28.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.797433", "created_by": null, "deleted_at": null, "product_id": 3, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
36	I	2025-11-09 20:16:26.391736+09	admin	{"id": 36, "unit": null, "line_no": 2, "order_id": 17, "quantity": 18.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.79768", "created_by": null, "deleted_at": null, "product_id": 3, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
37	I	2025-11-09 20:16:26.391736+09	admin	{"id": 37, "unit": null, "line_no": 1, "order_id": 18, "quantity": 36.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.805891", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
38	I	2025-11-09 20:16:26.391736+09	admin	{"id": 38, "unit": null, "line_no": 1, "order_id": 19, "quantity": 1.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.815247", "created_by": null, "deleted_at": null, "product_id": 9, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
39	I	2025-11-09 20:16:26.391736+09	admin	{"id": 39, "unit": null, "line_no": 2, "order_id": 19, "quantity": 49.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.815412", "created_by": null, "deleted_at": null, "product_id": 2, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
40	I	2025-11-09 20:16:26.391736+09	admin	{"id": 40, "unit": null, "line_no": 3, "order_id": 19, "quantity": 16.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.815493", "created_by": null, "deleted_at": null, "product_id": 14, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
41	I	2025-11-09 20:16:26.391736+09	admin	{"id": 41, "unit": null, "line_no": 1, "order_id": 20, "quantity": 14.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.824184", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
42	I	2025-11-09 20:16:26.391736+09	admin	{"id": 42, "unit": null, "line_no": 2, "order_id": 20, "quantity": 26.0000, "revision": 1, "created_at": "2025-11-09T11:16:26.824389", "created_by": null, "deleted_at": null, "product_id": 14, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "product_code": null}
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, order_no, order_date, status, sap_order_id, sap_status, sap_sent_at, sap_error_msg, created_at, updated_at, created_by, updated_by, deleted_at, revision, customer_order_no, delivery_mode, customer_id, customer_code) FROM stdin;
1	SO-08835615	2025-10-28	draft	\N	\N	\N	\N	2025-11-09 11:13:42.247607	\N	\N	\N	\N	1	\N	\N	\N	\N
2	SO-95148465	2025-11-01	draft	\N	\N	\N	\N	2025-11-09 11:13:42.267513	\N	\N	\N	\N	1	\N	\N	\N	\N
3	SO-64823662	2025-11-06	draft	\N	\N	\N	\N	2025-11-09 11:13:42.274865	\N	\N	\N	\N	1	\N	\N	\N	\N
4	SO-99468044	2025-11-09	draft	\N	\N	\N	\N	2025-11-09 11:13:42.279479	\N	\N	\N	\N	1	\N	\N	\N	\N
5	SO-36995777	2025-11-02	draft	\N	\N	\N	\N	2025-11-09 11:13:42.284296	\N	\N	\N	\N	1	\N	\N	\N	\N
6	SO-38721489	2025-11-09	draft	\N	\N	\N	\N	2025-11-09 11:13:42.288923	\N	\N	\N	\N	1	\N	\N	\N	\N
7	SO-51343320	2025-10-29	draft	\N	\N	\N	\N	2025-11-09 11:13:42.294306	\N	\N	\N	\N	1	\N	\N	\N	\N
8	SO-03791769	2025-10-29	draft	\N	\N	\N	\N	2025-11-09 11:13:42.299628	\N	\N	\N	\N	1	\N	\N	\N	\N
9	SO-36763201	2025-11-01	draft	\N	\N	\N	\N	2025-11-09 11:13:42.305884	\N	\N	\N	\N	1	\N	\N	\N	\N
10	SO-63287083	2025-11-08	draft	\N	\N	\N	\N	2025-11-09 11:13:42.31072	\N	\N	\N	\N	1	\N	\N	\N	\N
11	SO-68501429	2025-11-08	draft	\N	\N	\N	\N	2025-11-09 11:16:26.700688	\N	\N	\N	\N	1	\N	\N	7	\N
12	SO-40196556	2025-10-29	draft	\N	\N	\N	\N	2025-11-09 11:16:26.730191	\N	\N	\N	\N	1	\N	\N	3	\N
13	SO-98169340	2025-11-08	draft	\N	\N	\N	\N	2025-11-09 11:16:26.740376	\N	\N	\N	\N	1	\N	\N	4	\N
14	SO-60883561	2025-11-03	draft	\N	\N	\N	\N	2025-11-09 11:16:26.751969	\N	\N	\N	\N	1	\N	\N	7	\N
15	SO-59514846	2025-10-30	draft	\N	\N	\N	\N	2025-11-09 11:16:26.770057	\N	\N	\N	\N	1	\N	\N	12	\N
16	SO-56482366	2025-10-28	draft	\N	\N	\N	\N	2025-11-09 11:16:26.776322	\N	\N	\N	\N	1	\N	\N	7	\N
17	SO-29946804	2025-11-01	draft	\N	\N	\N	\N	2025-11-09 11:16:26.791853	\N	\N	\N	\N	1	\N	\N	4	\N
18	SO-43699577	2025-11-06	draft	\N	\N	\N	\N	2025-11-09 11:16:26.801939	\N	\N	\N	\N	1	\N	\N	9	\N
19	SO-73872148	2025-11-09	draft	\N	\N	\N	\N	2025-11-09 11:16:26.811168	\N	\N	\N	\N	1	\N	\N	2	\N
20	SO-95134332	2025-11-03	draft	\N	\N	\N	\N	2025-11-09 11:16:26.820901	\N	\N	\N	\N	1	\N	\N	3	\N
\.


--
-- Data for Name: orders_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-09 20:13:41.960658+09	admin	{"id": 1, "status": "draft", "order_no": "SO-08835615", "revision": 1, "created_at": "2025-11-09T11:13:42.247607", "created_by": null, "deleted_at": null, "order_date": "2025-10-28", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": null, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
2	I	2025-11-09 20:13:41.960658+09	admin	{"id": 2, "status": "draft", "order_no": "SO-95148465", "revision": 1, "created_at": "2025-11-09T11:13:42.267513", "created_by": null, "deleted_at": null, "order_date": "2025-11-01", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": null, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
3	I	2025-11-09 20:13:41.960658+09	admin	{"id": 3, "status": "draft", "order_no": "SO-64823662", "revision": 1, "created_at": "2025-11-09T11:13:42.274865", "created_by": null, "deleted_at": null, "order_date": "2025-11-06", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": null, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
4	I	2025-11-09 20:13:41.960658+09	admin	{"id": 4, "status": "draft", "order_no": "SO-99468044", "revision": 1, "created_at": "2025-11-09T11:13:42.279479", "created_by": null, "deleted_at": null, "order_date": "2025-11-09", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": null, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
5	I	2025-11-09 20:13:41.960658+09	admin	{"id": 5, "status": "draft", "order_no": "SO-36995777", "revision": 1, "created_at": "2025-11-09T11:13:42.284296", "created_by": null, "deleted_at": null, "order_date": "2025-11-02", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": null, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
6	I	2025-11-09 20:13:41.960658+09	admin	{"id": 6, "status": "draft", "order_no": "SO-38721489", "revision": 1, "created_at": "2025-11-09T11:13:42.288923", "created_by": null, "deleted_at": null, "order_date": "2025-11-09", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": null, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
7	I	2025-11-09 20:13:41.960658+09	admin	{"id": 7, "status": "draft", "order_no": "SO-51343320", "revision": 1, "created_at": "2025-11-09T11:13:42.294306", "created_by": null, "deleted_at": null, "order_date": "2025-10-29", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": null, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
8	I	2025-11-09 20:13:41.960658+09	admin	{"id": 8, "status": "draft", "order_no": "SO-03791769", "revision": 1, "created_at": "2025-11-09T11:13:42.299628", "created_by": null, "deleted_at": null, "order_date": "2025-10-29", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": null, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
9	I	2025-11-09 20:13:41.960658+09	admin	{"id": 9, "status": "draft", "order_no": "SO-36763201", "revision": 1, "created_at": "2025-11-09T11:13:42.305884", "created_by": null, "deleted_at": null, "order_date": "2025-11-01", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": null, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
10	I	2025-11-09 20:13:41.960658+09	admin	{"id": 10, "status": "draft", "order_no": "SO-63287083", "revision": 1, "created_at": "2025-11-09T11:13:42.31072", "created_by": null, "deleted_at": null, "order_date": "2025-11-08", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": null, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
11	I	2025-11-09 20:16:26.391736+09	admin	{"id": 11, "status": "draft", "order_no": "SO-68501429", "revision": 1, "created_at": "2025-11-09T11:16:26.700688", "created_by": null, "deleted_at": null, "order_date": "2025-11-08", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": 7, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
12	I	2025-11-09 20:16:26.391736+09	admin	{"id": 12, "status": "draft", "order_no": "SO-40196556", "revision": 1, "created_at": "2025-11-09T11:16:26.730191", "created_by": null, "deleted_at": null, "order_date": "2025-10-29", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": 3, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
13	I	2025-11-09 20:16:26.391736+09	admin	{"id": 13, "status": "draft", "order_no": "SO-98169340", "revision": 1, "created_at": "2025-11-09T11:16:26.740376", "created_by": null, "deleted_at": null, "order_date": "2025-11-08", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": 4, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
14	I	2025-11-09 20:16:26.391736+09	admin	{"id": 14, "status": "draft", "order_no": "SO-60883561", "revision": 1, "created_at": "2025-11-09T11:16:26.751969", "created_by": null, "deleted_at": null, "order_date": "2025-11-03", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": 7, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
15	I	2025-11-09 20:16:26.391736+09	admin	{"id": 15, "status": "draft", "order_no": "SO-59514846", "revision": 1, "created_at": "2025-11-09T11:16:26.770057", "created_by": null, "deleted_at": null, "order_date": "2025-10-30", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": 12, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
16	I	2025-11-09 20:16:26.391736+09	admin	{"id": 16, "status": "draft", "order_no": "SO-56482366", "revision": 1, "created_at": "2025-11-09T11:16:26.776322", "created_by": null, "deleted_at": null, "order_date": "2025-10-28", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": 7, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
17	I	2025-11-09 20:16:26.391736+09	admin	{"id": 17, "status": "draft", "order_no": "SO-29946804", "revision": 1, "created_at": "2025-11-09T11:16:26.791853", "created_by": null, "deleted_at": null, "order_date": "2025-11-01", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": 4, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
18	I	2025-11-09 20:16:26.391736+09	admin	{"id": 18, "status": "draft", "order_no": "SO-43699577", "revision": 1, "created_at": "2025-11-09T11:16:26.801939", "created_by": null, "deleted_at": null, "order_date": "2025-11-06", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": 9, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
19	I	2025-11-09 20:16:26.391736+09	admin	{"id": 19, "status": "draft", "order_no": "SO-73872148", "revision": 1, "created_at": "2025-11-09T11:16:26.811168", "created_by": null, "deleted_at": null, "order_date": "2025-11-09", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": 2, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
20	I	2025-11-09 20:16:26.391736+09	admin	{"id": 20, "status": "draft", "order_no": "SO-95134332", "revision": 1, "created_at": "2025-11-09T11:16:26.820901", "created_by": null, "deleted_at": null, "order_date": "2025-11-03", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": 3, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "customer_order_no_last6": null}
\.


--
-- Data for Name: product_uom_conversions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_uom_conversions (id, product_code, source_unit, source_value, internal_unit_value, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (product_code, product_name, customer_part_no, maker_item_code, internal_unit, assemble_div, next_div, shelf_life_days, requires_lot_number, created_at, updated_at, created_by, updated_by, deleted_at, revision, base_unit, packaging_qty, packaging_unit, supplier_item_code, delivery_place_id, ji_ku_text, kumitsuke_ku_text, delivery_place_name, shipping_warehouse_name, id, supplier_id) FROM stdin;
P-001	テスト品A	\N	\N	PC	\N	\N	\N	\N	2025-11-08 23:34:11.632543	2025-11-08 23:34:11.632543	\N	\N	\N	1	EA	1.00	EA	\N	\N	\N	\N	\N	\N	1	\N
P89083	Unleash Next-Generation E-Services	\N	\N	PCS	\N	\N	\N	\N	2025-11-09 10:56:44.554016	2025-11-09 19:56:44.620348	\N	\N	\N	1	EA	1.00	EA	\N	\N	\N	\N	\N	\N	2	\N
P79402	Scale Cutting-Edge Supply-Chains	\N	\N	PCS	\N	\N	\N	\N	2025-11-09 10:56:44.554126	2025-11-09 19:56:44.620348	\N	\N	\N	1	EA	1.00	EA	\N	\N	\N	\N	\N	\N	3	\N
P42351	Evolve Enterprise Platforms	\N	\N	PCS	\N	\N	\N	\N	2025-11-09 10:56:44.554205	2025-11-09 19:56:44.620348	\N	\N	\N	1	EA	1.00	EA	\N	\N	\N	\N	\N	\N	4	\N
P13389	Utilize 24/365 Experiences	\N	\N	PCS	\N	\N	\N	\N	2025-11-09 11:13:41.970916	2025-11-09 20:13:41.960658	\N	\N	\N	1	EA	1.00	EA	\N	\N	\N	\N	\N	\N	5	\N
P86379	Empower Clicks-And-Mortar Communities	\N	\N	PCS	\N	\N	\N	\N	2025-11-09 11:13:41.971368	2025-11-09 20:13:41.960658	\N	\N	\N	1	EA	1.00	EA	\N	\N	\N	\N	\N	\N	6	\N
P65423	Engineer Cross-Platform Platforms	\N	\N	PCS	\N	\N	\N	\N	2025-11-09 11:13:41.971549	2025-11-09 20:13:41.960658	\N	\N	\N	1	EA	1.00	EA	\N	\N	\N	\N	\N	\N	7	\N
P16155	Expedite Back-End Paradigms	\N	\N	PCS	\N	\N	\N	\N	2025-11-09 11:13:41.971693	2025-11-09 20:13:41.960658	\N	\N	\N	1	EA	1.00	EA	\N	\N	\N	\N	\N	\N	8	\N
P78161	Engage Distributed Functionalities	\N	\N	PCS	\N	\N	\N	\N	2025-11-09 11:13:41.971836	2025-11-09 20:13:41.960658	\N	\N	\N	1	EA	1.00	EA	\N	\N	\N	\N	\N	\N	9	\N
P23434	Evolve Killer E-Services	\N	\N	PCS	\N	\N	\N	\N	2025-11-09 11:16:26.403756	2025-11-09 20:16:26.391736	\N	\N	\N	1	EA	1.00	EA	\N	\N	\N	\N	\N	\N	10	\N
P98696	Deliver Proactive Schemas	\N	\N	PCS	\N	\N	\N	\N	2025-11-09 11:16:26.403775	2025-11-09 20:16:26.391736	\N	\N	\N	1	EA	1.00	EA	\N	\N	\N	\N	\N	\N	11	\N
P81482	Aggregate Next-Generation E-Services	\N	\N	PCS	\N	\N	\N	\N	2025-11-09 11:16:26.403789	2025-11-09 20:16:26.391736	\N	\N	\N	1	EA	1.00	EA	\N	\N	\N	\N	\N	\N	12	\N
P21395	Grow Efficient Synergies	\N	\N	PCS	\N	\N	\N	\N	2025-11-09 11:16:26.403801	2025-11-09 20:16:26.391736	\N	\N	\N	1	EA	1.00	EA	\N	\N	\N	\N	\N	\N	13	\N
P87397	Engineer Granular E-Commerce	\N	\N	PCS	\N	\N	\N	\N	2025-11-09 11:16:26.403815	2025-11-09 20:16:26.391736	\N	\N	\N	1	EA	1.00	EA	\N	\N	\N	\N	\N	\N	14	\N
\.


--
-- Data for Name: products_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-08 23:34:11.632543+09	admin	{"id": 1, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-08T23:34:11.632543", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-08T23:34:11.632543", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P-001", "product_name": "テスト品A", "internal_unit": "PC", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": null, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
2	I	2025-11-09 19:56:44.620348+09	admin	{"id": 2, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-09T10:56:44.554016", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-09T19:56:44.620348", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P89083", "product_name": "Unleash Next-Generation E-Services", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": null, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
3	I	2025-11-09 19:56:44.620348+09	admin	{"id": 3, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-09T10:56:44.554126", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-09T19:56:44.620348", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P79402", "product_name": "Scale Cutting-Edge Supply-Chains", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": null, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
4	I	2025-11-09 19:56:44.620348+09	admin	{"id": 4, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-09T10:56:44.554205", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-09T19:56:44.620348", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P42351", "product_name": "Evolve Enterprise Platforms", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": null, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
5	I	2025-11-09 20:13:41.960658+09	admin	{"id": 5, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-09T11:13:41.970916", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P13389", "product_name": "Utilize 24/365 Experiences", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": null, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
6	I	2025-11-09 20:13:41.960658+09	admin	{"id": 6, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-09T11:13:41.971368", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P86379", "product_name": "Empower Clicks-And-Mortar Communities", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": null, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
7	I	2025-11-09 20:13:41.960658+09	admin	{"id": 7, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-09T11:13:41.971549", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P65423", "product_name": "Engineer Cross-Platform Platforms", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": null, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
8	I	2025-11-09 20:13:41.960658+09	admin	{"id": 8, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-09T11:13:41.971693", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P16155", "product_name": "Expedite Back-End Paradigms", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": null, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
9	I	2025-11-09 20:13:41.960658+09	admin	{"id": 9, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-09T11:13:41.971836", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P78161", "product_name": "Engage Distributed Functionalities", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": null, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
10	I	2025-11-09 20:16:26.391736+09	admin	{"id": 10, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-09T11:16:26.403756", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P23434", "product_name": "Evolve Killer E-Services", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": null, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
11	I	2025-11-09 20:16:26.391736+09	admin	{"id": 11, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-09T11:16:26.403775", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P98696", "product_name": "Deliver Proactive Schemas", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": null, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
12	I	2025-11-09 20:16:26.391736+09	admin	{"id": 12, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-09T11:16:26.403789", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P81482", "product_name": "Aggregate Next-Generation E-Services", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": null, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
13	I	2025-11-09 20:16:26.391736+09	admin	{"id": 13, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-09T11:16:26.403801", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P21395", "product_name": "Grow Efficient Synergies", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": null, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
14	I	2025-11-09 20:16:26.391736+09	admin	{"id": 14, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-09T11:16:26.403815", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P87397", "product_name": "Engineer Granular E-Commerce", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": null, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
\.


--
-- Data for Name: purchase_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_requests (id, requested_qty, unit, reason_code, src_order_line_id, requested_date, desired_receipt_date, status, sap_po_id, notes, created_at, updated_at, created_by, updated_by, deleted_at, revision, product_id, supplier_id) FROM stdin;
\.


--
-- Data for Name: purchase_requests_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_requests_history (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: receipt_headers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.receipt_headers (id, receipt_no, supplier_code, warehouse_id, receipt_date, created_by, notes, created_at, updated_at, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: receipt_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.receipt_lines (id, header_id, line_no, product_code, lot_id, quantity, unit, notes, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: sap_sync_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sap_sync_logs (id, order_id, payload, result, status, executed_at, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: sap_sync_logs_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sap_sync_logs_history (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: shipping; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shipping (id, lot_id, order_line_id, shipped_qty, shipped_date, shipping_address, contact_person, contact_phone, delivery_time_slot, tracking_number, carrier, carrier_service, notes, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_movements (id, lot_id, reason, quantity_delta, occurred_at, created_at, updated_at, created_by, updated_by, deleted_at, revision, warehouse_id, source_table, source_id, batch_id, product_id) FROM stdin;
1	1	receipt	75.0000	2025-11-09 10:56:44.692967	2025-11-09 10:56:44.692971	2025-11-09 19:56:44.620348	\N	\N	\N	1	9	\N	\N	\N	4
2	2	receipt	31.0000	2025-11-09 10:56:44.704544	2025-11-09 10:56:44.704549	2025-11-09 19:56:44.620348	\N	\N	\N	1	9	\N	\N	\N	2
3	3	receipt	13.0000	2025-11-09 10:56:44.707845	2025-11-09 10:56:44.707849	2025-11-09 19:56:44.620348	\N	\N	\N	1	9	\N	\N	\N	4
4	4	receipt	134.0000	2025-11-09 10:56:44.712127	2025-11-09 10:56:44.712133	2025-11-09 19:56:44.620348	\N	\N	\N	1	9	\N	\N	\N	2
5	5	receipt	188.0000	2025-11-09 10:56:44.71539	2025-11-09 10:56:44.715394	2025-11-09 19:56:44.620348	\N	\N	\N	1	9	\N	\N	\N	4
6	6	receipt	31.0000	2025-11-09 11:13:42.000544	2025-11-09 11:13:42.000555	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	6
7	7	receipt	13.0000	2025-11-09 11:13:42.00976	2025-11-09 11:13:42.009767	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	9
8	8	receipt	134.0000	2025-11-09 11:13:42.015148	2025-11-09 11:13:42.015157	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	5
9	9	receipt	188.0000	2025-11-09 11:13:42.019774	2025-11-09 11:13:42.019781	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	9
10	10	receipt	155.0000	2025-11-09 11:13:42.024672	2025-11-09 11:13:42.024677	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	9
11	11	receipt	113.0000	2025-11-09 11:13:42.030938	2025-11-09 11:13:42.030945	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	7
12	12	receipt	200.0000	2025-11-09 11:13:42.036011	2025-11-09 11:13:42.036018	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	7
13	13	receipt	29.0000	2025-11-09 11:13:42.039803	2025-11-09 11:13:42.039814	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	7
14	14	receipt	16.0000	2025-11-09 11:13:42.04469	2025-11-09 11:13:42.044696	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	7
15	15	receipt	146.0000	2025-11-09 11:13:42.04915	2025-11-09 11:13:42.049155	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	8
16	16	receipt	185.0000	2025-11-09 11:13:42.052639	2025-11-09 11:13:42.052645	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	7
17	17	receipt	79.0000	2025-11-09 11:13:42.057162	2025-11-09 11:13:42.057166	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	5
18	18	receipt	76.0000	2025-11-09 11:13:42.061259	2025-11-09 11:13:42.061267	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	5
19	19	receipt	95.0000	2025-11-09 11:13:42.066304	2025-11-09 11:13:42.06631	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	8
20	20	receipt	179.0000	2025-11-09 11:13:42.070745	2025-11-09 11:13:42.070751	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	6
21	21	receipt	67.0000	2025-11-09 11:13:42.074672	2025-11-09 11:13:42.074678	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	5
22	22	receipt	168.0000	2025-11-09 11:13:42.080286	2025-11-09 11:13:42.080292	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	6
23	23	receipt	19.0000	2025-11-09 11:13:42.085835	2025-11-09 11:13:42.08584	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	9
24	24	receipt	73.0000	2025-11-09 11:13:42.089597	2025-11-09 11:13:42.089605	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	6
25	25	receipt	188.0000	2025-11-09 11:13:42.094527	2025-11-09 11:13:42.094532	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	5
26	26	receipt	106.0000	2025-11-09 11:13:42.099732	2025-11-09 11:13:42.09974	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	7
27	27	receipt	68.0000	2025-11-09 11:13:42.104011	2025-11-09 11:13:42.104018	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	8
28	28	receipt	154.0000	2025-11-09 11:13:42.109266	2025-11-09 11:13:42.109274	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	9
29	29	receipt	135.0000	2025-11-09 11:13:42.114736	2025-11-09 11:13:42.114741	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	8
30	30	receipt	33.0000	2025-11-09 11:13:42.120046	2025-11-09 11:13:42.120054	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	8
31	31	receipt	157.0000	2025-11-09 11:13:42.126104	2025-11-09 11:13:42.126117	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	6
32	32	receipt	124.0000	2025-11-09 11:13:42.131178	2025-11-09 11:13:42.131189	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	5
33	33	receipt	7.0000	2025-11-09 11:13:42.135837	2025-11-09 11:13:42.135841	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	9
34	34	receipt	33.0000	2025-11-09 11:13:42.141416	2025-11-09 11:13:42.141424	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	5
35	35	receipt	5.0000	2025-11-09 11:13:42.146271	2025-11-09 11:13:42.146278	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	7
36	36	receipt	32.0000	2025-11-09 11:13:42.150694	2025-11-09 11:13:42.150698	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	7
37	37	receipt	200.0000	2025-11-09 11:13:42.15596	2025-11-09 11:13:42.155966	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	7
38	38	receipt	130.0000	2025-11-09 11:13:42.15995	2025-11-09 11:13:42.159956	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	6
39	39	receipt	83.0000	2025-11-09 11:13:42.163705	2025-11-09 11:13:42.163711	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	5
40	40	receipt	150.0000	2025-11-09 11:13:42.168047	2025-11-09 11:13:42.168052	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	6
41	41	receipt	22.0000	2025-11-09 11:13:42.172139	2025-11-09 11:13:42.172149	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	5
42	42	receipt	126.0000	2025-11-09 11:13:42.178039	2025-11-09 11:13:42.17805	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	9
43	43	receipt	160.0000	2025-11-09 11:13:42.184512	2025-11-09 11:13:42.184519	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	9
44	44	receipt	191.0000	2025-11-09 11:13:42.190564	2025-11-09 11:13:42.190571	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	8
45	45	receipt	171.0000	2025-11-09 11:13:42.195449	2025-11-09 11:13:42.195456	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	6
46	46	receipt	35.0000	2025-11-09 11:13:42.200708	2025-11-09 11:13:42.200717	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	7
47	47	receipt	10.0000	2025-11-09 11:13:42.205751	2025-11-09 11:13:42.205755	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	6
48	48	receipt	6.0000	2025-11-09 11:13:42.210614	2025-11-09 11:13:42.21062	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	9
49	49	receipt	13.0000	2025-11-09 11:13:42.214736	2025-11-09 11:13:42.214748	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	5
50	50	receipt	76.0000	2025-11-09 11:13:42.220514	2025-11-09 11:13:42.22052	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	7
51	51	receipt	190.0000	2025-11-09 11:13:42.225409	2025-11-09 11:13:42.225416	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	8
52	52	receipt	126.0000	2025-11-09 11:13:42.230261	2025-11-09 11:13:42.230267	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	9
53	53	receipt	173.0000	2025-11-09 11:13:42.235934	2025-11-09 11:13:42.235944	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	8
54	54	receipt	124.0000	2025-11-09 11:13:42.240976	2025-11-09 11:13:42.240986	2025-11-09 20:13:41.960658	\N	\N	\N	1	11	\N	\N	\N	8
55	55	receipt	191.0000	2025-11-09 11:13:42.245612	2025-11-09 11:13:42.245617	2025-11-09 20:13:41.960658	\N	\N	\N	1	10	\N	\N	\N	5
56	56	receipt	134.0000	2025-11-09 11:16:26.440389	2025-11-09 11:16:26.440397	2025-11-09 20:16:26.391736	\N	\N	\N	1	8	\N	\N	\N	1
57	57	receipt	188.0000	2025-11-09 11:16:26.451165	2025-11-09 11:16:26.451172	2025-11-09 20:16:26.391736	\N	\N	\N	1	8	\N	\N	\N	10
58	58	receipt	61.0000	2025-11-09 11:16:26.45663	2025-11-09 11:16:26.45664	2025-11-09 20:16:26.391736	\N	\N	\N	1	13	\N	\N	\N	11
59	59	receipt	6.0000	2025-11-09 11:16:26.461321	2025-11-09 11:16:26.461327	2025-11-09 20:16:26.391736	\N	\N	\N	1	12	\N	\N	\N	8
60	60	receipt	92.0000	2025-11-09 11:16:26.467477	2025-11-09 11:16:26.467488	2025-11-09 20:16:26.391736	\N	\N	\N	1	9	\N	\N	\N	13
61	61	receipt	200.0000	2025-11-09 11:16:26.473505	2025-11-09 11:16:26.473516	2025-11-09 20:16:26.391736	\N	\N	\N	1	9	\N	\N	\N	5
62	62	receipt	29.0000	2025-11-09 11:16:26.479688	2025-11-09 11:16:26.479699	2025-11-09 20:16:26.391736	\N	\N	\N	1	8	\N	\N	\N	6
63	63	receipt	16.0000	2025-11-09 11:16:26.484615	2025-11-09 11:16:26.484622	2025-11-09 20:16:26.391736	\N	\N	\N	1	10	\N	\N	\N	6
64	64	receipt	101.0000	2025-11-09 11:16:26.488598	2025-11-09 11:16:26.488603	2025-11-09 20:16:26.391736	\N	\N	\N	1	11	\N	\N	\N	12
65	65	receipt	165.0000	2025-11-09 11:16:26.493694	2025-11-09 11:16:26.493701	2025-11-09 20:16:26.391736	\N	\N	\N	1	12	\N	\N	\N	2
66	66	receipt	185.0000	2025-11-09 11:16:26.49842	2025-11-09 11:16:26.498427	2025-11-09 20:16:26.391736	\N	\N	\N	1	10	\N	\N	\N	10
67	67	receipt	79.0000	2025-11-09 11:16:26.502577	2025-11-09 11:16:26.502585	2025-11-09 20:16:26.391736	\N	\N	\N	1	8	\N	\N	\N	2
68	68	receipt	76.0000	2025-11-09 11:16:26.507847	2025-11-09 11:16:26.507853	2025-11-09 20:16:26.391736	\N	\N	\N	1	9	\N	\N	\N	2
69	69	receipt	99.0000	2025-11-09 11:16:26.512098	2025-11-09 11:16:26.512105	2025-11-09 20:16:26.391736	\N	\N	\N	1	13	\N	\N	\N	8
70	70	receipt	184.0000	2025-11-09 11:16:26.516458	2025-11-09 11:16:26.516464	2025-11-09 20:16:26.391736	\N	\N	\N	1	9	\N	\N	\N	6
71	71	receipt	167.0000	2025-11-09 11:16:26.521712	2025-11-09 11:16:26.521717	2025-11-09 20:16:26.391736	\N	\N	\N	1	13	\N	\N	\N	11
72	72	receipt	123.0000	2025-11-09 11:16:26.52612	2025-11-09 11:16:26.526127	2025-11-09 20:16:26.391736	\N	\N	\N	1	12	\N	\N	\N	3
73	73	receipt	147.0000	2025-11-09 11:16:26.5312	2025-11-09 11:16:26.531209	2025-11-09 20:16:26.391736	\N	\N	\N	1	10	\N	\N	\N	7
74	74	receipt	19.0000	2025-11-09 11:16:26.536133	2025-11-09 11:16:26.536147	2025-11-09 20:16:26.391736	\N	\N	\N	1	13	\N	\N	\N	4
75	75	receipt	73.0000	2025-11-09 11:16:26.54172	2025-11-09 11:16:26.541732	2025-11-09 20:16:26.391736	\N	\N	\N	1	8	\N	\N	\N	4
76	76	receipt	188.0000	2025-11-09 11:16:26.546895	2025-11-09 11:16:26.546903	2025-11-09 20:16:26.391736	\N	\N	\N	1	9	\N	\N	\N	2
77	77	receipt	106.0000	2025-11-09 11:16:26.551322	2025-11-09 11:16:26.551328	2025-11-09 20:16:26.391736	\N	\N	\N	1	9	\N	\N	\N	6
78	78	receipt	40.0000	2025-11-09 11:16:26.558557	2025-11-09 11:16:26.558567	2025-11-09 20:16:26.391736	\N	\N	\N	1	11	\N	\N	\N	11
79	79	receipt	72.0000	2025-11-09 11:16:26.565276	2025-11-09 11:16:26.565285	2025-11-09 20:16:26.391736	\N	\N	\N	1	13	\N	\N	\N	4
80	80	receipt	154.0000	2025-11-09 11:16:26.570966	2025-11-09 11:16:26.570975	2025-11-09 20:16:26.391736	\N	\N	\N	1	12	\N	\N	\N	12
81	81	receipt	135.0000	2025-11-09 11:16:26.576849	2025-11-09 11:16:26.576858	2025-11-09 20:16:26.391736	\N	\N	\N	1	10	\N	\N	\N	7
82	82	receipt	33.0000	2025-11-09 11:16:26.584921	2025-11-09 11:16:26.584928	2025-11-09 20:16:26.391736	\N	\N	\N	1	8	\N	\N	\N	8
83	83	receipt	179.0000	2025-11-09 11:16:26.591362	2025-11-09 11:16:26.591371	2025-11-09 20:16:26.391736	\N	\N	\N	1	13	\N	\N	\N	3
84	84	receipt	102.0000	2025-11-09 11:16:26.597472	2025-11-09 11:16:26.597482	2025-11-09 20:16:26.391736	\N	\N	\N	1	12	\N	\N	\N	7
85	85	receipt	146.0000	2025-11-09 11:16:26.604223	2025-11-09 11:16:26.604237	2025-11-09 20:16:26.391736	\N	\N	\N	1	11	\N	\N	\N	10
86	86	receipt	34.0000	2025-11-09 11:16:26.608865	2025-11-09 11:16:26.608873	2025-11-09 20:16:26.391736	\N	\N	\N	1	8	\N	\N	\N	14
87	87	receipt	169.0000	2025-11-09 11:16:26.614177	2025-11-09 11:16:26.614194	2025-11-09 20:16:26.391736	\N	\N	\N	1	12	\N	\N	\N	11
88	88	receipt	45.0000	2025-11-09 11:16:26.619569	2025-11-09 11:16:26.619582	2025-11-09 20:16:26.391736	\N	\N	\N	1	8	\N	\N	\N	6
89	89	receipt	200.0000	2025-11-09 11:16:26.626209	2025-11-09 11:16:26.626217	2025-11-09 20:16:26.391736	\N	\N	\N	1	8	\N	\N	\N	8
90	90	receipt	165.0000	2025-11-09 11:16:26.631655	2025-11-09 11:16:26.631662	2025-11-09 20:16:26.391736	\N	\N	\N	1	12	\N	\N	\N	3
91	91	receipt	55.0000	2025-11-09 11:16:26.635188	2025-11-09 11:16:26.635193	2025-11-09 20:16:26.391736	\N	\N	\N	1	13	\N	\N	\N	5
92	92	receipt	140.0000	2025-11-09 11:16:26.6384	2025-11-09 11:16:26.638406	2025-11-09 20:16:26.391736	\N	\N	\N	1	10	\N	\N	\N	3
93	93	receipt	9.0000	2025-11-09 11:16:26.642144	2025-11-09 11:16:26.64215	2025-11-09 20:16:26.391736	\N	\N	\N	1	12	\N	\N	\N	1
94	94	receipt	19.0000	2025-11-09 11:16:26.647444	2025-11-09 11:16:26.647452	2025-11-09 20:16:26.391736	\N	\N	\N	1	10	\N	\N	\N	2
95	95	receipt	192.0000	2025-11-09 11:16:26.652386	2025-11-09 11:16:26.652391	2025-11-09 20:16:26.391736	\N	\N	\N	1	12	\N	\N	\N	4
96	96	receipt	37.0000	2025-11-09 11:16:26.656061	2025-11-09 11:16:26.656067	2025-11-09 20:16:26.391736	\N	\N	\N	1	8	\N	\N	\N	8
97	97	receipt	145.0000	2025-11-09 11:16:26.660023	2025-11-09 11:16:26.660031	2025-11-09 20:16:26.391736	\N	\N	\N	1	13	\N	\N	\N	3
98	98	receipt	160.0000	2025-11-09 11:16:26.664152	2025-11-09 11:16:26.664167	2025-11-09 20:16:26.391736	\N	\N	\N	1	10	\N	\N	\N	3
99	99	receipt	191.0000	2025-11-09 11:16:26.668302	2025-11-09 11:16:26.668307	2025-11-09 20:16:26.391736	\N	\N	\N	1	9	\N	\N	\N	7
100	100	receipt	176.0000	2025-11-09 11:16:26.672819	2025-11-09 11:16:26.672826	2025-11-09 20:16:26.391736	\N	\N	\N	1	9	\N	\N	\N	12
101	101	receipt	137.0000	2025-11-09 11:16:26.677095	2025-11-09 11:16:26.677102	2025-11-09 20:16:26.391736	\N	\N	\N	1	10	\N	\N	\N	11
102	102	receipt	21.0000	2025-11-09 11:16:26.681003	2025-11-09 11:16:26.68101	2025-11-09 20:16:26.391736	\N	\N	\N	1	8	\N	\N	\N	8
103	103	receipt	63.0000	2025-11-09 11:16:26.685385	2025-11-09 11:16:26.685393	2025-11-09 20:16:26.391736	\N	\N	\N	1	8	\N	\N	\N	6
104	104	receipt	186.0000	2025-11-09 11:16:26.68982	2025-11-09 11:16:26.689828	2025-11-09 20:16:26.391736	\N	\N	\N	1	9	\N	\N	\N	10
105	105	receipt	13.0000	2025-11-09 11:16:26.695489	2025-11-09 11:16:26.695497	2025-11-09 20:16:26.391736	\N	\N	\N	1	8	\N	\N	\N	11
\.


--
-- Data for Name: stock_movements_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_movements_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-09 19:56:44.620348+09	admin	{"id": 1, "lot_id": 1, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T10:56:44.692971", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-09T19:56:44.620348", "updated_by": null, "occurred_at": "2025-11-09T10:56:44.692967", "source_table": null, "warehouse_id": 9, "quantity_delta": 75.0000}
2	I	2025-11-09 19:56:44.620348+09	admin	{"id": 2, "lot_id": 2, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T10:56:44.704549", "created_by": null, "deleted_at": null, "product_id": 2, "updated_at": "2025-11-09T19:56:44.620348", "updated_by": null, "occurred_at": "2025-11-09T10:56:44.704544", "source_table": null, "warehouse_id": 9, "quantity_delta": 31.0000}
3	I	2025-11-09 19:56:44.620348+09	admin	{"id": 3, "lot_id": 3, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T10:56:44.707849", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-09T19:56:44.620348", "updated_by": null, "occurred_at": "2025-11-09T10:56:44.707845", "source_table": null, "warehouse_id": 9, "quantity_delta": 13.0000}
4	I	2025-11-09 19:56:44.620348+09	admin	{"id": 4, "lot_id": 4, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T10:56:44.712133", "created_by": null, "deleted_at": null, "product_id": 2, "updated_at": "2025-11-09T19:56:44.620348", "updated_by": null, "occurred_at": "2025-11-09T10:56:44.712127", "source_table": null, "warehouse_id": 9, "quantity_delta": 134.0000}
5	I	2025-11-09 19:56:44.620348+09	admin	{"id": 5, "lot_id": 5, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T10:56:44.715394", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-09T19:56:44.620348", "updated_by": null, "occurred_at": "2025-11-09T10:56:44.71539", "source_table": null, "warehouse_id": 9, "quantity_delta": 188.0000}
6	I	2025-11-09 20:13:41.960658+09	admin	{"id": 6, "lot_id": 6, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.000555", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.000544", "source_table": null, "warehouse_id": 10, "quantity_delta": 31.0000}
7	I	2025-11-09 20:13:41.960658+09	admin	{"id": 7, "lot_id": 7, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.009767", "created_by": null, "deleted_at": null, "product_id": 9, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.00976", "source_table": null, "warehouse_id": 10, "quantity_delta": 13.0000}
8	I	2025-11-09 20:13:41.960658+09	admin	{"id": 8, "lot_id": 8, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.015157", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.015148", "source_table": null, "warehouse_id": 10, "quantity_delta": 134.0000}
9	I	2025-11-09 20:13:41.960658+09	admin	{"id": 9, "lot_id": 9, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.019781", "created_by": null, "deleted_at": null, "product_id": 9, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.019774", "source_table": null, "warehouse_id": 10, "quantity_delta": 188.0000}
10	I	2025-11-09 20:13:41.960658+09	admin	{"id": 10, "lot_id": 10, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.024677", "created_by": null, "deleted_at": null, "product_id": 9, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.024672", "source_table": null, "warehouse_id": 11, "quantity_delta": 155.0000}
11	I	2025-11-09 20:13:41.960658+09	admin	{"id": 11, "lot_id": 11, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.030945", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.030938", "source_table": null, "warehouse_id": 10, "quantity_delta": 113.0000}
12	I	2025-11-09 20:13:41.960658+09	admin	{"id": 12, "lot_id": 12, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.036018", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.036011", "source_table": null, "warehouse_id": 11, "quantity_delta": 200.0000}
13	I	2025-11-09 20:13:41.960658+09	admin	{"id": 13, "lot_id": 13, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.039814", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.039803", "source_table": null, "warehouse_id": 10, "quantity_delta": 29.0000}
14	I	2025-11-09 20:13:41.960658+09	admin	{"id": 14, "lot_id": 14, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.044696", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.04469", "source_table": null, "warehouse_id": 11, "quantity_delta": 16.0000}
15	I	2025-11-09 20:13:41.960658+09	admin	{"id": 15, "lot_id": 15, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.049155", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.04915", "source_table": null, "warehouse_id": 10, "quantity_delta": 146.0000}
16	I	2025-11-09 20:13:41.960658+09	admin	{"id": 16, "lot_id": 16, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.052645", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.052639", "source_table": null, "warehouse_id": 11, "quantity_delta": 185.0000}
17	I	2025-11-09 20:13:41.960658+09	admin	{"id": 17, "lot_id": 17, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.057166", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.057162", "source_table": null, "warehouse_id": 10, "quantity_delta": 79.0000}
18	I	2025-11-09 20:13:41.960658+09	admin	{"id": 18, "lot_id": 18, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.061267", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.061259", "source_table": null, "warehouse_id": 10, "quantity_delta": 76.0000}
19	I	2025-11-09 20:13:41.960658+09	admin	{"id": 19, "lot_id": 19, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.06631", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.066304", "source_table": null, "warehouse_id": 11, "quantity_delta": 95.0000}
20	I	2025-11-09 20:13:41.960658+09	admin	{"id": 20, "lot_id": 20, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.070751", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.070745", "source_table": null, "warehouse_id": 11, "quantity_delta": 179.0000}
21	I	2025-11-09 20:13:41.960658+09	admin	{"id": 21, "lot_id": 21, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.074678", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.074672", "source_table": null, "warehouse_id": 10, "quantity_delta": 67.0000}
22	I	2025-11-09 20:13:41.960658+09	admin	{"id": 22, "lot_id": 22, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.080292", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.080286", "source_table": null, "warehouse_id": 11, "quantity_delta": 168.0000}
23	I	2025-11-09 20:13:41.960658+09	admin	{"id": 23, "lot_id": 23, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.08584", "created_by": null, "deleted_at": null, "product_id": 9, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.085835", "source_table": null, "warehouse_id": 10, "quantity_delta": 19.0000}
24	I	2025-11-09 20:13:41.960658+09	admin	{"id": 24, "lot_id": 24, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.089605", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.089597", "source_table": null, "warehouse_id": 10, "quantity_delta": 73.0000}
25	I	2025-11-09 20:13:41.960658+09	admin	{"id": 25, "lot_id": 25, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.094532", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.094527", "source_table": null, "warehouse_id": 10, "quantity_delta": 188.0000}
26	I	2025-11-09 20:13:41.960658+09	admin	{"id": 26, "lot_id": 26, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.09974", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.099732", "source_table": null, "warehouse_id": 10, "quantity_delta": 106.0000}
27	I	2025-11-09 20:13:41.960658+09	admin	{"id": 27, "lot_id": 27, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.104018", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.104011", "source_table": null, "warehouse_id": 10, "quantity_delta": 68.0000}
28	I	2025-11-09 20:13:41.960658+09	admin	{"id": 28, "lot_id": 28, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.109274", "created_by": null, "deleted_at": null, "product_id": 9, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.109266", "source_table": null, "warehouse_id": 11, "quantity_delta": 154.0000}
29	I	2025-11-09 20:13:41.960658+09	admin	{"id": 29, "lot_id": 29, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.114741", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.114736", "source_table": null, "warehouse_id": 11, "quantity_delta": 135.0000}
30	I	2025-11-09 20:13:41.960658+09	admin	{"id": 30, "lot_id": 30, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.120054", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.120046", "source_table": null, "warehouse_id": 10, "quantity_delta": 33.0000}
31	I	2025-11-09 20:13:41.960658+09	admin	{"id": 31, "lot_id": 31, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.126117", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.126104", "source_table": null, "warehouse_id": 10, "quantity_delta": 157.0000}
32	I	2025-11-09 20:13:41.960658+09	admin	{"id": 32, "lot_id": 32, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.131189", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.131178", "source_table": null, "warehouse_id": 11, "quantity_delta": 124.0000}
33	I	2025-11-09 20:13:41.960658+09	admin	{"id": 33, "lot_id": 33, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.135841", "created_by": null, "deleted_at": null, "product_id": 9, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.135837", "source_table": null, "warehouse_id": 11, "quantity_delta": 7.0000}
34	I	2025-11-09 20:13:41.960658+09	admin	{"id": 34, "lot_id": 34, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.141424", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.141416", "source_table": null, "warehouse_id": 11, "quantity_delta": 33.0000}
35	I	2025-11-09 20:13:41.960658+09	admin	{"id": 35, "lot_id": 35, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.146278", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.146271", "source_table": null, "warehouse_id": 11, "quantity_delta": 5.0000}
36	I	2025-11-09 20:13:41.960658+09	admin	{"id": 36, "lot_id": 36, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.150698", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.150694", "source_table": null, "warehouse_id": 10, "quantity_delta": 32.0000}
37	I	2025-11-09 20:13:41.960658+09	admin	{"id": 37, "lot_id": 37, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.155966", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.15596", "source_table": null, "warehouse_id": 10, "quantity_delta": 200.0000}
38	I	2025-11-09 20:13:41.960658+09	admin	{"id": 38, "lot_id": 38, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.159956", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.15995", "source_table": null, "warehouse_id": 10, "quantity_delta": 130.0000}
39	I	2025-11-09 20:13:41.960658+09	admin	{"id": 39, "lot_id": 39, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.163711", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.163705", "source_table": null, "warehouse_id": 10, "quantity_delta": 83.0000}
40	I	2025-11-09 20:13:41.960658+09	admin	{"id": 40, "lot_id": 40, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.168052", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.168047", "source_table": null, "warehouse_id": 10, "quantity_delta": 150.0000}
41	I	2025-11-09 20:13:41.960658+09	admin	{"id": 41, "lot_id": 41, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.172149", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.172139", "source_table": null, "warehouse_id": 10, "quantity_delta": 22.0000}
42	I	2025-11-09 20:13:41.960658+09	admin	{"id": 42, "lot_id": 42, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.17805", "created_by": null, "deleted_at": null, "product_id": 9, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.178039", "source_table": null, "warehouse_id": 10, "quantity_delta": 126.0000}
43	I	2025-11-09 20:13:41.960658+09	admin	{"id": 43, "lot_id": 43, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.184519", "created_by": null, "deleted_at": null, "product_id": 9, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.184512", "source_table": null, "warehouse_id": 10, "quantity_delta": 160.0000}
44	I	2025-11-09 20:13:41.960658+09	admin	{"id": 44, "lot_id": 44, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.190571", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.190564", "source_table": null, "warehouse_id": 10, "quantity_delta": 191.0000}
45	I	2025-11-09 20:13:41.960658+09	admin	{"id": 45, "lot_id": 45, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.195456", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.195449", "source_table": null, "warehouse_id": 11, "quantity_delta": 171.0000}
46	I	2025-11-09 20:13:41.960658+09	admin	{"id": 46, "lot_id": 46, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.200717", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.200708", "source_table": null, "warehouse_id": 11, "quantity_delta": 35.0000}
47	I	2025-11-09 20:13:41.960658+09	admin	{"id": 47, "lot_id": 47, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.205755", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.205751", "source_table": null, "warehouse_id": 10, "quantity_delta": 10.0000}
48	I	2025-11-09 20:13:41.960658+09	admin	{"id": 48, "lot_id": 48, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.21062", "created_by": null, "deleted_at": null, "product_id": 9, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.210614", "source_table": null, "warehouse_id": 10, "quantity_delta": 6.0000}
49	I	2025-11-09 20:13:41.960658+09	admin	{"id": 49, "lot_id": 49, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.214748", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.214736", "source_table": null, "warehouse_id": 10, "quantity_delta": 13.0000}
50	I	2025-11-09 20:13:41.960658+09	admin	{"id": 50, "lot_id": 50, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.22052", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.220514", "source_table": null, "warehouse_id": 10, "quantity_delta": 76.0000}
51	I	2025-11-09 20:13:41.960658+09	admin	{"id": 51, "lot_id": 51, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.225416", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.225409", "source_table": null, "warehouse_id": 10, "quantity_delta": 190.0000}
52	I	2025-11-09 20:13:41.960658+09	admin	{"id": 52, "lot_id": 52, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.230267", "created_by": null, "deleted_at": null, "product_id": 9, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.230261", "source_table": null, "warehouse_id": 11, "quantity_delta": 126.0000}
53	I	2025-11-09 20:13:41.960658+09	admin	{"id": 53, "lot_id": 53, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.235944", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.235934", "source_table": null, "warehouse_id": 10, "quantity_delta": 173.0000}
54	I	2025-11-09 20:13:41.960658+09	admin	{"id": 54, "lot_id": 54, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.240986", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.240976", "source_table": null, "warehouse_id": 11, "quantity_delta": 124.0000}
55	I	2025-11-09 20:13:41.960658+09	admin	{"id": 55, "lot_id": 55, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:13:42.245617", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "occurred_at": "2025-11-09T11:13:42.245612", "source_table": null, "warehouse_id": 10, "quantity_delta": 191.0000}
56	I	2025-11-09 20:16:26.391736+09	admin	{"id": 56, "lot_id": 56, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.440397", "created_by": null, "deleted_at": null, "product_id": 1, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.440389", "source_table": null, "warehouse_id": 8, "quantity_delta": 134.0000}
57	I	2025-11-09 20:16:26.391736+09	admin	{"id": 57, "lot_id": 57, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.451172", "created_by": null, "deleted_at": null, "product_id": 10, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.451165", "source_table": null, "warehouse_id": 8, "quantity_delta": 188.0000}
58	I	2025-11-09 20:16:26.391736+09	admin	{"id": 58, "lot_id": 58, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.45664", "created_by": null, "deleted_at": null, "product_id": 11, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.45663", "source_table": null, "warehouse_id": 13, "quantity_delta": 61.0000}
59	I	2025-11-09 20:16:26.391736+09	admin	{"id": 59, "lot_id": 59, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.461327", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.461321", "source_table": null, "warehouse_id": 12, "quantity_delta": 6.0000}
60	I	2025-11-09 20:16:26.391736+09	admin	{"id": 60, "lot_id": 60, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.467488", "created_by": null, "deleted_at": null, "product_id": 13, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.467477", "source_table": null, "warehouse_id": 9, "quantity_delta": 92.0000}
61	I	2025-11-09 20:16:26.391736+09	admin	{"id": 61, "lot_id": 61, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.473516", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.473505", "source_table": null, "warehouse_id": 9, "quantity_delta": 200.0000}
62	I	2025-11-09 20:16:26.391736+09	admin	{"id": 62, "lot_id": 62, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.479699", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.479688", "source_table": null, "warehouse_id": 8, "quantity_delta": 29.0000}
63	I	2025-11-09 20:16:26.391736+09	admin	{"id": 63, "lot_id": 63, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.484622", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.484615", "source_table": null, "warehouse_id": 10, "quantity_delta": 16.0000}
64	I	2025-11-09 20:16:26.391736+09	admin	{"id": 64, "lot_id": 64, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.488603", "created_by": null, "deleted_at": null, "product_id": 12, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.488598", "source_table": null, "warehouse_id": 11, "quantity_delta": 101.0000}
65	I	2025-11-09 20:16:26.391736+09	admin	{"id": 65, "lot_id": 65, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.493701", "created_by": null, "deleted_at": null, "product_id": 2, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.493694", "source_table": null, "warehouse_id": 12, "quantity_delta": 165.0000}
66	I	2025-11-09 20:16:26.391736+09	admin	{"id": 66, "lot_id": 66, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.498427", "created_by": null, "deleted_at": null, "product_id": 10, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.49842", "source_table": null, "warehouse_id": 10, "quantity_delta": 185.0000}
67	I	2025-11-09 20:16:26.391736+09	admin	{"id": 67, "lot_id": 67, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.502585", "created_by": null, "deleted_at": null, "product_id": 2, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.502577", "source_table": null, "warehouse_id": 8, "quantity_delta": 79.0000}
68	I	2025-11-09 20:16:26.391736+09	admin	{"id": 68, "lot_id": 68, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.507853", "created_by": null, "deleted_at": null, "product_id": 2, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.507847", "source_table": null, "warehouse_id": 9, "quantity_delta": 76.0000}
69	I	2025-11-09 20:16:26.391736+09	admin	{"id": 69, "lot_id": 69, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.512105", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.512098", "source_table": null, "warehouse_id": 13, "quantity_delta": 99.0000}
70	I	2025-11-09 20:16:26.391736+09	admin	{"id": 70, "lot_id": 70, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.516464", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.516458", "source_table": null, "warehouse_id": 9, "quantity_delta": 184.0000}
71	I	2025-11-09 20:16:26.391736+09	admin	{"id": 71, "lot_id": 71, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.521717", "created_by": null, "deleted_at": null, "product_id": 11, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.521712", "source_table": null, "warehouse_id": 13, "quantity_delta": 167.0000}
72	I	2025-11-09 20:16:26.391736+09	admin	{"id": 72, "lot_id": 72, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.526127", "created_by": null, "deleted_at": null, "product_id": 3, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.52612", "source_table": null, "warehouse_id": 12, "quantity_delta": 123.0000}
73	I	2025-11-09 20:16:26.391736+09	admin	{"id": 73, "lot_id": 73, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.531209", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.5312", "source_table": null, "warehouse_id": 10, "quantity_delta": 147.0000}
74	I	2025-11-09 20:16:26.391736+09	admin	{"id": 74, "lot_id": 74, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.536147", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.536133", "source_table": null, "warehouse_id": 13, "quantity_delta": 19.0000}
75	I	2025-11-09 20:16:26.391736+09	admin	{"id": 75, "lot_id": 75, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.541732", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.54172", "source_table": null, "warehouse_id": 8, "quantity_delta": 73.0000}
76	I	2025-11-09 20:16:26.391736+09	admin	{"id": 76, "lot_id": 76, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.546903", "created_by": null, "deleted_at": null, "product_id": 2, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.546895", "source_table": null, "warehouse_id": 9, "quantity_delta": 188.0000}
77	I	2025-11-09 20:16:26.391736+09	admin	{"id": 77, "lot_id": 77, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.551328", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.551322", "source_table": null, "warehouse_id": 9, "quantity_delta": 106.0000}
78	I	2025-11-09 20:16:26.391736+09	admin	{"id": 78, "lot_id": 78, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.558567", "created_by": null, "deleted_at": null, "product_id": 11, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.558557", "source_table": null, "warehouse_id": 11, "quantity_delta": 40.0000}
79	I	2025-11-09 20:16:26.391736+09	admin	{"id": 79, "lot_id": 79, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.565285", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.565276", "source_table": null, "warehouse_id": 13, "quantity_delta": 72.0000}
80	I	2025-11-09 20:16:26.391736+09	admin	{"id": 80, "lot_id": 80, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.570975", "created_by": null, "deleted_at": null, "product_id": 12, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.570966", "source_table": null, "warehouse_id": 12, "quantity_delta": 154.0000}
81	I	2025-11-09 20:16:26.391736+09	admin	{"id": 81, "lot_id": 81, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.576858", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.576849", "source_table": null, "warehouse_id": 10, "quantity_delta": 135.0000}
82	I	2025-11-09 20:16:26.391736+09	admin	{"id": 82, "lot_id": 82, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.584928", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.584921", "source_table": null, "warehouse_id": 8, "quantity_delta": 33.0000}
83	I	2025-11-09 20:16:26.391736+09	admin	{"id": 83, "lot_id": 83, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.591371", "created_by": null, "deleted_at": null, "product_id": 3, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.591362", "source_table": null, "warehouse_id": 13, "quantity_delta": 179.0000}
84	I	2025-11-09 20:16:26.391736+09	admin	{"id": 84, "lot_id": 84, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.597482", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.597472", "source_table": null, "warehouse_id": 12, "quantity_delta": 102.0000}
85	I	2025-11-09 20:16:26.391736+09	admin	{"id": 85, "lot_id": 85, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.604237", "created_by": null, "deleted_at": null, "product_id": 10, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.604223", "source_table": null, "warehouse_id": 11, "quantity_delta": 146.0000}
86	I	2025-11-09 20:16:26.391736+09	admin	{"id": 86, "lot_id": 86, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.608873", "created_by": null, "deleted_at": null, "product_id": 14, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.608865", "source_table": null, "warehouse_id": 8, "quantity_delta": 34.0000}
87	I	2025-11-09 20:16:26.391736+09	admin	{"id": 87, "lot_id": 87, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.614194", "created_by": null, "deleted_at": null, "product_id": 11, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.614177", "source_table": null, "warehouse_id": 12, "quantity_delta": 169.0000}
88	I	2025-11-09 20:16:26.391736+09	admin	{"id": 88, "lot_id": 88, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.619582", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.619569", "source_table": null, "warehouse_id": 8, "quantity_delta": 45.0000}
89	I	2025-11-09 20:16:26.391736+09	admin	{"id": 89, "lot_id": 89, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.626217", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.626209", "source_table": null, "warehouse_id": 8, "quantity_delta": 200.0000}
90	I	2025-11-09 20:16:26.391736+09	admin	{"id": 90, "lot_id": 90, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.631662", "created_by": null, "deleted_at": null, "product_id": 3, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.631655", "source_table": null, "warehouse_id": 12, "quantity_delta": 165.0000}
91	I	2025-11-09 20:16:26.391736+09	admin	{"id": 91, "lot_id": 91, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.635193", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.635188", "source_table": null, "warehouse_id": 13, "quantity_delta": 55.0000}
92	I	2025-11-09 20:16:26.391736+09	admin	{"id": 92, "lot_id": 92, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.638406", "created_by": null, "deleted_at": null, "product_id": 3, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.6384", "source_table": null, "warehouse_id": 10, "quantity_delta": 140.0000}
93	I	2025-11-09 20:16:26.391736+09	admin	{"id": 93, "lot_id": 93, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.64215", "created_by": null, "deleted_at": null, "product_id": 1, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.642144", "source_table": null, "warehouse_id": 12, "quantity_delta": 9.0000}
94	I	2025-11-09 20:16:26.391736+09	admin	{"id": 94, "lot_id": 94, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.647452", "created_by": null, "deleted_at": null, "product_id": 2, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.647444", "source_table": null, "warehouse_id": 10, "quantity_delta": 19.0000}
95	I	2025-11-09 20:16:26.391736+09	admin	{"id": 95, "lot_id": 95, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.652391", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.652386", "source_table": null, "warehouse_id": 12, "quantity_delta": 192.0000}
96	I	2025-11-09 20:16:26.391736+09	admin	{"id": 96, "lot_id": 96, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.656067", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.656061", "source_table": null, "warehouse_id": 8, "quantity_delta": 37.0000}
97	I	2025-11-09 20:16:26.391736+09	admin	{"id": 97, "lot_id": 97, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.660031", "created_by": null, "deleted_at": null, "product_id": 3, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.660023", "source_table": null, "warehouse_id": 13, "quantity_delta": 145.0000}
98	I	2025-11-09 20:16:26.391736+09	admin	{"id": 98, "lot_id": 98, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.664167", "created_by": null, "deleted_at": null, "product_id": 3, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.664152", "source_table": null, "warehouse_id": 10, "quantity_delta": 160.0000}
99	I	2025-11-09 20:16:26.391736+09	admin	{"id": 99, "lot_id": 99, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.668307", "created_by": null, "deleted_at": null, "product_id": 7, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.668302", "source_table": null, "warehouse_id": 9, "quantity_delta": 191.0000}
100	I	2025-11-09 20:16:26.391736+09	admin	{"id": 100, "lot_id": 100, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.672826", "created_by": null, "deleted_at": null, "product_id": 12, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.672819", "source_table": null, "warehouse_id": 9, "quantity_delta": 176.0000}
101	I	2025-11-09 20:16:26.391736+09	admin	{"id": 101, "lot_id": 101, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.677102", "created_by": null, "deleted_at": null, "product_id": 11, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.677095", "source_table": null, "warehouse_id": 10, "quantity_delta": 137.0000}
102	I	2025-11-09 20:16:26.391736+09	admin	{"id": 102, "lot_id": 102, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.68101", "created_by": null, "deleted_at": null, "product_id": 8, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.681003", "source_table": null, "warehouse_id": 8, "quantity_delta": 21.0000}
103	I	2025-11-09 20:16:26.391736+09	admin	{"id": 103, "lot_id": 103, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.685393", "created_by": null, "deleted_at": null, "product_id": 6, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.685385", "source_table": null, "warehouse_id": 8, "quantity_delta": 63.0000}
104	I	2025-11-09 20:16:26.391736+09	admin	{"id": 104, "lot_id": 104, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.689828", "created_by": null, "deleted_at": null, "product_id": 10, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.68982", "source_table": null, "warehouse_id": 9, "quantity_delta": 186.0000}
105	I	2025-11-09 20:16:26.391736+09	admin	{"id": 105, "lot_id": 105, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-09T11:16:26.695497", "created_by": null, "deleted_at": null, "product_id": 11, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "occurred_at": "2025-11-09T11:16:26.695489", "source_table": null, "warehouse_id": 8, "quantity_delta": 13.0000}
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.suppliers (supplier_code, supplier_name, address, created_at, updated_at, created_by, updated_by, deleted_at, revision, id) FROM stdin;
SUP-001	仕入先A	Nagoya	2025-11-08 22:35:27.247696	2025-11-08 22:35:27.247696	\N	\N	\N	1	1
SUP-20251108224549	仕入先A	Nagoya	2025-11-08 22:45:49.798581	2025-11-08 22:45:49.798581	\N	\N	\N	1	2
\.


--
-- Data for Name: suppliers_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.suppliers_history (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: unit_conversions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.unit_conversions (id, from_unit, to_unit, factor, created_at, updated_at, created_by, updated_by, deleted_at, revision, product_id) FROM stdin;
\.


--
-- Data for Name: unit_conversions_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.unit_conversions_history (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: warehouse; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.warehouse (id, warehouse_code, warehouse_name, address, is_active, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.warehouses (warehouse_code, warehouse_name, address, is_active, created_at, updated_at, created_by, updated_by, deleted_at, revision, id) FROM stdin;
W-001	本社倉庫	\N	t	2025-11-08 23:34:11.632543	2025-11-08 23:34:11.632543	\N	\N	\N	1	8
W55	狛江市倉庫	\N	t	2025-11-09 10:56:44.55428	2025-11-09 19:56:44.620348	\N	\N	\N	1	9
W95	東村山市倉庫	\N	t	2025-11-09 11:13:41.971991	2025-11-09 20:13:41.960658	\N	\N	\N	1	10
W31	富津市倉庫	\N	t	2025-11-09 11:13:41.972177	2025-11-09 20:13:41.960658	\N	\N	\N	1	11
W64	台東区倉庫	\N	t	2025-11-09 11:16:26.413435	2025-11-09 20:16:26.391736	\N	\N	\N	1	12
W14	夷隅郡大多喜町倉庫	\N	t	2025-11-09 11:16:26.413451	2025-11-09 20:16:26.391736	\N	\N	\N	1	13
\.


--
-- Data for Name: warehouses_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.warehouses_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-08 23:09:24.907152+09	admin	{"id": 4, "address": null, "revision": 1, "is_active": true, "created_at": "2025-11-08T23:09:24.907152", "created_by": null, "deleted_at": null, "updated_at": "2025-11-08T23:09:24.907152", "updated_by": null, "warehouse_code": "ZZ-AUDIT", "warehouse_name": "監査テスト倉庫"}
2	U	2025-11-08 23:09:24.907152+09	admin	{"id": 4, "address": null, "revision": 1, "is_active": true, "created_at": "2025-11-08T23:09:24.907152", "created_by": null, "deleted_at": null, "updated_at": "2025-11-08T23:09:24.907152", "updated_by": null, "warehouse_code": "ZZ-AUDIT", "warehouse_name": "監査テスト倉庫(改)"}
3	D	2025-11-08 23:09:24.907152+09	admin	{"id": 4, "address": null, "revision": 1, "is_active": true, "created_at": "2025-11-08T23:09:24.907152", "created_by": null, "deleted_at": null, "updated_at": "2025-11-08T23:09:24.907152", "updated_by": null, "warehouse_code": "ZZ-AUDIT", "warehouse_name": "監査テスト倉庫(改)"}
5	I	2025-11-08 23:27:34.125249+09	admin	{"id": 6, "address": null, "revision": 1, "is_active": true, "created_at": "2025-11-08T23:27:34.125249", "created_by": null, "deleted_at": null, "updated_at": "2025-11-08T23:27:34.125249", "updated_by": null, "warehouse_code": "TEST-01", "warehouse_name": "監査検証倉庫"}
6	U	2025-11-08 23:29:06.843159+09	admin	{"id": 6, "address": null, "revision": 1, "is_active": true, "created_at": "2025-11-08T23:27:34.125249", "created_by": null, "deleted_at": null, "updated_at": "2025-11-08T23:29:06.843159", "updated_by": null, "warehouse_code": "TEST-01", "warehouse_name": "監査検証倉庫"}
7	U	2025-11-08 23:29:07.141346+09	admin	{"id": 6, "address": null, "revision": 1, "is_active": true, "created_at": "2025-11-08T23:27:34.125249", "created_by": null, "deleted_at": null, "updated_at": "2025-11-08T23:29:07.141346", "updated_by": null, "warehouse_code": "TEST-01", "warehouse_name": "監査検証倉庫-更新"}
8	D	2025-11-08 23:29:07.419087+09	admin	{"id": 6, "address": null, "revision": 1, "is_active": true, "created_at": "2025-11-08T23:27:34.125249", "created_by": null, "deleted_at": null, "updated_at": "2025-11-08T23:29:07.141346", "updated_by": null, "warehouse_code": "TEST-01", "warehouse_name": "監査検証倉庫-更新"}
9	I	2025-11-08 23:34:11.632543+09	admin	{"id": 8, "address": null, "revision": 1, "is_active": true, "created_at": "2025-11-08T23:34:11.632543", "created_by": null, "deleted_at": null, "updated_at": "2025-11-08T23:34:11.632543", "updated_by": null, "warehouse_code": "W-001", "warehouse_name": "本社倉庫"}
10	I	2025-11-09 19:56:44.620348+09	admin	{"id": 9, "address": null, "revision": 1, "is_active": true, "created_at": "2025-11-09T10:56:44.55428", "created_by": null, "deleted_at": null, "updated_at": "2025-11-09T19:56:44.620348", "updated_by": null, "warehouse_code": "W55", "warehouse_name": "狛江市倉庫"}
11	I	2025-11-09 20:13:41.960658+09	admin	{"id": 10, "address": null, "revision": 1, "is_active": true, "created_at": "2025-11-09T11:13:41.971991", "created_by": null, "deleted_at": null, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "warehouse_code": "W95", "warehouse_name": "東村山市倉庫"}
12	I	2025-11-09 20:13:41.960658+09	admin	{"id": 11, "address": null, "revision": 1, "is_active": true, "created_at": "2025-11-09T11:13:41.972177", "created_by": null, "deleted_at": null, "updated_at": "2025-11-09T20:13:41.960658", "updated_by": null, "warehouse_code": "W31", "warehouse_name": "富津市倉庫"}
13	I	2025-11-09 20:16:26.391736+09	admin	{"id": 12, "address": null, "revision": 1, "is_active": true, "created_at": "2025-11-09T11:16:26.413435", "created_by": null, "deleted_at": null, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "warehouse_code": "W64", "warehouse_name": "台東区倉庫"}
14	I	2025-11-09 20:16:26.391736+09	admin	{"id": 13, "address": null, "revision": 1, "is_active": true, "created_at": "2025-11-09T11:16:26.413451", "created_by": null, "deleted_at": null, "updated_at": "2025-11-09T20:16:26.391736", "updated_by": null, "warehouse_code": "W14", "warehouse_name": "夷隅郡大多喜町倉庫"}
\.


--
-- Name: allocations_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.allocations_history_id_seq', 1, false);


--
-- Name: allocations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.allocations_id_seq', 1, false);


--
-- Name: customers_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customers_history_id_seq', 9, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customers_id_seq', 12, true);


--
-- Name: delivery_places_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.delivery_places_history_id_seq', 1, true);


--
-- Name: delivery_places_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.delivery_places_id_seq', 1, true);


--
-- Name: expiry_rules_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expiry_rules_history_id_seq', 1, false);


--
-- Name: expiry_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expiry_rules_id_seq', 1, false);


--
-- Name: forecast_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.forecast_id_seq', 1, false);


--
-- Name: forecasts_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.forecasts_history_id_seq', 1, false);


--
-- Name: inbound_submissions_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inbound_submissions_history_id_seq', 1, false);


--
-- Name: lot_current_stock_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lot_current_stock_history_id_seq', 1, false);


--
-- Name: lots_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lots_history_id_seq', 105, true);


--
-- Name: lots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lots_id_seq', 105, true);


--
-- Name: next_div_map_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.next_div_map_id_seq', 1, false);


--
-- Name: ocr_submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ocr_submissions_id_seq', 1, false);


--
-- Name: order_line_warehouse_allocation_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_line_warehouse_allocation_history_id_seq', 1, false);


--
-- Name: order_line_warehouse_allocation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_line_warehouse_allocation_id_seq', 1, false);


--
-- Name: order_lines_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_lines_history_id_seq', 42, true);


--
-- Name: order_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_lines_id_seq', 42, true);


--
-- Name: orders_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_history_id_seq', 20, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 20, true);


--
-- Name: product_uom_conversions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.product_uom_conversions_id_seq', 1, false);


--
-- Name: products_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_history_id_seq', 14, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 14, true);


--
-- Name: purchase_requests_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchase_requests_history_id_seq', 1, false);


--
-- Name: purchase_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchase_requests_id_seq', 1, false);


--
-- Name: receipt_headers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.receipt_headers_id_seq', 1, false);


--
-- Name: receipt_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.receipt_lines_id_seq', 1, false);


--
-- Name: sap_sync_logs_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sap_sync_logs_history_id_seq', 1, false);


--
-- Name: sap_sync_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sap_sync_logs_id_seq', 1, false);


--
-- Name: shipping_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.shipping_id_seq', 1, false);


--
-- Name: stock_movements_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stock_movements_history_id_seq', 105, true);


--
-- Name: stock_movements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stock_movements_id_seq', 105, true);


--
-- Name: suppliers_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.suppliers_history_id_seq', 1, false);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 2, true);


--
-- Name: unit_conversions_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.unit_conversions_history_id_seq', 1, false);


--
-- Name: unit_conversions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.unit_conversions_id_seq', 1, false);


--
-- Name: warehouse_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.warehouse_id_seq', 1, false);


--
-- Name: warehouses_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.warehouses_history_id_seq', 14, true);


--
-- Name: warehouses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.warehouses_id_seq', 13, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: allocations_history allocations_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations_history
    ADD CONSTRAINT allocations_history_pkey PRIMARY KEY (id);


--
-- Name: allocations allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_pkey PRIMARY KEY (id);


--
-- Name: customers_history customers_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers_history
    ADD CONSTRAINT customers_history_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: delivery_places_history delivery_places_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_places_history
    ADD CONSTRAINT delivery_places_history_pkey PRIMARY KEY (id);


--
-- Name: delivery_places delivery_places_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_places
    ADD CONSTRAINT delivery_places_pkey PRIMARY KEY (id);


--
-- Name: expiry_rules_history expiry_rules_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_rules_history
    ADD CONSTRAINT expiry_rules_history_pkey PRIMARY KEY (id);


--
-- Name: expiry_rules expiry_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_rules
    ADD CONSTRAINT expiry_rules_pkey PRIMARY KEY (id);


--
-- Name: forecasts forecast_forecast_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasts
    ADD CONSTRAINT forecast_forecast_id_key UNIQUE (forecast_id);


--
-- Name: forecasts forecast_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasts
    ADD CONSTRAINT forecast_pkey PRIMARY KEY (id);


--
-- Name: forecasts_history forecasts_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasts_history
    ADD CONSTRAINT forecasts_history_pkey PRIMARY KEY (id);


--
-- Name: inbound_submissions_history inbound_submissions_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_submissions_history
    ADD CONSTRAINT inbound_submissions_history_pkey PRIMARY KEY (id);


--
-- Name: lot_current_stock_history_backup lot_current_stock_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_current_stock_history_backup
    ADD CONSTRAINT lot_current_stock_history_pkey PRIMARY KEY (id);


--
-- Name: lot_current_stock_backup lot_current_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_current_stock_backup
    ADD CONSTRAINT lot_current_stock_pkey PRIMARY KEY (lot_id);


--
-- Name: lots_history lots_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots_history
    ADD CONSTRAINT lots_history_pkey PRIMARY KEY (id);


--
-- Name: lots lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_pkey PRIMARY KEY (id);


--
-- Name: next_div_map next_div_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.next_div_map
    ADD CONSTRAINT next_div_map_pkey PRIMARY KEY (id);


--
-- Name: inbound_submissions ocr_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_submissions
    ADD CONSTRAINT ocr_submissions_pkey PRIMARY KEY (id);


--
-- Name: inbound_submissions ocr_submissions_submission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_submissions
    ADD CONSTRAINT ocr_submissions_submission_id_key UNIQUE (submission_id);


--
-- Name: order_line_warehouse_allocation_history order_line_warehouse_allocation_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_warehouse_allocation_history
    ADD CONSTRAINT order_line_warehouse_allocation_history_pkey PRIMARY KEY (id);


--
-- Name: order_line_warehouse_allocation order_line_warehouse_allocation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_warehouse_allocation
    ADD CONSTRAINT order_line_warehouse_allocation_pkey PRIMARY KEY (id);


--
-- Name: order_lines_history order_lines_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines_history
    ADD CONSTRAINT order_lines_history_pkey PRIMARY KEY (id);


--
-- Name: order_lines order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_pkey PRIMARY KEY (id);


--
-- Name: orders_history orders_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_history
    ADD CONSTRAINT orders_history_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_no_key UNIQUE (order_no);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_uom_conversions product_uom_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_uom_conversions
    ADD CONSTRAINT product_uom_conversions_pkey PRIMARY KEY (id);


--
-- Name: products_history products_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products_history
    ADD CONSTRAINT products_history_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: purchase_requests_history purchase_requests_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests_history
    ADD CONSTRAINT purchase_requests_history_pkey PRIMARY KEY (id);


--
-- Name: purchase_requests purchase_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_pkey PRIMARY KEY (id);


--
-- Name: receipt_headers receipt_headers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_headers
    ADD CONSTRAINT receipt_headers_pkey PRIMARY KEY (id);


--
-- Name: receipt_headers receipt_headers_receipt_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_headers
    ADD CONSTRAINT receipt_headers_receipt_no_key UNIQUE (receipt_no);


--
-- Name: receipt_lines receipt_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT receipt_lines_pkey PRIMARY KEY (id);


--
-- Name: sap_sync_logs_history sap_sync_logs_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_sync_logs_history
    ADD CONSTRAINT sap_sync_logs_history_pkey PRIMARY KEY (id);


--
-- Name: sap_sync_logs sap_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_sync_logs
    ADD CONSTRAINT sap_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: shipping shipping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping
    ADD CONSTRAINT shipping_pkey PRIMARY KEY (id);


--
-- Name: stock_movements_history stock_movements_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements_history
    ADD CONSTRAINT stock_movements_history_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: suppliers_history suppliers_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers_history
    ADD CONSTRAINT suppliers_history_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: unit_conversions_history unit_conversions_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_conversions_history
    ADD CONSTRAINT unit_conversions_history_pkey PRIMARY KEY (id);


--
-- Name: unit_conversions unit_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_conversions
    ADD CONSTRAINT unit_conversions_pkey PRIMARY KEY (id);


--
-- Name: customers uq_customers_customer_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT uq_customers_customer_code UNIQUE (customer_code);


--
-- Name: delivery_places uq_delivery_places_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_places
    ADD CONSTRAINT uq_delivery_places_code UNIQUE (delivery_place_code);


--
-- Name: next_div_map uq_next_div_map_customer_ship_to_product; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.next_div_map
    ADD CONSTRAINT uq_next_div_map_customer_ship_to_product UNIQUE (customer_code, ship_to_code, product_code);


--
-- Name: order_lines uq_order_line; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT uq_order_line UNIQUE (order_id, line_no);


--
-- Name: order_line_warehouse_allocation uq_order_line_warehouse; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_warehouse_allocation
    ADD CONSTRAINT uq_order_line_warehouse UNIQUE (order_line_id, warehouse_id);


--
-- Name: product_uom_conversions uq_product_unit; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_uom_conversions
    ADD CONSTRAINT uq_product_unit UNIQUE (product_code, source_unit);


--
-- Name: unit_conversions uq_product_units; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_conversions
    ADD CONSTRAINT uq_product_units UNIQUE (product_id, from_unit, to_unit);


--
-- Name: products uq_products_product_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT uq_products_product_code UNIQUE (product_code);


--
-- Name: receipt_lines uq_receipt_line; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT uq_receipt_line UNIQUE (header_id, line_no);


--
-- Name: suppliers uq_suppliers_supplier_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT uq_suppliers_supplier_code UNIQUE (supplier_code);


--
-- Name: warehouses uq_warehouses_warehouse_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT uq_warehouses_warehouse_code UNIQUE (warehouse_code);


--
-- Name: warehouse warehouse_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse
    ADD CONSTRAINT warehouse_pkey PRIMARY KEY (id);


--
-- Name: warehouses_history warehouses_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses_history
    ADD CONSTRAINT warehouses_history_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: allocations_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX allocations_hist_gin_row ON public.allocations_history USING gin (row_data);


--
-- Name: allocations_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX allocations_hist_idx_changed_at ON public.allocations_history USING btree (changed_at);


--
-- Name: allocations_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX allocations_hist_idx_op ON public.allocations_history USING btree (op);


--
-- Name: allocations_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX allocations_hist_idx_row_id ON public.allocations_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: customers_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customers_hist_gin_row ON public.customers_history USING gin (row_data);


--
-- Name: customers_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customers_hist_idx_changed_at ON public.customers_history USING btree (changed_at);


--
-- Name: customers_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customers_hist_idx_op ON public.customers_history USING btree (op);


--
-- Name: customers_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customers_hist_idx_row_id ON public.customers_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: delivery_places_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_places_hist_gin_row ON public.delivery_places_history USING gin (row_data);


--
-- Name: delivery_places_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_places_hist_idx_changed_at ON public.delivery_places_history USING btree (changed_at);


--
-- Name: delivery_places_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_places_hist_idx_op ON public.delivery_places_history USING btree (op);


--
-- Name: delivery_places_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_places_hist_idx_row_id ON public.delivery_places_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: expiry_rules_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expiry_rules_hist_gin_row ON public.expiry_rules_history USING gin (row_data);


--
-- Name: expiry_rules_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expiry_rules_hist_idx_changed_at ON public.expiry_rules_history USING btree (changed_at);


--
-- Name: expiry_rules_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expiry_rules_hist_idx_op ON public.expiry_rules_history USING btree (op);


--
-- Name: expiry_rules_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expiry_rules_hist_idx_row_id ON public.expiry_rules_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: forecasts_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX forecasts_hist_gin_row ON public.forecasts_history USING gin (row_data);


--
-- Name: forecasts_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX forecasts_hist_idx_changed_at ON public.forecasts_history USING btree (changed_at);


--
-- Name: forecasts_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX forecasts_hist_idx_op ON public.forecasts_history USING btree (op);


--
-- Name: forecasts_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX forecasts_hist_idx_row_id ON public.forecasts_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: gin_allocations_history_row_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gin_allocations_history_row_data ON public.allocations_history USING gin (row_data);


--
-- Name: gin_lots_history_row_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gin_lots_history_row_data ON public.lots_history USING gin (row_data);


--
-- Name: gin_order_lines_history_row_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gin_order_lines_history_row_data ON public.order_lines_history USING gin (row_data);


--
-- Name: gin_orders_history_row_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gin_orders_history_row_data ON public.orders_history USING gin (row_data);


--
-- Name: gin_products_history_row_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gin_products_history_row_data ON public.products_history USING gin (row_data);


--
-- Name: gin_warehouses_history_row_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gin_warehouses_history_row_data ON public.warehouses_history USING gin (row_data);


--
-- Name: idx_stock_movements_occurred_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_occurred_at ON public.stock_movements USING btree (occurred_at);


--
-- Name: idx_stock_movements_product_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_product_warehouse ON public.stock_movements USING btree (product_id, warehouse_id);


--
-- Name: inbound_submissions_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inbound_submissions_hist_gin_row ON public.inbound_submissions_history USING gin (row_data);


--
-- Name: inbound_submissions_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inbound_submissions_hist_idx_changed_at ON public.inbound_submissions_history USING btree (changed_at);


--
-- Name: inbound_submissions_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inbound_submissions_hist_idx_op ON public.inbound_submissions_history USING btree (op);


--
-- Name: inbound_submissions_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inbound_submissions_hist_idx_row_id ON public.inbound_submissions_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: ix_alloc_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_alloc_lot ON public.allocations USING btree (lot_id);


--
-- Name: ix_alloc_ol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_alloc_ol ON public.allocations USING btree (order_line_id);


--
-- Name: ix_allocations_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_allocations_history_changed_at ON public.allocations_history USING btree (changed_at);


--
-- Name: ix_customers_customer_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_customers_customer_code ON public.customers USING btree (customer_code);


--
-- Name: ix_delivery_places_delivery_place_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_delivery_places_delivery_place_code ON public.delivery_places USING btree (delivery_place_code);


--
-- Name: ix_lots_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lots_history_changed_at ON public.lots_history USING btree (changed_at);


--
-- Name: ix_lots_product_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lots_product_code ON public.lots USING btree (product_code);


--
-- Name: ix_lots_supplier_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lots_supplier_code ON public.lots USING btree (supplier_code);


--
-- Name: ix_lots_warehouse_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lots_warehouse_code ON public.lots USING btree (warehouse_code);


--
-- Name: ix_lots_warehouse_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lots_warehouse_id ON public.lots USING btree (warehouse_id);


--
-- Name: ix_order_lines_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_lines_history_changed_at ON public.order_lines_history USING btree (changed_at);


--
-- Name: ix_order_lines_product_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_order_lines_product_code ON public.order_lines USING btree (product_code);


--
-- Name: ix_orders_customer_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_orders_customer_code ON public.orders USING btree (customer_code);


--
-- Name: ix_orders_customer_id_order_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_orders_customer_id_order_date ON public.orders USING btree (customer_id, order_date);


--
-- Name: ix_orders_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_orders_history_changed_at ON public.orders_history USING btree (changed_at);


--
-- Name: ix_products_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_products_history_changed_at ON public.products_history USING btree (changed_at);


--
-- Name: ix_products_product_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_products_product_code ON public.products USING btree (product_code);


--
-- Name: ix_stock_movements_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_stock_movements_lot ON public.stock_movements USING btree (lot_id);


--
-- Name: ix_stock_movements_occurred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_stock_movements_occurred ON public.stock_movements USING btree (occurred_at) WHERE (deleted_at IS NULL);


--
-- Name: ix_stock_movements_pwl; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_stock_movements_pwl ON public.stock_movements USING btree (product_id, warehouse_id) WHERE (deleted_at IS NULL);


--
-- Name: ix_suppliers_supplier_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_suppliers_supplier_code ON public.suppliers USING btree (supplier_code);


--
-- Name: ix_warehouse_warehouse_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_warehouse_warehouse_code ON public.warehouse USING btree (warehouse_code);


--
-- Name: ix_warehouses_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_warehouses_history_changed_at ON public.warehouses_history USING btree (changed_at);


--
-- Name: lot_current_stock_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lot_current_stock_hist_gin_row ON public.lot_current_stock_history_backup USING gin (row_data);


--
-- Name: lot_current_stock_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lot_current_stock_hist_idx_changed_at ON public.lot_current_stock_history_backup USING btree (changed_at);


--
-- Name: lot_current_stock_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lot_current_stock_hist_idx_op ON public.lot_current_stock_history_backup USING btree (op);


--
-- Name: lot_current_stock_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lot_current_stock_hist_idx_row_id ON public.lot_current_stock_history_backup USING btree (((row_data ->> 'id'::text)));


--
-- Name: lots_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lots_hist_gin_row ON public.lots_history USING gin (row_data);


--
-- Name: lots_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lots_hist_idx_changed_at ON public.lots_history USING btree (changed_at);


--
-- Name: lots_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lots_hist_idx_op ON public.lots_history USING btree (op);


--
-- Name: lots_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lots_hist_idx_row_id ON public.lots_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: order_line_warehouse_allocation_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_line_warehouse_allocation_hist_gin_row ON public.order_line_warehouse_allocation_history USING gin (row_data);


--
-- Name: order_line_warehouse_allocation_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_line_warehouse_allocation_hist_idx_changed_at ON public.order_line_warehouse_allocation_history USING btree (changed_at);


--
-- Name: order_line_warehouse_allocation_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_line_warehouse_allocation_hist_idx_op ON public.order_line_warehouse_allocation_history USING btree (op);


--
-- Name: order_line_warehouse_allocation_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_line_warehouse_allocation_hist_idx_row_id ON public.order_line_warehouse_allocation_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: order_lines_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_lines_hist_gin_row ON public.order_lines_history USING gin (row_data);


--
-- Name: order_lines_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_lines_hist_idx_changed_at ON public.order_lines_history USING btree (changed_at);


--
-- Name: order_lines_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_lines_hist_idx_op ON public.order_lines_history USING btree (op);


--
-- Name: order_lines_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_lines_hist_idx_row_id ON public.order_lines_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: orders_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_hist_gin_row ON public.orders_history USING gin (row_data);


--
-- Name: orders_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_hist_idx_changed_at ON public.orders_history USING btree (changed_at);


--
-- Name: orders_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_hist_idx_op ON public.orders_history USING btree (op);


--
-- Name: orders_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_hist_idx_row_id ON public.orders_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: products_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_hist_gin_row ON public.products_history USING gin (row_data);


--
-- Name: products_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_hist_idx_changed_at ON public.products_history USING btree (changed_at);


--
-- Name: products_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_hist_idx_op ON public.products_history USING btree (op);


--
-- Name: products_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_hist_idx_row_id ON public.products_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: purchase_requests_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_requests_hist_gin_row ON public.purchase_requests_history USING gin (row_data);


--
-- Name: purchase_requests_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_requests_hist_idx_changed_at ON public.purchase_requests_history USING btree (changed_at);


--
-- Name: purchase_requests_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_requests_hist_idx_op ON public.purchase_requests_history USING btree (op);


--
-- Name: purchase_requests_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_requests_hist_idx_row_id ON public.purchase_requests_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: sap_sync_logs_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_sync_logs_hist_gin_row ON public.sap_sync_logs_history USING gin (row_data);


--
-- Name: sap_sync_logs_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_sync_logs_hist_idx_changed_at ON public.sap_sync_logs_history USING btree (changed_at);


--
-- Name: sap_sync_logs_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_sync_logs_hist_idx_op ON public.sap_sync_logs_history USING btree (op);


--
-- Name: sap_sync_logs_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_sync_logs_hist_idx_row_id ON public.sap_sync_logs_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: stock_movements_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_movements_hist_gin_row ON public.stock_movements_history USING gin (row_data);


--
-- Name: stock_movements_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_movements_hist_idx_changed_at ON public.stock_movements_history USING btree (changed_at);


--
-- Name: stock_movements_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_movements_hist_idx_op ON public.stock_movements_history USING btree (op);


--
-- Name: stock_movements_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_movements_hist_idx_row_id ON public.stock_movements_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: suppliers_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX suppliers_hist_gin_row ON public.suppliers_history USING gin (row_data);


--
-- Name: suppliers_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX suppliers_hist_idx_changed_at ON public.suppliers_history USING btree (changed_at);


--
-- Name: suppliers_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX suppliers_hist_idx_op ON public.suppliers_history USING btree (op);


--
-- Name: suppliers_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX suppliers_hist_idx_row_id ON public.suppliers_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: unit_conversions_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unit_conversions_hist_gin_row ON public.unit_conversions_history USING gin (row_data);


--
-- Name: unit_conversions_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unit_conversions_hist_idx_changed_at ON public.unit_conversions_history USING btree (changed_at);


--
-- Name: unit_conversions_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unit_conversions_hist_idx_op ON public.unit_conversions_history USING btree (op);


--
-- Name: unit_conversions_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unit_conversions_hist_idx_row_id ON public.unit_conversions_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: uq_orders_customer_order_no_per_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_orders_customer_order_no_per_customer ON public.orders USING btree (customer_id, customer_order_no) WHERE (customer_order_no IS NOT NULL);


--
-- Name: uq_warehouses_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_warehouses_id ON public.warehouses USING btree (id);


--
-- Name: warehouses_hist_gin_row; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX warehouses_hist_gin_row ON public.warehouses_history USING gin (row_data);


--
-- Name: warehouses_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX warehouses_hist_idx_changed_at ON public.warehouses_history USING btree (changed_at);


--
-- Name: warehouses_hist_idx_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX warehouses_hist_idx_op ON public.warehouses_history USING btree (op);


--
-- Name: warehouses_hist_idx_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX warehouses_hist_idx_row_id ON public.warehouses_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: allocations allocations_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER allocations_audit_del AFTER DELETE ON public.allocations FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: allocations allocations_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER allocations_audit_ins AFTER INSERT ON public.allocations FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: allocations allocations_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER allocations_audit_upd AFTER UPDATE ON public.allocations FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: customers customers_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customers_audit_del AFTER DELETE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: customers customers_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customers_audit_ins AFTER INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: customers customers_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customers_audit_upd AFTER UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: delivery_places delivery_places_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delivery_places_audit_del AFTER DELETE ON public.delivery_places FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: delivery_places delivery_places_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delivery_places_audit_ins AFTER INSERT ON public.delivery_places FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: delivery_places delivery_places_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delivery_places_audit_upd AFTER UPDATE ON public.delivery_places FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: expiry_rules expiry_rules_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER expiry_rules_audit_del AFTER DELETE ON public.expiry_rules FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: expiry_rules expiry_rules_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER expiry_rules_audit_ins AFTER INSERT ON public.expiry_rules FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: expiry_rules expiry_rules_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER expiry_rules_audit_upd AFTER UPDATE ON public.expiry_rules FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: forecasts forecasts_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER forecasts_audit_del AFTER DELETE ON public.forecasts FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: forecasts forecasts_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER forecasts_audit_ins AFTER INSERT ON public.forecasts FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: forecasts forecasts_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER forecasts_audit_upd AFTER UPDATE ON public.forecasts FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: inbound_submissions inbound_submissions_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER inbound_submissions_audit_del AFTER DELETE ON public.inbound_submissions FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: inbound_submissions inbound_submissions_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER inbound_submissions_audit_ins AFTER INSERT ON public.inbound_submissions FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: inbound_submissions inbound_submissions_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER inbound_submissions_audit_upd AFTER UPDATE ON public.inbound_submissions FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: lot_current_stock_backup lot_current_stock_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lot_current_stock_audit_del AFTER DELETE ON public.lot_current_stock_backup FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: lot_current_stock_backup lot_current_stock_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lot_current_stock_audit_ins AFTER INSERT ON public.lot_current_stock_backup FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: lot_current_stock_backup lot_current_stock_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lot_current_stock_audit_upd AFTER UPDATE ON public.lot_current_stock_backup FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: lots lots_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lots_audit_del AFTER DELETE ON public.lots FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: lots lots_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lots_audit_ins AFTER INSERT ON public.lots FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: lots lots_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lots_audit_upd AFTER UPDATE ON public.lots FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: order_line_warehouse_allocation order_line_warehouse_allocation_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER order_line_warehouse_allocation_audit_del AFTER DELETE ON public.order_line_warehouse_allocation FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: order_line_warehouse_allocation order_line_warehouse_allocation_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER order_line_warehouse_allocation_audit_ins AFTER INSERT ON public.order_line_warehouse_allocation FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: order_line_warehouse_allocation order_line_warehouse_allocation_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER order_line_warehouse_allocation_audit_upd AFTER UPDATE ON public.order_line_warehouse_allocation FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: order_lines order_lines_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER order_lines_audit_del AFTER DELETE ON public.order_lines FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: order_lines order_lines_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER order_lines_audit_ins AFTER INSERT ON public.order_lines FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: order_lines order_lines_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER order_lines_audit_upd AFTER UPDATE ON public.order_lines FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: orders orders_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER orders_audit_del AFTER DELETE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: orders orders_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER orders_audit_ins AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: orders orders_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER orders_audit_upd AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: products products_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER products_audit_del AFTER DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: products products_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER products_audit_ins AFTER INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: products products_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER products_audit_upd AFTER UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: purchase_requests purchase_requests_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER purchase_requests_audit_del AFTER DELETE ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: purchase_requests purchase_requests_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER purchase_requests_audit_ins AFTER INSERT ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: purchase_requests purchase_requests_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER purchase_requests_audit_upd AFTER UPDATE ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: sap_sync_logs sap_sync_logs_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sap_sync_logs_audit_del AFTER DELETE ON public.sap_sync_logs FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: sap_sync_logs sap_sync_logs_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sap_sync_logs_audit_ins AFTER INSERT ON public.sap_sync_logs FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: sap_sync_logs sap_sync_logs_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sap_sync_logs_audit_upd AFTER UPDATE ON public.sap_sync_logs FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: stock_movements stock_movements_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER stock_movements_audit_del AFTER DELETE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: stock_movements stock_movements_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER stock_movements_audit_ins AFTER INSERT ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: stock_movements stock_movements_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER stock_movements_audit_upd AFTER UPDATE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: suppliers suppliers_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER suppliers_audit_del AFTER DELETE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: suppliers suppliers_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER suppliers_audit_ins AFTER INSERT ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: suppliers suppliers_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER suppliers_audit_upd AFTER UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: unit_conversions unit_conversions_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER unit_conversions_audit_del AFTER DELETE ON public.unit_conversions FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: unit_conversions unit_conversions_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER unit_conversions_audit_ins AFTER INSERT ON public.unit_conversions FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: unit_conversions unit_conversions_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER unit_conversions_audit_upd AFTER UPDATE ON public.unit_conversions FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: warehouses warehouses_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER warehouses_audit_del AFTER DELETE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: warehouses warehouses_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER warehouses_audit_ins AFTER INSERT ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: warehouses warehouses_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER warehouses_audit_upd AFTER UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: allocations allocations_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: allocations allocations_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_order_line_id_fkey FOREIGN KEY (order_line_id) REFERENCES public.order_lines(id) ON DELETE CASCADE;


--
-- Name: allocations fk_allocations_destination; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT fk_allocations_destination FOREIGN KEY (destination_id) REFERENCES public.delivery_places(id);


--
-- Name: expiry_rules fk_expiry_rules_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_rules
    ADD CONSTRAINT fk_expiry_rules_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: expiry_rules fk_expiry_rules_supplier; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_rules
    ADD CONSTRAINT fk_expiry_rules_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: forecasts fk_forecasts_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasts
    ADD CONSTRAINT fk_forecasts_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: forecasts fk_forecasts_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasts
    ADD CONSTRAINT fk_forecasts_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: lots fk_lots_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT fk_lots_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: lots fk_lots_supplier; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT fk_lots_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: lots fk_lots_warehouse_id__warehouses_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT fk_lots_warehouse_id__warehouses_id FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;


--
-- Name: order_lines fk_order_lines_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT fk_order_lines_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: orders fk_orders_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: products fk_products_delivery_place; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_delivery_place FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id);


--
-- Name: products fk_products_supplier; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: purchase_requests fk_purchase_requests_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT fk_purchase_requests_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: purchase_requests fk_purchase_requests_supplier; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT fk_purchase_requests_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: stock_movements fk_stock_movements_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: unit_conversions fk_unit_conversions_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_conversions
    ADD CONSTRAINT fk_unit_conversions_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: lot_current_stock_backup lot_current_stock_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_current_stock_backup
    ADD CONSTRAINT lot_current_stock_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: order_line_warehouse_allocation order_line_warehouse_allocation_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_warehouse_allocation
    ADD CONSTRAINT order_line_warehouse_allocation_order_line_id_fkey FOREIGN KEY (order_line_id) REFERENCES public.order_lines(id) ON DELETE CASCADE;


--
-- Name: order_lines order_lines_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: product_uom_conversions product_uom_conversions_product_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_uom_conversions
    ADD CONSTRAINT product_uom_conversions_product_code_fkey FOREIGN KEY (product_code) REFERENCES public.products(product_code);


--
-- Name: purchase_requests purchase_requests_src_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_src_order_line_id_fkey FOREIGN KEY (src_order_line_id) REFERENCES public.order_lines(id);


--
-- Name: receipt_headers receipt_headers_supplier_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_headers
    ADD CONSTRAINT receipt_headers_supplier_code_fkey FOREIGN KEY (supplier_code) REFERENCES public.suppliers(supplier_code);


--
-- Name: receipt_headers receipt_headers_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_headers
    ADD CONSTRAINT receipt_headers_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouse(id);


--
-- Name: receipt_lines receipt_lines_header_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT receipt_lines_header_id_fkey FOREIGN KEY (header_id) REFERENCES public.receipt_headers(id) ON DELETE CASCADE;


--
-- Name: receipt_lines receipt_lines_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT receipt_lines_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id);


--
-- Name: receipt_lines receipt_lines_product_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT receipt_lines_product_code_fkey FOREIGN KEY (product_code) REFERENCES public.products(product_code);


--
-- Name: sap_sync_logs sap_sync_logs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_sync_logs
    ADD CONSTRAINT sap_sync_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: shipping shipping_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping
    ADD CONSTRAINT shipping_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id);


--
-- Name: shipping shipping_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping
    ADD CONSTRAINT shipping_order_line_id_fkey FOREIGN KEY (order_line_id) REFERENCES public.order_lines(id);


--
-- Name: stock_movements stock_movements_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id);


--
-- Name: stock_movements stock_movements_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict j3VSBrRd7LB65qE3a1abQDlqqfu3s2Vlp7fAbsOk1yyJbhNROdCoTcZ2AiNaJ6j

