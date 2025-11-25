--
-- PostgreSQL database dump
--

\restrict Pm0AfkfIB6Y5ecwoWPXEiEcnrgZrcnhBOmbY74CuUkVlNQpArUiglGvfcktzHCR

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: admin
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO admin;

--
-- Name: stockmovementreason; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.stockmovementreason AS ENUM (
    'RECEIPT',
    'SHIPMENT',
    'ALLOCATION_HOLD',
    'ALLOCATION_RELEASE',
    'ADJUSTMENT'
);


ALTER TYPE public.stockmovementreason OWNER TO admin;

--
-- Name: audit_write(); Type: FUNCTION; Schema: public; Owner: admin
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


ALTER FUNCTION public.audit_write() OWNER TO admin;

--
-- Name: FUNCTION audit_write(); Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON FUNCTION public.audit_write() IS '任意テーブルの *_history に I/U/D と行スナップショット(JSONB)を書き込むトリガ関数';


--
-- Name: comment_on_column_if_exists(text, text, text, text); Type: FUNCTION; Schema: public; Owner: admin
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


ALTER FUNCTION public.comment_on_column_if_exists(sch text, tbl text, col text, comm text) OWNER TO admin;

--
-- Name: comment_on_table_if_exists(text, text, text); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.comment_on_table_if_exists(sch text, tbl text, comm text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF to_regclass(format('%I.%I', sch, tbl)) IS NOT NULL THEN
    EXECUTE format('COMMENT ON TABLE %I.%I IS %L', sch, tbl, comm);
  END IF;
END$$;


ALTER FUNCTION public.comment_on_table_if_exists(sch text, tbl text, comm text) OWNER TO admin;

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
-- Name: TABLE alembic_version; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.alembic_version IS 'Alembicの現在リビジョンを保持する内部管理テーブル';


--
-- Name: COLUMN alembic_version.version_num; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.alembic_version.version_num IS 'Alembic リビジョン番号（現在HEAD）';


--
-- Name: allocations; Type: TABLE; Schema: public; Owner: admin
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
    destination_id integer,
    status text DEFAULT 'reserved'::text NOT NULL,
    CONSTRAINT ck_allocations_status CHECK ((status = ANY (ARRAY['reserved'::text, 'picked'::text, 'committed'::text, 'shipped'::text])))
);


ALTER TABLE public.allocations OWNER TO admin;

--
-- Name: allocations_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.allocations_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.allocations_history OWNER TO admin;

--
-- Name: TABLE allocations_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.allocations_history IS '監査履歴（allocations 用）';


--
-- Name: COLUMN allocations_history.op; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocations_history.op IS '操作種別: I/U/D';


--
-- Name: COLUMN allocations_history.changed_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocations_history.changed_at IS '変更日時（トリガ時刻）';


--
-- Name: COLUMN allocations_history.changed_by; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocations_history.changed_by IS '変更ユーザー（DBユーザー）';


--
-- Name: COLUMN allocations_history.row_data; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocations_history.row_data IS '変更後(または削除時の旧)レコードJSON';


--
-- Name: allocations_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.allocations_history_id_seq
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
    revision integer DEFAULT 1 NOT NULL,
    id integer NOT NULL
);


ALTER TABLE public.customers OWNER TO admin;

--
-- Name: customers_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.customers_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.customers_history OWNER TO admin;

--
-- Name: TABLE customers_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.customers_history IS 'customers の変更履歴（監査ログ）';


--
-- Name: customers_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.customers_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.customers_history_id_seq OWNER TO admin;

--
-- Name: customers_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.customers_history_id_seq OWNED BY public.customers_history.id;


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.customers_id_seq OWNER TO admin;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: delivery_places; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.delivery_places OWNER TO admin;

--
-- Name: delivery_places_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.delivery_places_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.delivery_places_history OWNER TO admin;

--
-- Name: TABLE delivery_places_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.delivery_places_history IS 'delivery_places の変更履歴（監査ログ）';


--
-- Name: delivery_places_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.delivery_places_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.delivery_places_history_id_seq OWNER TO admin;

--
-- Name: delivery_places_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.delivery_places_history_id_seq OWNED BY public.delivery_places_history.id;


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


ALTER TABLE public.expiry_rules OWNER TO admin;

--
-- Name: expiry_rules_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.expiry_rules_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.expiry_rules_history OWNER TO admin;

--
-- Name: TABLE expiry_rules_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.expiry_rules_history IS 'expiry_rules の変更履歴（監査ログ）';


--
-- Name: expiry_rules_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.expiry_rules_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.expiry_rules_history_id_seq OWNER TO admin;

--
-- Name: expiry_rules_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.expiry_rules_history_id_seq OWNED BY public.expiry_rules_history.id;


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
-- Name: forecasts_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.forecasts_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.forecasts_history OWNER TO admin;

--
-- Name: TABLE forecasts_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.forecasts_history IS 'forecasts の変更履歴（監査ログ）';


--
-- Name: forecasts_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.forecasts_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.forecasts_history_id_seq OWNER TO admin;

--
-- Name: forecasts_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.forecasts_history_id_seq OWNED BY public.forecasts_history.id;


--
-- Name: inbound_submissions; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.inbound_submissions OWNER TO admin;

--
-- Name: inbound_submissions_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.inbound_submissions_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.inbound_submissions_history OWNER TO admin;

--
-- Name: TABLE inbound_submissions_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.inbound_submissions_history IS 'inbound_submissions の変更履歴（監査ログ）';


--
-- Name: inbound_submissions_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.inbound_submissions_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.inbound_submissions_history_id_seq OWNER TO admin;

--
-- Name: inbound_submissions_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.inbound_submissions_history_id_seq OWNED BY public.inbound_submissions_history.id;


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
    warehouse_id integer NOT NULL,
    source_table character varying(50),
    source_id integer,
    batch_id character varying(100),
    product_id integer NOT NULL,
    related_order_id integer,
    related_allocation_id integer
);


ALTER TABLE public.stock_movements OWNER TO admin;

--
-- Name: lot_current_stock; Type: VIEW; Schema: public; Owner: admin
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


ALTER TABLE public.lot_current_stock OWNER TO admin;

--
-- Name: lot_current_stock_backup; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.lot_current_stock_backup OWNER TO admin;

--
-- Name: lot_current_stock_history_backup; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.lot_current_stock_history_backup (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.lot_current_stock_history_backup OWNER TO admin;

--
-- Name: TABLE lot_current_stock_history_backup; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.lot_current_stock_history_backup IS 'lot_current_stock の変更履歴（監査ログ）';


--
-- Name: lot_current_stock_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.lot_current_stock_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lot_current_stock_history_id_seq OWNER TO admin;

--
-- Name: lot_current_stock_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.lot_current_stock_history_id_seq OWNED BY public.lot_current_stock_history_backup.id;


--
-- Name: lots; Type: TABLE; Schema: public; Owner: admin
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
    supplier_code text,
    warehouse_code text,
    lot_status character varying(32) DEFAULT 'available'::character varying NOT NULL,
    CONSTRAINT ck_lots_lot_status CHECK (((lot_status)::text = ANY (ARRAY['available'::text, 'hold'::text, 'obsolete'::text, 'damaged'::text]))),
    CONSTRAINT lots_lot_status_check CHECK (((lot_status)::text = ANY (ARRAY['available'::text, 'allocated'::text, 'hold'::text, 'expired'::text])))
);


ALTER TABLE public.lots OWNER TO admin;

--
-- Name: lots_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.lots_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.lots_history OWNER TO admin;

--
-- Name: TABLE lots_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.lots_history IS '監査履歴（lots 用）';


--
-- Name: COLUMN lots_history.op; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots_history.op IS '操作種別: I/U/D';


--
-- Name: COLUMN lots_history.changed_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots_history.changed_at IS '変更日時（トリガ時刻）';


--
-- Name: COLUMN lots_history.changed_by; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots_history.changed_by IS '変更ユーザー（DBユーザー）';


--
-- Name: COLUMN lots_history.row_data; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots_history.row_data IS '変更後(または削除時の旧)レコードJSON';


--
-- Name: lots_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.lots_history_id_seq
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
    next_div text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    product_id integer
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
    quantity numeric(15,4) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    CONSTRAINT ck_olwa_quantity_positive CHECK (((quantity)::double precision > (0)::double precision))
);


ALTER TABLE public.order_line_warehouse_allocation OWNER TO admin;

--
-- Name: order_line_warehouse_allocation_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.order_line_warehouse_allocation_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.order_line_warehouse_allocation_history OWNER TO admin;

--
-- Name: TABLE order_line_warehouse_allocation_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.order_line_warehouse_allocation_history IS 'order_line_warehouse_allocation の変更履歴（監査ログ）';


--
-- Name: order_line_warehouse_allocation_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.order_line_warehouse_allocation_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.order_line_warehouse_allocation_history_id_seq OWNER TO admin;

--
-- Name: order_line_warehouse_allocation_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.order_line_warehouse_allocation_history_id_seq OWNED BY public.order_line_warehouse_allocation_history.id;


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
    quantity numeric(15,4) NOT NULL,
    unit text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    product_id integer,
    warehouse_id integer
);


ALTER TABLE public.order_lines OWNER TO admin;

--
-- Name: order_lines_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.order_lines_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.order_lines_history OWNER TO admin;

--
-- Name: TABLE order_lines_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.order_lines_history IS '監査履歴（order_lines 用）';


--
-- Name: COLUMN order_lines_history.op; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_lines_history.op IS '操作種別: I/U/D';


--
-- Name: COLUMN order_lines_history.changed_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_lines_history.changed_at IS '変更日時（トリガ時刻）';


--
-- Name: COLUMN order_lines_history.changed_by; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_lines_history.changed_by IS '変更ユーザー（DBユーザー）';


--
-- Name: COLUMN order_lines_history.row_data; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_lines_history.row_data IS '変更後(または削除時の旧)レコードJSON';


--
-- Name: order_lines_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.order_lines_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.order_lines_history_id_seq OWNER TO admin;

--
-- Name: order_lines_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.order_lines_history_id_seq OWNED BY public.order_lines_history.id;


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
    order_date date NOT NULL,
    status text NOT NULL,
    sap_order_id text,
    sap_status text,
    sap_sent_at timestamp without time zone,
    sap_error_msg text,
    created_at timestamp without time zone DEFAULT now(),
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
    delivery_place_id integer,
    CONSTRAINT ck_orders_delivery_mode CHECK (((delivery_mode IS NULL) OR (delivery_mode = ANY (ARRAY['normal'::text, 'express'::text, 'pickup'::text])))),
    CONSTRAINT ck_orders_status CHECK ((status = ANY (ARRAY['draft'::text, 'open'::text, 'part_allocated'::text, 'allocated'::text, 'shipped'::text, 'closed'::text, 'cancelled'::text])))
);


ALTER TABLE public.orders OWNER TO admin;

--
-- Name: orders_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.orders_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.orders_history OWNER TO admin;

--
-- Name: TABLE orders_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.orders_history IS '監査履歴（orders 用）';


--
-- Name: COLUMN orders_history.op; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.orders_history.op IS '操作種別: I/U/D';


--
-- Name: COLUMN orders_history.changed_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.orders_history.changed_at IS '変更日時（トリガ時刻）';


--
-- Name: COLUMN orders_history.changed_by; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.orders_history.changed_by IS '変更ユーザー（DBユーザー）';


--
-- Name: COLUMN orders_history.row_data; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.orders_history.row_data IS '変更後(または削除時の旧)レコードJSON';


--
-- Name: orders_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.orders_history_id_seq
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
    source_unit text NOT NULL,
    source_value double precision NOT NULL,
    internal_unit_value double precision NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    product_id integer
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
    delivery_place_id integer,
    ji_ku_text character varying,
    kumitsuke_ku_text character varying,
    delivery_place_name character varying,
    shipping_warehouse_name character varying,
    id integer NOT NULL,
    supplier_id integer
);


ALTER TABLE public.products OWNER TO admin;

--
-- Name: products_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.products_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.products_history OWNER TO admin;

--
-- Name: TABLE products_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.products_history IS '監査履歴（products 用）';


--
-- Name: COLUMN products_history.op; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.products_history.op IS '操作種別: I/U/D';


--
-- Name: COLUMN products_history.changed_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.products_history.changed_at IS '変更日時（トリガ時刻）';


--
-- Name: COLUMN products_history.changed_by; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.products_history.changed_by IS '変更ユーザー（DBユーザー）';


--
-- Name: COLUMN products_history.row_data; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.products_history.row_data IS '変更後(または削除時の旧)レコードJSON';


--
-- Name: products_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.products_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.products_history_id_seq OWNER TO admin;

--
-- Name: products_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.products_history_id_seq OWNED BY public.products_history.id;


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.products_id_seq OWNER TO admin;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: purchase_requests; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.purchase_requests OWNER TO admin;

--
-- Name: purchase_requests_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.purchase_requests_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.purchase_requests_history OWNER TO admin;

--
-- Name: TABLE purchase_requests_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.purchase_requests_history IS 'purchase_requests の変更履歴（監査ログ）';


--
-- Name: purchase_requests_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.purchase_requests_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.purchase_requests_history_id_seq OWNER TO admin;

--
-- Name: purchase_requests_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.purchase_requests_history_id_seq OWNED BY public.purchase_requests_history.id;


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
    lot_id integer NOT NULL,
    quantity double precision NOT NULL,
    unit text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    product_id integer
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
-- Name: sap_sync_logs_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.sap_sync_logs_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.sap_sync_logs_history OWNER TO admin;

--
-- Name: TABLE sap_sync_logs_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.sap_sync_logs_history IS 'sap_sync_logs の変更履歴（監査ログ）';


--
-- Name: sap_sync_logs_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.sap_sync_logs_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sap_sync_logs_history_id_seq OWNER TO admin;

--
-- Name: sap_sync_logs_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.sap_sync_logs_history_id_seq OWNED BY public.sap_sync_logs_history.id;


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
-- Name: seed_snapshots; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.seed_snapshots (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    params_json jsonb NOT NULL,
    profile_json jsonb,
    csv_dir text,
    summary_json jsonb
);


ALTER TABLE public.seed_snapshots OWNER TO admin;

--
-- Name: COLUMN seed_snapshots.name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.seed_snapshots.name IS 'スナップショット名';


--
-- Name: COLUMN seed_snapshots.created_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.seed_snapshots.created_at IS '作成日時';


--
-- Name: COLUMN seed_snapshots.params_json; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.seed_snapshots.params_json IS '展開後の最終パラメータ（profile解決後）';


--
-- Name: COLUMN seed_snapshots.profile_json; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.seed_snapshots.profile_json IS '使用したプロファイル設定';


--
-- Name: COLUMN seed_snapshots.csv_dir; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.seed_snapshots.csv_dir IS 'CSVエクスポートディレクトリ（オプション）';


--
-- Name: COLUMN seed_snapshots.summary_json; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.seed_snapshots.summary_json IS '生成結果のサマリ（件数、検証結果など）';


--
-- Name: seed_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.seed_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.seed_snapshots_id_seq OWNER TO admin;

--
-- Name: seed_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.seed_snapshots_id_seq OWNED BY public.seed_snapshots.id;


--
-- Name: shipping; Type: TABLE; Schema: public; Owner: admin
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
-- Name: stock_movements_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.stock_movements_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.stock_movements_history OWNER TO admin;

--
-- Name: TABLE stock_movements_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.stock_movements_history IS 'stock_movements の変更履歴（監査ログ）';


--
-- Name: stock_movements_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.stock_movements_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.stock_movements_history_id_seq OWNER TO admin;

--
-- Name: stock_movements_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.stock_movements_history_id_seq OWNED BY public.stock_movements_history.id;


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
    revision integer DEFAULT 1 NOT NULL,
    id integer NOT NULL
);


ALTER TABLE public.suppliers OWNER TO admin;

--
-- Name: suppliers_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.suppliers_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.suppliers_history OWNER TO admin;

--
-- Name: TABLE suppliers_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.suppliers_history IS 'suppliers の変更履歴（監査ログ）';


--
-- Name: suppliers_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.suppliers_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.suppliers_history_id_seq OWNER TO admin;

--
-- Name: suppliers_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.suppliers_history_id_seq OWNED BY public.suppliers_history.id;


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.suppliers_id_seq OWNER TO admin;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: unit_conversions; Type: TABLE; Schema: public; Owner: admin
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


ALTER TABLE public.unit_conversions OWNER TO admin;

--
-- Name: unit_conversions_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.unit_conversions_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.unit_conversions_history OWNER TO admin;

--
-- Name: TABLE unit_conversions_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.unit_conversions_history IS 'unit_conversions の変更履歴（監査ログ）';


--
-- Name: unit_conversions_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.unit_conversions_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.unit_conversions_history_id_seq OWNER TO admin;

--
-- Name: unit_conversions_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.unit_conversions_history_id_seq OWNED BY public.unit_conversions_history.id;


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
-- Name: v_customer_daily_products; Type: VIEW; Schema: public; Owner: admin
--

CREATE VIEW public.v_customer_daily_products AS
 SELECT DISTINCT f.customer_id,
    f.product_id
   FROM public.forecasts f
  WHERE ((f.is_active = true) AND ((f.granularity)::text = 'daily'::text));


ALTER TABLE public.v_customer_daily_products OWNER TO admin;

--
-- Name: v_lot_available_qty; Type: VIEW; Schema: public; Owner: admin
--

CREATE VIEW public.v_lot_available_qty AS
 WITH mv AS (
         SELECT sm.lot_id,
            sum(sm.quantity_delta) AS current_qty
           FROM public.stock_movements sm
          WHERE (sm.deleted_at IS NULL)
          GROUP BY sm.lot_id
        )
 SELECT l.id AS lot_id,
    l.product_id,
    l.warehouse_id,
    COALESCE(mv.current_qty, (0)::numeric) AS available_qty,
    l.receipt_date,
    l.expiry_date,
    l.lot_status,
    l.is_locked
   FROM (public.lots l
     LEFT JOIN mv ON ((mv.lot_id = l.id)))
  WHERE (((l.lot_status)::text = 'available'::text) AND (l.is_locked = false) AND ((l.expiry_date IS NULL) OR (l.expiry_date >= CURRENT_DATE)));


ALTER TABLE public.v_lot_available_qty OWNER TO admin;

--
-- Name: v_order_line_context; Type: VIEW; Schema: public; Owner: admin
--

CREATE VIEW public.v_order_line_context AS
 SELECT ol.id AS order_line_id,
    o.id AS order_id,
    o.customer_id,
    ol.product_id,
    ol.warehouse_id,
    ol.quantity
   FROM (public.order_lines ol
     JOIN public.orders o ON ((o.id = ol.order_id)));


ALTER TABLE public.v_order_line_context OWNER TO admin;

--
-- Name: v_candidate_lots_by_order_line; Type: VIEW; Schema: public; Owner: admin
--

CREATE VIEW public.v_candidate_lots_by_order_line AS
 SELECT c.order_line_id,
    l.lot_id,
    l.product_id,
    l.warehouse_id,
    l.available_qty,
    l.receipt_date,
    l.expiry_date
   FROM ((public.v_order_line_context c
     JOIN public.v_customer_daily_products f ON (((f.customer_id = c.customer_id) AND (f.product_id = c.product_id))))
     JOIN public.v_lot_available_qty l ON (((l.product_id = c.product_id) AND (l.available_qty > (0)::numeric))))
  ORDER BY c.order_line_id, l.expiry_date, l.receipt_date, l.lot_id;


ALTER TABLE public.v_candidate_lots_by_order_line OWNER TO admin;

--
-- Name: v_customer_code_to_id; Type: VIEW; Schema: public; Owner: admin
--

CREATE VIEW public.v_customer_code_to_id AS
 SELECT c.customer_code,
    c.id AS customer_id,
    c.customer_name
   FROM public.customers c;


ALTER TABLE public.v_customer_code_to_id OWNER TO admin;

--
-- Name: v_delivery_place_code_to_id; Type: VIEW; Schema: public; Owner: admin
--

CREATE VIEW public.v_delivery_place_code_to_id AS
 SELECT d.delivery_place_code,
    d.id AS delivery_place_id,
    d.delivery_place_name
   FROM public.delivery_places d;


ALTER TABLE public.v_delivery_place_code_to_id OWNER TO admin;

--
-- Name: v_forecast_order_pairs; Type: VIEW; Schema: public; Owner: admin
--

CREATE VIEW public.v_forecast_order_pairs AS
 SELECT f.id AS forecast_id,
    f.customer_id,
    f.product_id,
    o.id AS order_id,
    o.delivery_place_id
   FROM ((public.forecasts f
     JOIN public.orders o ON ((o.customer_id = f.customer_id)))
     JOIN public.order_lines l ON (((l.order_id = o.id) AND (l.product_id = f.product_id))));


ALTER TABLE public.v_forecast_order_pairs OWNER TO admin;

--
-- Name: v_product_code_to_id; Type: VIEW; Schema: public; Owner: admin
--

CREATE VIEW public.v_product_code_to_id AS
 SELECT p.product_code,
    p.id AS product_id,
    p.product_name
   FROM public.products p;


ALTER TABLE public.v_product_code_to_id OWNER TO admin;

--
-- Name: warehouse; Type: TABLE; Schema: public; Owner: admin
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
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying(50),
    updated_by character varying(50),
    deleted_at timestamp without time zone,
    revision integer DEFAULT 1 NOT NULL,
    id integer NOT NULL
);


ALTER TABLE public.warehouses OWNER TO admin;

--
-- Name: warehouses_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.warehouses_history (
    id bigint NOT NULL,
    op character(1) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by text,
    row_data jsonb NOT NULL
);


ALTER TABLE public.warehouses_history OWNER TO admin;

--
-- Name: TABLE warehouses_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.warehouses_history IS '監査履歴（warehouses 用）';


--
-- Name: COLUMN warehouses_history.op; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.warehouses_history.op IS '操作種別: I/U/D';


--
-- Name: COLUMN warehouses_history.changed_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.warehouses_history.changed_at IS '変更日時（トリガ時刻）';


--
-- Name: COLUMN warehouses_history.changed_by; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.warehouses_history.changed_by IS '変更ユーザー（DBユーザー）';


--
-- Name: COLUMN warehouses_history.row_data; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.warehouses_history.row_data IS '変更後(または削除時の旧)レコードJSON';


--
-- Name: warehouses_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.warehouses_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.warehouses_history_id_seq OWNER TO admin;

--
-- Name: warehouses_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.warehouses_history_id_seq OWNED BY public.warehouses_history.id;


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
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: customers_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.customers_history ALTER COLUMN id SET DEFAULT nextval('public.customers_history_id_seq'::regclass);


--
-- Name: delivery_places id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.delivery_places ALTER COLUMN id SET DEFAULT nextval('public.delivery_places_id_seq'::regclass);


--
-- Name: delivery_places_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.delivery_places_history ALTER COLUMN id SET DEFAULT nextval('public.delivery_places_history_id_seq'::regclass);


--
-- Name: expiry_rules id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expiry_rules ALTER COLUMN id SET DEFAULT nextval('public.expiry_rules_id_seq'::regclass);


--
-- Name: expiry_rules_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expiry_rules_history ALTER COLUMN id SET DEFAULT nextval('public.expiry_rules_history_id_seq'::regclass);


--
-- Name: forecasts id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecasts ALTER COLUMN id SET DEFAULT nextval('public.forecast_id_seq'::regclass);


--
-- Name: forecasts_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecasts_history ALTER COLUMN id SET DEFAULT nextval('public.forecasts_history_id_seq'::regclass);


--
-- Name: inbound_submissions id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inbound_submissions ALTER COLUMN id SET DEFAULT nextval('public.ocr_submissions_id_seq'::regclass);


--
-- Name: inbound_submissions_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inbound_submissions_history ALTER COLUMN id SET DEFAULT nextval('public.inbound_submissions_history_id_seq'::regclass);


--
-- Name: lot_current_stock_history_backup id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lot_current_stock_history_backup ALTER COLUMN id SET DEFAULT nextval('public.lot_current_stock_history_id_seq'::regclass);


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
-- Name: order_line_warehouse_allocation_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_line_warehouse_allocation_history ALTER COLUMN id SET DEFAULT nextval('public.order_line_warehouse_allocation_history_id_seq'::regclass);


--
-- Name: order_lines id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines ALTER COLUMN id SET DEFAULT nextval('public.order_lines_id_seq'::regclass);


--
-- Name: order_lines_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines_history ALTER COLUMN id SET DEFAULT nextval('public.order_lines_history_id_seq'::regclass);


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
-- Name: products id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: products_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products_history ALTER COLUMN id SET DEFAULT nextval('public.products_history_id_seq'::regclass);


--
-- Name: purchase_requests id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchase_requests ALTER COLUMN id SET DEFAULT nextval('public.purchase_requests_id_seq'::regclass);


--
-- Name: purchase_requests_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchase_requests_history ALTER COLUMN id SET DEFAULT nextval('public.purchase_requests_history_id_seq'::regclass);


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
-- Name: sap_sync_logs_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.sap_sync_logs_history ALTER COLUMN id SET DEFAULT nextval('public.sap_sync_logs_history_id_seq'::regclass);


--
-- Name: seed_snapshots id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.seed_snapshots ALTER COLUMN id SET DEFAULT nextval('public.seed_snapshots_id_seq'::regclass);


--
-- Name: shipping id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.shipping ALTER COLUMN id SET DEFAULT nextval('public.shipping_id_seq'::regclass);


--
-- Name: stock_movements id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_movements ALTER COLUMN id SET DEFAULT nextval('public.stock_movements_id_seq'::regclass);


--
-- Name: stock_movements_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_movements_history ALTER COLUMN id SET DEFAULT nextval('public.stock_movements_history_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: suppliers_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.suppliers_history ALTER COLUMN id SET DEFAULT nextval('public.suppliers_history_id_seq'::regclass);


--
-- Name: unit_conversions id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.unit_conversions ALTER COLUMN id SET DEFAULT nextval('public.unit_conversions_id_seq'::regclass);


--
-- Name: unit_conversions_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.unit_conversions_history ALTER COLUMN id SET DEFAULT nextval('public.unit_conversions_history_id_seq'::regclass);


--
-- Name: warehouse id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warehouse ALTER COLUMN id SET DEFAULT nextval('public.warehouse_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Name: warehouses_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warehouses_history ALTER COLUMN id SET DEFAULT nextval('public.warehouses_history_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.alembic_version (version_num) FROM stdin;
\.


--
-- Data for Name: allocations; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.allocations (id, order_line_id, lot_id, allocated_qty, created_at, updated_at, created_by, updated_by, deleted_at, revision, destination_id, status) FROM stdin;
1	9	1	20	2025-11-14 05:44:39.678313	2025-11-14 14:44:39.457475	\N	\N	\N	1	1	reserved
2	8	8	10	2025-11-14 05:44:39.679112	2025-11-14 14:44:39.457475	\N	\N	\N	1	2	reserved
3	2	4	37	2025-11-14 05:44:39.679451	2025-11-14 14:44:39.457475	\N	\N	\N	1	2	reserved
\.


--
-- Data for Name: allocations_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.allocations_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-14 14:44:39.457475+09	admin	{"id": 1, "lot_id": 1, "status": "reserved", "revision": 1, "created_at": "2025-11-14T05:44:39.678313", "created_by": null, "deleted_at": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "allocated_qty": 20, "order_line_id": 9, "destination_id": 1}
2	I	2025-11-14 14:44:39.457475+09	admin	{"id": 2, "lot_id": 8, "status": "reserved", "revision": 1, "created_at": "2025-11-14T05:44:39.679112", "created_by": null, "deleted_at": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "allocated_qty": 10, "order_line_id": 8, "destination_id": 2}
3	I	2025-11-14 14:44:39.457475+09	admin	{"id": 3, "lot_id": 4, "status": "reserved", "revision": 1, "created_at": "2025-11-14T05:44:39.679451", "created_by": null, "deleted_at": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "allocated_qty": 37, "order_line_id": 2, "destination_id": 2}
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.customers (customer_code, customer_name, address, created_at, updated_at, created_by, updated_by, deleted_at, revision, id) FROM stdin;
C2824	株式会社中島建設	\N	2025-11-14 05:44:39.460242	2025-11-14 14:44:39.457475	\N	\N	\N	1	1
C1409	株式会社石川運輸	\N	2025-11-14 05:44:39.460305	2025-11-14 14:44:39.457475	\N	\N	\N	1	2
C5506	合同会社吉田水産	\N	2025-11-14 05:44:39.460344	2025-11-14 14:44:39.457475	\N	\N	\N	1	3
\.


--
-- Data for Name: customers_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.customers_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-14 14:44:39.457475+09	admin	{"id": 1, "address": null, "revision": 1, "created_at": "2025-11-14T05:44:39.460242", "created_by": null, "deleted_at": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "customer_code": "C2824", "customer_name": "株式会社中島建設"}
2	I	2025-11-14 14:44:39.457475+09	admin	{"id": 2, "address": null, "revision": 1, "created_at": "2025-11-14T05:44:39.460305", "created_by": null, "deleted_at": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "customer_code": "C1409", "customer_name": "株式会社石川運輸"}
3	I	2025-11-14 14:44:39.457475+09	admin	{"id": 3, "address": null, "revision": 1, "created_at": "2025-11-14T05:44:39.460344", "created_by": null, "deleted_at": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "customer_code": "C5506", "customer_name": "合同会社吉田水産"}
\.


--
-- Data for Name: delivery_places; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.delivery_places (id, delivery_place_code, delivery_place_name, address, postal_code, is_active, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
1	D242	西多摩郡檜原村配送センター	大阪府山武郡横芝光町秋葉原38丁目9番1号 コーポ箪笥町423	980-5514	t	2025-11-14 05:44:39.493641	2025-11-14 14:44:39.457475	\N	\N	\N	1
2	D854	南房総市配送センター	滋賀県富里市明石町23丁目20番9号	826-0711	t	2025-11-14 05:44:39.493721	2025-11-14 14:44:39.457475	\N	\N	\N	1
\.


--
-- Data for Name: delivery_places_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.delivery_places_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-14 14:44:39.457475+09	admin	{"id": 1, "address": "大阪府山武郡横芝光町秋葉原38丁目9番1号 コーポ箪笥町423", "revision": 1, "is_active": true, "created_at": "2025-11-14T05:44:39.493641", "created_by": null, "deleted_at": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "postal_code": "980-5514", "delivery_place_code": "D242", "delivery_place_name": "西多摩郡檜原村配送センター"}
2	I	2025-11-14 14:44:39.457475+09	admin	{"id": 2, "address": "滋賀県富里市明石町23丁目20番9号", "revision": 1, "is_active": true, "created_at": "2025-11-14T05:44:39.493721", "created_by": null, "deleted_at": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "postal_code": "826-0711", "delivery_place_code": "D854", "delivery_place_name": "南房総市配送センター"}
\.


--
-- Data for Name: expiry_rules; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.expiry_rules (id, rule_type, days, fixed_date, is_active, priority, created_at, updated_at, created_by, updated_by, deleted_at, revision, product_id, supplier_id) FROM stdin;
\.


--
-- Data for Name: expiry_rules_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.expiry_rules_history (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: forecasts; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.forecasts (id, forecast_id, granularity, date_day, date_dekad_start, year_month, qty_forecast, version_no, version_issued_at, source_system, is_active, created_at, updated_at, created_by, updated_by, deleted_at, revision, product_id, customer_id) FROM stdin;
\.


--
-- Data for Name: forecasts_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.forecasts_history (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: inbound_submissions; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.inbound_submissions (id, submission_id, source_uri, source, operator, submission_date, status, total_records, processed_records, failed_records, skipped_records, error_details, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: inbound_submissions_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.inbound_submissions_history (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: lot_current_stock_backup; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.lot_current_stock_backup (lot_id, current_quantity, last_updated, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: lot_current_stock_history_backup; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.lot_current_stock_history_backup (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: lots; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.lots (id, lot_number, receipt_date, mfg_date, expiry_date, kanban_class, sales_unit, inventory_unit, received_by, source_doc, qc_certificate_status, qc_certificate_file, created_at, updated_at, created_by, updated_by, deleted_at, revision, warehouse_code_old, lot_unit, is_locked, lock_reason, inspection_date, inspection_result, warehouse_id, product_id, supplier_id, supplier_code, warehouse_code, lot_status) FROM stdin;
1	LOT-41316475	2025-10-27	\N	2026-03-25	\N	\N	\N	\N	\N	\N	\N	2025-11-14 05:44:39.54018	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	2	5	1	\N	\N	available
2	LOT-25534192	2025-11-06	\N	2026-05-19	\N	\N	\N	\N	\N	\N	\N	2025-11-14 05:44:39.552248	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	1	1	2	\N	\N	available
3	LOT-83276483	2025-11-02	\N	2026-09-23	\N	\N	\N	\N	\N	\N	\N	2025-11-14 05:44:39.566217	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	2	2	1	\N	\N	available
4	LOT-50305641	2025-10-22	\N	2026-10-18	\N	\N	\N	\N	\N	\N	\N	2025-11-14 05:44:39.572068	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	2	3	2	\N	\N	available
5	LOT-39537672	2025-10-28	\N	2026-09-30	\N	\N	\N	\N	\N	\N	\N	2025-11-14 05:44:39.577364	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	1	5	2	\N	\N	available
6	LOT-42388496	2025-11-12	\N	2025-11-14	\N	\N	\N	\N	\N	\N	\N	2025-11-14 05:44:39.583292	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	2	5	1	\N	\N	available
7	LOT-96532871	2025-10-18	\N	2026-07-13	\N	\N	\N	\N	\N	\N	\N	2025-11-14 05:44:39.589893	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	2	2	1	\N	\N	available
8	LOT-01226916	2025-10-19	\N	2025-12-19	\N	\N	\N	\N	\N	\N	\N	2025-11-14 05:44:39.595802	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	2	4	2	\N	\N	available
9	LOT-69784801	2025-10-24	\N	2026-07-25	\N	\N	\N	\N	\N	\N	\N	2025-11-14 05:44:39.601304	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	2	2	2	\N	\N	available
10	LOT-84514627	2025-10-31	\N	2026-08-18	\N	\N	\N	\N	\N	\N	\N	2025-11-14 05:44:39.607212	\N	\N	\N	\N	1	\N	\N	f	\N	\N	\N	1	1	1	\N	\N	available
\.


--
-- Data for Name: lots_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.lots_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-14 14:44:39.457475+09	admin	{"id": 1, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-14T05:44:39.54018", "created_by": null, "deleted_at": null, "lot_number": "LOT-41316475", "lot_status": "available", "product_id": 5, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-03-25", "lock_reason": null, "received_by": null, "supplier_id": 1, "kanban_class": null, "receipt_date": "2025-10-27", "warehouse_id": 2, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
2	I	2025-11-14 14:44:39.457475+09	admin	{"id": 2, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-14T05:44:39.552248", "created_by": null, "deleted_at": null, "lot_number": "LOT-25534192", "lot_status": "available", "product_id": 1, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-05-19", "lock_reason": null, "received_by": null, "supplier_id": 2, "kanban_class": null, "receipt_date": "2025-11-06", "warehouse_id": 1, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
3	I	2025-11-14 14:44:39.457475+09	admin	{"id": 3, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-14T05:44:39.566217", "created_by": null, "deleted_at": null, "lot_number": "LOT-83276483", "lot_status": "available", "product_id": 2, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-09-23", "lock_reason": null, "received_by": null, "supplier_id": 1, "kanban_class": null, "receipt_date": "2025-11-02", "warehouse_id": 2, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
4	I	2025-11-14 14:44:39.457475+09	admin	{"id": 4, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-14T05:44:39.572068", "created_by": null, "deleted_at": null, "lot_number": "LOT-50305641", "lot_status": "available", "product_id": 3, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-10-18", "lock_reason": null, "received_by": null, "supplier_id": 2, "kanban_class": null, "receipt_date": "2025-10-22", "warehouse_id": 2, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
5	I	2025-11-14 14:44:39.457475+09	admin	{"id": 5, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-14T05:44:39.577364", "created_by": null, "deleted_at": null, "lot_number": "LOT-39537672", "lot_status": "available", "product_id": 5, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-09-30", "lock_reason": null, "received_by": null, "supplier_id": 2, "kanban_class": null, "receipt_date": "2025-10-28", "warehouse_id": 1, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
6	I	2025-11-14 14:44:39.457475+09	admin	{"id": 6, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-14T05:44:39.583292", "created_by": null, "deleted_at": null, "lot_number": "LOT-42388496", "lot_status": "available", "product_id": 5, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2025-11-14", "lock_reason": null, "received_by": null, "supplier_id": 1, "kanban_class": null, "receipt_date": "2025-11-12", "warehouse_id": 2, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
7	I	2025-11-14 14:44:39.457475+09	admin	{"id": 7, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-14T05:44:39.589893", "created_by": null, "deleted_at": null, "lot_number": "LOT-96532871", "lot_status": "available", "product_id": 2, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-07-13", "lock_reason": null, "received_by": null, "supplier_id": 1, "kanban_class": null, "receipt_date": "2025-10-18", "warehouse_id": 2, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
8	I	2025-11-14 14:44:39.457475+09	admin	{"id": 8, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-14T05:44:39.595802", "created_by": null, "deleted_at": null, "lot_number": "LOT-01226916", "lot_status": "available", "product_id": 4, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2025-12-19", "lock_reason": null, "received_by": null, "supplier_id": 2, "kanban_class": null, "receipt_date": "2025-10-19", "warehouse_id": 2, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
9	I	2025-11-14 14:44:39.457475+09	admin	{"id": 9, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-14T05:44:39.601304", "created_by": null, "deleted_at": null, "lot_number": "LOT-69784801", "lot_status": "available", "product_id": 2, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-07-25", "lock_reason": null, "received_by": null, "supplier_id": 2, "kanban_class": null, "receipt_date": "2025-10-24", "warehouse_id": 2, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
10	I	2025-11-14 14:44:39.457475+09	admin	{"id": 10, "lot_unit": null, "mfg_date": null, "revision": 1, "is_locked": false, "created_at": "2025-11-14T05:44:39.607212", "created_by": null, "deleted_at": null, "lot_number": "LOT-84514627", "lot_status": "available", "product_id": 1, "sales_unit": null, "source_doc": null, "updated_at": null, "updated_by": null, "expiry_date": "2026-08-18", "lock_reason": null, "received_by": null, "supplier_id": 1, "kanban_class": null, "receipt_date": "2025-10-31", "warehouse_id": 1, "supplier_code": null, "inventory_unit": null, "warehouse_code": null, "inspection_date": null, "inspection_result": null, "warehouse_code_old": null, "qc_certificate_file": null, "qc_certificate_status": null}
\.


--
-- Data for Name: next_div_map; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.next_div_map (id, customer_code, ship_to_code, next_div, created_at, updated_at, created_by, updated_by, deleted_at, revision, product_id) FROM stdin;
\.


--
-- Data for Name: order_line_warehouse_allocation; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.order_line_warehouse_allocation (id, order_line_id, warehouse_id, quantity, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: order_line_warehouse_allocation_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.order_line_warehouse_allocation_history (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: order_lines; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.order_lines (id, order_id, line_no, quantity, unit, created_at, updated_at, created_by, updated_by, deleted_at, revision, product_id, warehouse_id) FROM stdin;
1	1	1	15.0000	\N	2025-11-14 05:44:39.627155	2025-11-14 14:44:39.457475	\N	\N	\N	1	5	\N
2	1	2	50.0000	\N	2025-11-14 05:44:39.627395	2025-11-14 14:44:39.457475	\N	\N	\N	1	3	\N
3	1	3	15.0000	\N	2025-11-14 05:44:39.627488	2025-11-14 14:44:39.457475	\N	\N	\N	1	1	\N
4	2	1	18.0000	\N	2025-11-14 05:44:39.645317	2025-11-14 14:44:39.457475	\N	\N	\N	1	4	\N
5	2	2	14.0000	\N	2025-11-14 05:44:39.645415	2025-11-14 14:44:39.457475	\N	\N	\N	1	1	\N
6	3	1	14.0000	\N	2025-11-14 05:44:39.652049	2025-11-14 14:44:39.457475	\N	\N	\N	1	3	\N
7	3	2	26.0000	\N	2025-11-14 05:44:39.652203	2025-11-14 14:44:39.457475	\N	\N	\N	1	4	\N
8	3	3	10.0000	\N	2025-11-14 05:44:39.652283	2025-11-14 14:44:39.457475	\N	\N	\N	1	4	\N
9	4	1	35.0000	\N	2025-11-14 05:44:39.659989	2025-11-14 14:44:39.457475	\N	\N	\N	1	5	\N
10	5	1	38.0000	\N	2025-11-14 05:44:39.666318	2025-11-14 14:44:39.457475	\N	\N	\N	1	4	\N
11	5	2	24.0000	\N	2025-11-14 05:44:39.666421	2025-11-14 14:44:39.457475	\N	\N	\N	1	4	\N
12	5	3	9.0000	\N	2025-11-14 05:44:39.666479	2025-11-14 14:44:39.457475	\N	\N	\N	1	2	\N
\.


--
-- Data for Name: order_lines_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.order_lines_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-14 14:44:39.457475+09	admin	{"id": 1, "unit": null, "line_no": 1, "order_id": 1, "quantity": 15.0000, "revision": 1, "created_at": "2025-11-14T05:44:39.627155", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "warehouse_id": null}
2	I	2025-11-14 14:44:39.457475+09	admin	{"id": 2, "unit": null, "line_no": 2, "order_id": 1, "quantity": 50.0000, "revision": 1, "created_at": "2025-11-14T05:44:39.627395", "created_by": null, "deleted_at": null, "product_id": 3, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "warehouse_id": null}
3	I	2025-11-14 14:44:39.457475+09	admin	{"id": 3, "unit": null, "line_no": 3, "order_id": 1, "quantity": 15.0000, "revision": 1, "created_at": "2025-11-14T05:44:39.627488", "created_by": null, "deleted_at": null, "product_id": 1, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "warehouse_id": null}
4	I	2025-11-14 14:44:39.457475+09	admin	{"id": 4, "unit": null, "line_no": 1, "order_id": 2, "quantity": 18.0000, "revision": 1, "created_at": "2025-11-14T05:44:39.645317", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "warehouse_id": null}
5	I	2025-11-14 14:44:39.457475+09	admin	{"id": 5, "unit": null, "line_no": 2, "order_id": 2, "quantity": 14.0000, "revision": 1, "created_at": "2025-11-14T05:44:39.645415", "created_by": null, "deleted_at": null, "product_id": 1, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "warehouse_id": null}
6	I	2025-11-14 14:44:39.457475+09	admin	{"id": 6, "unit": null, "line_no": 1, "order_id": 3, "quantity": 14.0000, "revision": 1, "created_at": "2025-11-14T05:44:39.652049", "created_by": null, "deleted_at": null, "product_id": 3, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "warehouse_id": null}
7	I	2025-11-14 14:44:39.457475+09	admin	{"id": 7, "unit": null, "line_no": 2, "order_id": 3, "quantity": 26.0000, "revision": 1, "created_at": "2025-11-14T05:44:39.652203", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "warehouse_id": null}
8	I	2025-11-14 14:44:39.457475+09	admin	{"id": 8, "unit": null, "line_no": 3, "order_id": 3, "quantity": 10.0000, "revision": 1, "created_at": "2025-11-14T05:44:39.652283", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "warehouse_id": null}
9	I	2025-11-14 14:44:39.457475+09	admin	{"id": 9, "unit": null, "line_no": 1, "order_id": 4, "quantity": 35.0000, "revision": 1, "created_at": "2025-11-14T05:44:39.659989", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "warehouse_id": null}
10	I	2025-11-14 14:44:39.457475+09	admin	{"id": 10, "unit": null, "line_no": 1, "order_id": 5, "quantity": 38.0000, "revision": 1, "created_at": "2025-11-14T05:44:39.666318", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "warehouse_id": null}
11	I	2025-11-14 14:44:39.457475+09	admin	{"id": 11, "unit": null, "line_no": 2, "order_id": 5, "quantity": 24.0000, "revision": 1, "created_at": "2025-11-14T05:44:39.666421", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "warehouse_id": null}
12	I	2025-11-14 14:44:39.457475+09	admin	{"id": 12, "unit": null, "line_no": 3, "order_id": 5, "quantity": 9.0000, "revision": 1, "created_at": "2025-11-14T05:44:39.666479", "created_by": null, "deleted_at": null, "product_id": 2, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "warehouse_id": null}
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.orders (id, order_no, order_date, status, sap_order_id, sap_status, sap_sent_at, sap_error_msg, created_at, updated_at, created_by, updated_by, deleted_at, revision, customer_order_no, delivery_mode, customer_id, customer_code, delivery_place_id) FROM stdin;
1	SO-04828148	2025-10-31	draft	\N	\N	\N	\N	2025-11-14 05:44:39.616132	\N	\N	\N	\N	1	\N	\N	2	\N	\N
2	SO-93252880	2025-11-02	draft	\N	\N	\N	\N	2025-11-14 05:44:39.642789	\N	\N	\N	\N	1	\N	\N	1	\N	\N
3	SO-95701543	2025-10-31	draft	\N	\N	\N	\N	2025-11-14 05:44:39.649498	\N	\N	\N	\N	1	\N	\N	3	\N	\N
4	SO-03911718	2025-11-12	draft	\N	\N	\N	\N	2025-11-14 05:44:39.657526	\N	\N	\N	\N	1	\N	\N	2	\N	\N
5	SO-22782489	2025-11-03	draft	\N	\N	\N	\N	2025-11-14 05:44:39.663695	\N	\N	\N	\N	1	\N	\N	2	\N	\N
\.


--
-- Data for Name: orders_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.orders_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-14 14:44:39.457475+09	admin	{"id": 1, "status": "draft", "order_no": "SO-04828148", "revision": 1, "created_at": "2025-11-14T05:44:39.616132", "created_by": null, "deleted_at": null, "order_date": "2025-10-31", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": 2, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "delivery_place_id": null, "customer_order_no_last6": null}
2	I	2025-11-14 14:44:39.457475+09	admin	{"id": 2, "status": "draft", "order_no": "SO-93252880", "revision": 1, "created_at": "2025-11-14T05:44:39.642789", "created_by": null, "deleted_at": null, "order_date": "2025-11-02", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": 1, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "delivery_place_id": null, "customer_order_no_last6": null}
3	I	2025-11-14 14:44:39.457475+09	admin	{"id": 3, "status": "draft", "order_no": "SO-95701543", "revision": 1, "created_at": "2025-11-14T05:44:39.649498", "created_by": null, "deleted_at": null, "order_date": "2025-10-31", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": 3, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "delivery_place_id": null, "customer_order_no_last6": null}
4	I	2025-11-14 14:44:39.457475+09	admin	{"id": 4, "status": "draft", "order_no": "SO-03911718", "revision": 1, "created_at": "2025-11-14T05:44:39.657526", "created_by": null, "deleted_at": null, "order_date": "2025-11-12", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": 2, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "delivery_place_id": null, "customer_order_no_last6": null}
5	I	2025-11-14 14:44:39.457475+09	admin	{"id": 5, "status": "draft", "order_no": "SO-22782489", "revision": 1, "created_at": "2025-11-14T05:44:39.663695", "created_by": null, "deleted_at": null, "order_date": "2025-11-03", "sap_status": null, "updated_at": null, "updated_by": null, "customer_id": 2, "sap_sent_at": null, "sap_order_id": null, "customer_code": null, "delivery_mode": null, "sap_error_msg": null, "customer_order_no": null, "delivery_place_id": null, "customer_order_no_last6": null}
\.


--
-- Data for Name: product_uom_conversions; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.product_uom_conversions (id, source_unit, source_value, internal_unit_value, created_at, updated_at, created_by, updated_by, deleted_at, revision, product_id) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.products (product_code, product_name, customer_part_no, maker_item_code, internal_unit, assemble_div, next_div, shelf_life_days, requires_lot_number, created_at, updated_at, created_by, updated_by, deleted_at, revision, base_unit, packaging_qty, packaging_unit, supplier_item_code, delivery_place_id, ji_ku_text, kumitsuke_ku_text, delivery_place_name, shipping_warehouse_name, id, supplier_id) FROM stdin;
P23434	Drive Ubiquitous Users	\N	\N	PCS	\N	\N	\N	\N	2025-11-14 05:44:39.50617	2025-11-14 14:44:39.457475	\N	\N	\N	1	EA	1.00	EA	\N	1	\N	\N	\N	\N	1	\N
P87397	Embrace Enterprise Infrastructures	\N	\N	PCS	\N	\N	\N	\N	2025-11-14 05:44:39.506206	2025-11-14 14:44:39.457475	\N	\N	\N	1	EA	1.00	EA	\N	2	\N	\N	\N	\N	2	\N
P14165	Engage Distributed Functionalities	\N	\N	PCS	\N	\N	\N	\N	2025-11-14 05:44:39.50623	2025-11-14 14:44:39.457475	\N	\N	\N	1	EA	1.00	EA	\N	1	\N	\N	\N	\N	3	\N
P22280	Re-Intermediate Bricks-And-Clicks Networks	\N	\N	PCS	\N	\N	\N	\N	2025-11-14 05:44:39.506263	2025-11-14 14:44:39.457475	\N	\N	\N	1	EA	1.00	EA	\N	1	\N	\N	\N	\N	4	\N
P40495	Aggregate Innovative Paradigms	\N	\N	PCS	\N	\N	\N	\N	2025-11-14 05:44:39.506309	2025-11-14 14:44:39.457475	\N	\N	\N	1	EA	1.00	EA	\N	1	\N	\N	\N	\N	5	\N
\.


--
-- Data for Name: products_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.products_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-14 14:44:39.457475+09	admin	{"id": 1, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-14T05:44:39.50617", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P23434", "product_name": "Drive Ubiquitous Users", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": 1, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
2	I	2025-11-14 14:44:39.457475+09	admin	{"id": 2, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-14T05:44:39.506206", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P87397", "product_name": "Embrace Enterprise Infrastructures", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": 2, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
3	I	2025-11-14 14:44:39.457475+09	admin	{"id": 3, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-14T05:44:39.50623", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P14165", "product_name": "Engage Distributed Functionalities", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": 1, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
4	I	2025-11-14 14:44:39.457475+09	admin	{"id": 4, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-14T05:44:39.506263", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P22280", "product_name": "Re-Intermediate Bricks-And-Clicks Networks", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": 1, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
5	I	2025-11-14 14:44:39.457475+09	admin	{"id": 5, "next_div": null, "revision": 1, "base_unit": "EA", "created_at": "2025-11-14T05:44:39.506309", "created_by": null, "deleted_at": null, "ji_ku_text": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "supplier_id": null, "assemble_div": null, "product_code": "P40495", "product_name": "Aggregate Innovative Paradigms", "internal_unit": "PCS", "packaging_qty": 1.00, "packaging_unit": "EA", "maker_item_code": null, "shelf_life_days": null, "customer_part_no": null, "delivery_place_id": 1, "kumitsuke_ku_text": null, "supplier_item_code": null, "delivery_place_name": null, "requires_lot_number": null, "shipping_warehouse_name": null}
\.


--
-- Data for Name: purchase_requests; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.purchase_requests (id, requested_qty, unit, reason_code, src_order_line_id, requested_date, desired_receipt_date, status, sap_po_id, notes, created_at, updated_at, created_by, updated_by, deleted_at, revision, product_id, supplier_id) FROM stdin;
\.


--
-- Data for Name: purchase_requests_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.purchase_requests_history (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: receipt_headers; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.receipt_headers (id, receipt_no, supplier_code, warehouse_id, receipt_date, created_by, notes, created_at, updated_at, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: receipt_lines; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.receipt_lines (id, header_id, line_no, lot_id, quantity, unit, notes, created_at, updated_at, created_by, updated_by, deleted_at, revision, product_id) FROM stdin;
\.


--
-- Data for Name: sap_sync_logs; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.sap_sync_logs (id, order_id, payload, result, status, executed_at, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: sap_sync_logs_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.sap_sync_logs_history (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: seed_snapshots; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.seed_snapshots (id, name, created_at, params_json, profile_json, csv_dir, summary_json) FROM stdin;
\.


--
-- Data for Name: shipping; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.shipping (id, lot_id, order_line_id, shipped_qty, shipped_date, shipping_address, contact_person, contact_phone, delivery_time_slot, tracking_number, carrier, carrier_service, notes, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.stock_movements (id, lot_id, reason, quantity_delta, occurred_at, created_at, updated_at, created_by, updated_by, deleted_at, revision, warehouse_id, source_table, source_id, batch_id, product_id, related_order_id, related_allocation_id) FROM stdin;
1	1	receipt	76.0000	2025-11-14 05:44:39.551847	2025-11-14 05:44:39.551867	2025-11-14 14:44:39.457475	\N	\N	\N	1	2	\N	\N	\N	5	\N	\N
2	2	receipt	44.0000	2025-11-14 05:44:39.565801	2025-11-14 05:44:39.565815	2025-11-14 14:44:39.457475	\N	\N	\N	1	1	\N	\N	\N	1	\N	\N
3	3	receipt	29.0000	2025-11-14 05:44:39.571782	2025-11-14 05:44:39.571808	2025-11-14 14:44:39.457475	\N	\N	\N	1	2	\N	\N	\N	2	\N	\N
4	4	receipt	122.0000	2025-11-14 05:44:39.577139	2025-11-14 05:44:39.577153	2025-11-14 14:44:39.457475	\N	\N	\N	1	2	\N	\N	\N	3	\N	\N
5	5	receipt	80.0000	2025-11-14 05:44:39.583077	2025-11-14 05:44:39.583087	2025-11-14 14:44:39.457475	\N	\N	\N	1	1	\N	\N	\N	5	\N	\N
6	6	receipt	16.0000	2025-11-14 05:44:39.589687	2025-11-14 05:44:39.589697	2025-11-14 14:44:39.457475	\N	\N	\N	1	2	\N	\N	\N	5	\N	\N
7	7	receipt	30.0000	2025-11-14 05:44:39.595536	2025-11-14 05:44:39.595559	2025-11-14 14:44:39.457475	\N	\N	\N	1	2	\N	\N	\N	2	\N	\N
8	8	receipt	98.0000	2025-11-14 05:44:39.600924	2025-11-14 05:44:39.600947	2025-11-14 14:44:39.457475	\N	\N	\N	1	2	\N	\N	\N	4	\N	\N
9	9	receipt	73.0000	2025-11-14 05:44:39.606937	2025-11-14 05:44:39.606953	2025-11-14 14:44:39.457475	\N	\N	\N	1	2	\N	\N	\N	2	\N	\N
10	10	receipt	102.0000	2025-11-14 05:44:39.612421	2025-11-14 05:44:39.612437	2025-11-14 14:44:39.457475	\N	\N	\N	1	1	\N	\N	\N	1	\N	\N
11	1	outbound	-20.0000	2025-11-14 05:44:39.678688	2025-11-14 05:44:39.67871	2025-11-14 14:44:39.457475	\N	\N	\N	1	2	\N	\N	\N	5	\N	\N
12	8	outbound	-10.0000	2025-11-14 05:44:39.679233	2025-11-14 05:44:39.679253	2025-11-14 14:44:39.457475	\N	\N	\N	1	2	\N	\N	\N	4	\N	\N
13	4	outbound	-37.0000	2025-11-14 05:44:39.67956	2025-11-14 05:44:39.679582	2025-11-14 14:44:39.457475	\N	\N	\N	1	2	\N	\N	\N	3	\N	\N
\.


--
-- Data for Name: stock_movements_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.stock_movements_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-14 14:44:39.457475+09	admin	{"id": 1, "lot_id": 1, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-14T05:44:39.551867", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "occurred_at": "2025-11-14T05:44:39.551847", "source_table": null, "warehouse_id": 2, "quantity_delta": 76.0000, "related_order_id": null, "related_allocation_id": null}
2	I	2025-11-14 14:44:39.457475+09	admin	{"id": 2, "lot_id": 2, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-14T05:44:39.565815", "created_by": null, "deleted_at": null, "product_id": 1, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "occurred_at": "2025-11-14T05:44:39.565801", "source_table": null, "warehouse_id": 1, "quantity_delta": 44.0000, "related_order_id": null, "related_allocation_id": null}
3	I	2025-11-14 14:44:39.457475+09	admin	{"id": 3, "lot_id": 3, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-14T05:44:39.571808", "created_by": null, "deleted_at": null, "product_id": 2, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "occurred_at": "2025-11-14T05:44:39.571782", "source_table": null, "warehouse_id": 2, "quantity_delta": 29.0000, "related_order_id": null, "related_allocation_id": null}
4	I	2025-11-14 14:44:39.457475+09	admin	{"id": 4, "lot_id": 4, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-14T05:44:39.577153", "created_by": null, "deleted_at": null, "product_id": 3, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "occurred_at": "2025-11-14T05:44:39.577139", "source_table": null, "warehouse_id": 2, "quantity_delta": 122.0000, "related_order_id": null, "related_allocation_id": null}
5	I	2025-11-14 14:44:39.457475+09	admin	{"id": 5, "lot_id": 5, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-14T05:44:39.583087", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "occurred_at": "2025-11-14T05:44:39.583077", "source_table": null, "warehouse_id": 1, "quantity_delta": 80.0000, "related_order_id": null, "related_allocation_id": null}
6	I	2025-11-14 14:44:39.457475+09	admin	{"id": 6, "lot_id": 6, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-14T05:44:39.589697", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "occurred_at": "2025-11-14T05:44:39.589687", "source_table": null, "warehouse_id": 2, "quantity_delta": 16.0000, "related_order_id": null, "related_allocation_id": null}
7	I	2025-11-14 14:44:39.457475+09	admin	{"id": 7, "lot_id": 7, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-14T05:44:39.595559", "created_by": null, "deleted_at": null, "product_id": 2, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "occurred_at": "2025-11-14T05:44:39.595536", "source_table": null, "warehouse_id": 2, "quantity_delta": 30.0000, "related_order_id": null, "related_allocation_id": null}
8	I	2025-11-14 14:44:39.457475+09	admin	{"id": 8, "lot_id": 8, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-14T05:44:39.600947", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "occurred_at": "2025-11-14T05:44:39.600924", "source_table": null, "warehouse_id": 2, "quantity_delta": 98.0000, "related_order_id": null, "related_allocation_id": null}
9	I	2025-11-14 14:44:39.457475+09	admin	{"id": 9, "lot_id": 9, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-14T05:44:39.606953", "created_by": null, "deleted_at": null, "product_id": 2, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "occurred_at": "2025-11-14T05:44:39.606937", "source_table": null, "warehouse_id": 2, "quantity_delta": 73.0000, "related_order_id": null, "related_allocation_id": null}
10	I	2025-11-14 14:44:39.457475+09	admin	{"id": 10, "lot_id": 10, "reason": "receipt", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-14T05:44:39.612437", "created_by": null, "deleted_at": null, "product_id": 1, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "occurred_at": "2025-11-14T05:44:39.612421", "source_table": null, "warehouse_id": 1, "quantity_delta": 102.0000, "related_order_id": null, "related_allocation_id": null}
11	I	2025-11-14 14:44:39.457475+09	admin	{"id": 11, "lot_id": 1, "reason": "outbound", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-14T05:44:39.67871", "created_by": null, "deleted_at": null, "product_id": 5, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "occurred_at": "2025-11-14T05:44:39.678688", "source_table": null, "warehouse_id": 2, "quantity_delta": -20.0000, "related_order_id": null, "related_allocation_id": null}
12	I	2025-11-14 14:44:39.457475+09	admin	{"id": 12, "lot_id": 8, "reason": "outbound", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-14T05:44:39.679253", "created_by": null, "deleted_at": null, "product_id": 4, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "occurred_at": "2025-11-14T05:44:39.679233", "source_table": null, "warehouse_id": 2, "quantity_delta": -10.0000, "related_order_id": null, "related_allocation_id": null}
13	I	2025-11-14 14:44:39.457475+09	admin	{"id": 13, "lot_id": 4, "reason": "outbound", "batch_id": null, "revision": 1, "source_id": null, "created_at": "2025-11-14T05:44:39.679582", "created_by": null, "deleted_at": null, "product_id": 3, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "occurred_at": "2025-11-14T05:44:39.67956", "source_table": null, "warehouse_id": 2, "quantity_delta": -37.0000, "related_order_id": null, "related_allocation_id": null}
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.suppliers (supplier_code, supplier_name, address, created_at, updated_at, created_by, updated_by, deleted_at, revision, id) FROM stdin;
S5012	株式会社伊藤通信商事	\N	2025-11-14 05:44:39.482561	2025-11-14 14:44:39.457475	\N	\N	\N	1	1
S4657	合同会社田中運輸商事	\N	2025-11-14 05:44:39.48263	2025-11-14 14:44:39.457475	\N	\N	\N	1	2
\.


--
-- Data for Name: suppliers_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.suppliers_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-14 14:44:39.457475+09	admin	{"id": 1, "address": null, "revision": 1, "created_at": "2025-11-14T05:44:39.482561", "created_by": null, "deleted_at": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "supplier_code": "S5012", "supplier_name": "株式会社伊藤通信商事"}
2	I	2025-11-14 14:44:39.457475+09	admin	{"id": 2, "address": null, "revision": 1, "created_at": "2025-11-14T05:44:39.48263", "created_by": null, "deleted_at": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "supplier_code": "S4657", "supplier_name": "合同会社田中運輸商事"}
\.


--
-- Data for Name: unit_conversions; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.unit_conversions (id, from_unit, to_unit, factor, created_at, updated_at, created_by, updated_by, deleted_at, revision, product_id) FROM stdin;
\.


--
-- Data for Name: unit_conversions_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.unit_conversions_history (id, op, changed_at, changed_by, row_data) FROM stdin;
\.


--
-- Data for Name: warehouse; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.warehouse (id, warehouse_code, warehouse_name, address, is_active, created_at, updated_at, created_by, updated_by, deleted_at, revision) FROM stdin;
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.warehouses (warehouse_code, warehouse_name, address, is_active, created_at, updated_at, created_by, updated_by, deleted_at, revision, id) FROM stdin;
W81	羽村市倉庫	\N	t	2025-11-14 05:44:39.51959	2025-11-14 14:44:39.457475	\N	\N	\N	1	1
W35	長生郡一宮町倉庫	\N	t	2025-11-14 05:44:39.519615	2025-11-14 14:44:39.457475	\N	\N	\N	1	2
\.


--
-- Data for Name: warehouses_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.warehouses_history (id, op, changed_at, changed_by, row_data) FROM stdin;
1	I	2025-11-14 14:44:39.457475+09	admin	{"id": 1, "address": null, "revision": 1, "is_active": true, "created_at": "2025-11-14T05:44:39.51959", "created_by": null, "deleted_at": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "warehouse_code": "W81", "warehouse_name": "羽村市倉庫"}
2	I	2025-11-14 14:44:39.457475+09	admin	{"id": 2, "address": null, "revision": 1, "is_active": true, "created_at": "2025-11-14T05:44:39.519615", "created_by": null, "deleted_at": null, "updated_at": "2025-11-14T14:44:39.457475", "updated_by": null, "warehouse_code": "W35", "warehouse_name": "長生郡一宮町倉庫"}
\.


--
-- Name: allocations_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.allocations_history_id_seq', 3, true);


--
-- Name: allocations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.allocations_id_seq', 3, true);


--
-- Name: customers_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.customers_history_id_seq', 3, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.customers_id_seq', 3, true);


--
-- Name: delivery_places_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.delivery_places_history_id_seq', 2, true);


--
-- Name: delivery_places_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.delivery_places_id_seq', 2, true);


--
-- Name: expiry_rules_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.expiry_rules_history_id_seq', 1, false);


--
-- Name: expiry_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.expiry_rules_id_seq', 1, false);


--
-- Name: forecast_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.forecast_id_seq', 1, false);


--
-- Name: forecasts_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.forecasts_history_id_seq', 1, false);


--
-- Name: inbound_submissions_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.inbound_submissions_history_id_seq', 1, false);


--
-- Name: lot_current_stock_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.lot_current_stock_history_id_seq', 1, false);


--
-- Name: lots_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.lots_history_id_seq', 10, true);


--
-- Name: lots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.lots_id_seq', 10, true);


--
-- Name: next_div_map_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.next_div_map_id_seq', 1, false);


--
-- Name: ocr_submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.ocr_submissions_id_seq', 1, false);


--
-- Name: order_line_warehouse_allocation_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.order_line_warehouse_allocation_history_id_seq', 1, false);


--
-- Name: order_line_warehouse_allocation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.order_line_warehouse_allocation_id_seq', 1, false);


--
-- Name: order_lines_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.order_lines_history_id_seq', 12, true);


--
-- Name: order_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.order_lines_id_seq', 12, true);


--
-- Name: orders_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.orders_history_id_seq', 5, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.orders_id_seq', 5, true);


--
-- Name: product_uom_conversions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.product_uom_conversions_id_seq', 1, false);


--
-- Name: products_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.products_history_id_seq', 5, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.products_id_seq', 5, true);


--
-- Name: purchase_requests_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.purchase_requests_history_id_seq', 1, false);


--
-- Name: purchase_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.purchase_requests_id_seq', 1, false);


--
-- Name: receipt_headers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.receipt_headers_id_seq', 1, false);


--
-- Name: receipt_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.receipt_lines_id_seq', 1, false);


--
-- Name: sap_sync_logs_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.sap_sync_logs_history_id_seq', 1, false);


--
-- Name: sap_sync_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.sap_sync_logs_id_seq', 1, false);


--
-- Name: seed_snapshots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.seed_snapshots_id_seq', 1, false);


--
-- Name: shipping_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.shipping_id_seq', 1, false);


--
-- Name: stock_movements_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.stock_movements_history_id_seq', 13, true);


--
-- Name: stock_movements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.stock_movements_id_seq', 13, true);


--
-- Name: suppliers_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.suppliers_history_id_seq', 2, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 2, true);


--
-- Name: unit_conversions_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.unit_conversions_history_id_seq', 1, false);


--
-- Name: unit_conversions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.unit_conversions_id_seq', 1, false);


--
-- Name: warehouse_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.warehouse_id_seq', 1, false);


--
-- Name: warehouses_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.warehouses_history_id_seq', 2, true);


--
-- Name: warehouses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.warehouses_id_seq', 2, true);


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
-- Name: customers_history customers_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.customers_history
    ADD CONSTRAINT customers_history_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: delivery_places_history delivery_places_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.delivery_places_history
    ADD CONSTRAINT delivery_places_history_pkey PRIMARY KEY (id);


--
-- Name: delivery_places delivery_places_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.delivery_places
    ADD CONSTRAINT delivery_places_pkey PRIMARY KEY (id);


--
-- Name: expiry_rules_history expiry_rules_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expiry_rules_history
    ADD CONSTRAINT expiry_rules_history_pkey PRIMARY KEY (id);


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
-- Name: forecasts_history forecasts_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecasts_history
    ADD CONSTRAINT forecasts_history_pkey PRIMARY KEY (id);


--
-- Name: inbound_submissions_history inbound_submissions_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inbound_submissions_history
    ADD CONSTRAINT inbound_submissions_history_pkey PRIMARY KEY (id);


--
-- Name: lot_current_stock_history_backup lot_current_stock_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lot_current_stock_history_backup
    ADD CONSTRAINT lot_current_stock_history_pkey PRIMARY KEY (id);


--
-- Name: lot_current_stock_backup lot_current_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lot_current_stock_backup
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
-- Name: order_line_warehouse_allocation_history order_line_warehouse_allocation_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_line_warehouse_allocation_history
    ADD CONSTRAINT order_line_warehouse_allocation_history_pkey PRIMARY KEY (id);


--
-- Name: order_line_warehouse_allocation order_line_warehouse_allocation_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_line_warehouse_allocation
    ADD CONSTRAINT order_line_warehouse_allocation_pkey PRIMARY KEY (id);


--
-- Name: order_lines_history order_lines_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines_history
    ADD CONSTRAINT order_lines_history_pkey PRIMARY KEY (id);


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
-- Name: products_history products_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products_history
    ADD CONSTRAINT products_history_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: purchase_requests_history purchase_requests_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchase_requests_history
    ADD CONSTRAINT purchase_requests_history_pkey PRIMARY KEY (id);


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
-- Name: sap_sync_logs_history sap_sync_logs_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.sap_sync_logs_history
    ADD CONSTRAINT sap_sync_logs_history_pkey PRIMARY KEY (id);


--
-- Name: sap_sync_logs sap_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.sap_sync_logs
    ADD CONSTRAINT sap_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: seed_snapshots seed_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.seed_snapshots
    ADD CONSTRAINT seed_snapshots_pkey PRIMARY KEY (id);


--
-- Name: shipping shipping_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.shipping
    ADD CONSTRAINT shipping_pkey PRIMARY KEY (id);


--
-- Name: stock_movements_history stock_movements_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_movements_history
    ADD CONSTRAINT stock_movements_history_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: suppliers_history suppliers_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.suppliers_history
    ADD CONSTRAINT suppliers_history_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: unit_conversions_history unit_conversions_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.unit_conversions_history
    ADD CONSTRAINT unit_conversions_history_pkey PRIMARY KEY (id);


--
-- Name: unit_conversions unit_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.unit_conversions
    ADD CONSTRAINT unit_conversions_pkey PRIMARY KEY (id);


--
-- Name: customers uq_customers_customer_code; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT uq_customers_customer_code UNIQUE (customer_code);


--
-- Name: delivery_places uq_delivery_places_code; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.delivery_places
    ADD CONSTRAINT uq_delivery_places_code UNIQUE (delivery_place_code);


--
-- Name: next_div_map uq_nextdiv_customer_ship_to_product; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.next_div_map
    ADD CONSTRAINT uq_nextdiv_customer_ship_to_product UNIQUE (customer_code, ship_to_code, product_id);


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
-- Name: unit_conversions uq_product_units; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.unit_conversions
    ADD CONSTRAINT uq_product_units UNIQUE (product_id, from_unit, to_unit);


--
-- Name: products uq_products_product_code; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT uq_products_product_code UNIQUE (product_code);


--
-- Name: product_uom_conversions uq_puc_product_unit; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.product_uom_conversions
    ADD CONSTRAINT uq_puc_product_unit UNIQUE (product_id, source_unit);


--
-- Name: receipt_lines uq_receipt_line; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT uq_receipt_line UNIQUE (header_id, line_no);


--
-- Name: suppliers uq_suppliers_supplier_code; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT uq_suppliers_supplier_code UNIQUE (supplier_code);


--
-- Name: warehouses uq_warehouses_warehouse_code; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT uq_warehouses_warehouse_code UNIQUE (warehouse_code);


--
-- Name: warehouse warehouse_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warehouse
    ADD CONSTRAINT warehouse_pkey PRIMARY KEY (id);


--
-- Name: warehouses_history warehouses_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warehouses_history
    ADD CONSTRAINT warehouses_history_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: allocations_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX allocations_hist_gin_row ON public.allocations_history USING gin (row_data);


--
-- Name: allocations_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX allocations_hist_idx_changed_at ON public.allocations_history USING btree (changed_at);


--
-- Name: allocations_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX allocations_hist_idx_op ON public.allocations_history USING btree (op);


--
-- Name: allocations_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX allocations_hist_idx_row_id ON public.allocations_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: customers_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX customers_hist_gin_row ON public.customers_history USING gin (row_data);


--
-- Name: customers_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX customers_hist_idx_changed_at ON public.customers_history USING btree (changed_at);


--
-- Name: customers_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX customers_hist_idx_op ON public.customers_history USING btree (op);


--
-- Name: customers_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX customers_hist_idx_row_id ON public.customers_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: delivery_places_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX delivery_places_hist_gin_row ON public.delivery_places_history USING gin (row_data);


--
-- Name: delivery_places_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX delivery_places_hist_idx_changed_at ON public.delivery_places_history USING btree (changed_at);


--
-- Name: delivery_places_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX delivery_places_hist_idx_op ON public.delivery_places_history USING btree (op);


--
-- Name: delivery_places_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX delivery_places_hist_idx_row_id ON public.delivery_places_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: expiry_rules_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX expiry_rules_hist_gin_row ON public.expiry_rules_history USING gin (row_data);


--
-- Name: expiry_rules_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX expiry_rules_hist_idx_changed_at ON public.expiry_rules_history USING btree (changed_at);


--
-- Name: expiry_rules_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX expiry_rules_hist_idx_op ON public.expiry_rules_history USING btree (op);


--
-- Name: expiry_rules_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX expiry_rules_hist_idx_row_id ON public.expiry_rules_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: forecasts_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX forecasts_hist_gin_row ON public.forecasts_history USING gin (row_data);


--
-- Name: forecasts_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX forecasts_hist_idx_changed_at ON public.forecasts_history USING btree (changed_at);


--
-- Name: forecasts_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX forecasts_hist_idx_op ON public.forecasts_history USING btree (op);


--
-- Name: forecasts_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX forecasts_hist_idx_row_id ON public.forecasts_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: gin_allocations_history_row_data; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX gin_allocations_history_row_data ON public.allocations_history USING gin (row_data);


--
-- Name: gin_lots_history_row_data; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX gin_lots_history_row_data ON public.lots_history USING gin (row_data);


--
-- Name: gin_order_lines_history_row_data; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX gin_order_lines_history_row_data ON public.order_lines_history USING gin (row_data);


--
-- Name: gin_orders_history_row_data; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX gin_orders_history_row_data ON public.orders_history USING gin (row_data);


--
-- Name: gin_products_history_row_data; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX gin_products_history_row_data ON public.products_history USING gin (row_data);


--
-- Name: gin_warehouses_history_row_data; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX gin_warehouses_history_row_data ON public.warehouses_history USING gin (row_data);


--
-- Name: idx_allocations_lot_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_allocations_lot_id ON public.allocations USING btree (lot_id);


--
-- Name: idx_allocations_order_line_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_allocations_order_line_id ON public.allocations USING btree (order_line_id);


--
-- Name: idx_allocations_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_allocations_status ON public.allocations USING btree (status);


--
-- Name: idx_forecasts_daily; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_forecasts_daily ON public.forecasts USING btree (customer_id, product_id) WHERE ((is_active = true) AND ((granularity)::text = 'daily'::text));


--
-- Name: idx_lots_lot_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_lots_lot_status ON public.lots USING btree (lot_status);


--
-- Name: idx_lots_product_fifo; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_lots_product_fifo ON public.lots USING btree (product_id, expiry_date, receipt_date) WHERE (((lot_status)::text = 'available'::text) AND (is_locked = false));


--
-- Name: idx_movements_related_allocation_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_movements_related_allocation_id ON public.stock_movements USING btree (related_allocation_id);


--
-- Name: idx_movements_related_order_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_movements_related_order_id ON public.stock_movements USING btree (related_order_id);


--
-- Name: idx_order_lines_warehouse_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_order_lines_warehouse_id ON public.order_lines USING btree (warehouse_id);


--
-- Name: idx_orders_delivery_place; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_orders_delivery_place ON public.orders USING btree (delivery_place_id);


--
-- Name: idx_stock_movements_lot; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_stock_movements_lot ON public.stock_movements USING btree (lot_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_stock_movements_occurred_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_stock_movements_occurred_at ON public.stock_movements USING btree (occurred_at);


--
-- Name: idx_stock_movements_product_warehouse; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_stock_movements_product_warehouse ON public.stock_movements USING btree (product_id, warehouse_id);


--
-- Name: inbound_submissions_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX inbound_submissions_hist_gin_row ON public.inbound_submissions_history USING gin (row_data);


--
-- Name: inbound_submissions_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX inbound_submissions_hist_idx_changed_at ON public.inbound_submissions_history USING btree (changed_at);


--
-- Name: inbound_submissions_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX inbound_submissions_hist_idx_op ON public.inbound_submissions_history USING btree (op);


--
-- Name: inbound_submissions_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX inbound_submissions_hist_idx_row_id ON public.inbound_submissions_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: ix_alloc_lot; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_alloc_lot ON public.allocations USING btree (lot_id);


--
-- Name: ix_alloc_ol; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_alloc_ol ON public.allocations USING btree (order_line_id);


--
-- Name: ix_allocations_history_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_allocations_history_changed_at ON public.allocations_history USING btree (changed_at);


--
-- Name: ix_customers_customer_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_customers_customer_code ON public.customers USING btree (customer_code);


--
-- Name: ix_delivery_places_delivery_place_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_delivery_places_delivery_place_code ON public.delivery_places USING btree (delivery_place_code);


--
-- Name: ix_lots_history_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_lots_history_changed_at ON public.lots_history USING btree (changed_at);


--
-- Name: ix_lots_lot_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_lots_lot_status ON public.lots USING btree (lot_status);


--
-- Name: ix_lots_supplier_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_lots_supplier_code ON public.lots USING btree (supplier_code);


--
-- Name: ix_lots_warehouse_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_lots_warehouse_code ON public.lots USING btree (warehouse_code);


--
-- Name: ix_lots_warehouse_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_lots_warehouse_id ON public.lots USING btree (warehouse_id);


--
-- Name: ix_order_lines_history_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_order_lines_history_changed_at ON public.order_lines_history USING btree (changed_at);


--
-- Name: ix_orders_customer_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_orders_customer_code ON public.orders USING btree (customer_code);


--
-- Name: ix_orders_customer_id_order_date; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_orders_customer_id_order_date ON public.orders USING btree (customer_id, order_date);


--
-- Name: ix_orders_history_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_orders_history_changed_at ON public.orders_history USING btree (changed_at);


--
-- Name: ix_products_history_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_products_history_changed_at ON public.products_history USING btree (changed_at);


--
-- Name: ix_products_product_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_products_product_code ON public.products USING btree (product_code);


--
-- Name: ix_stock_movements_lot; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_stock_movements_lot ON public.stock_movements USING btree (lot_id);


--
-- Name: ix_stock_movements_occurred; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_stock_movements_occurred ON public.stock_movements USING btree (occurred_at) WHERE (deleted_at IS NULL);


--
-- Name: ix_stock_movements_pwl; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_stock_movements_pwl ON public.stock_movements USING btree (product_id, warehouse_id) WHERE (deleted_at IS NULL);


--
-- Name: ix_suppliers_supplier_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_suppliers_supplier_code ON public.suppliers USING btree (supplier_code);


--
-- Name: ix_warehouse_warehouse_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX ix_warehouse_warehouse_code ON public.warehouse USING btree (warehouse_code);


--
-- Name: ix_warehouses_history_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_warehouses_history_changed_at ON public.warehouses_history USING btree (changed_at);


--
-- Name: lot_current_stock_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX lot_current_stock_hist_gin_row ON public.lot_current_stock_history_backup USING gin (row_data);


--
-- Name: lot_current_stock_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX lot_current_stock_hist_idx_changed_at ON public.lot_current_stock_history_backup USING btree (changed_at);


--
-- Name: lot_current_stock_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX lot_current_stock_hist_idx_op ON public.lot_current_stock_history_backup USING btree (op);


--
-- Name: lot_current_stock_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX lot_current_stock_hist_idx_row_id ON public.lot_current_stock_history_backup USING btree (((row_data ->> 'id'::text)));


--
-- Name: lots_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX lots_hist_gin_row ON public.lots_history USING gin (row_data);


--
-- Name: lots_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX lots_hist_idx_changed_at ON public.lots_history USING btree (changed_at);


--
-- Name: lots_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX lots_hist_idx_op ON public.lots_history USING btree (op);


--
-- Name: lots_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX lots_hist_idx_row_id ON public.lots_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: order_line_warehouse_allocation_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX order_line_warehouse_allocation_hist_gin_row ON public.order_line_warehouse_allocation_history USING gin (row_data);


--
-- Name: order_line_warehouse_allocation_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX order_line_warehouse_allocation_hist_idx_changed_at ON public.order_line_warehouse_allocation_history USING btree (changed_at);


--
-- Name: order_line_warehouse_allocation_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX order_line_warehouse_allocation_hist_idx_op ON public.order_line_warehouse_allocation_history USING btree (op);


--
-- Name: order_line_warehouse_allocation_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX order_line_warehouse_allocation_hist_idx_row_id ON public.order_line_warehouse_allocation_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: order_lines_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX order_lines_hist_gin_row ON public.order_lines_history USING gin (row_data);


--
-- Name: order_lines_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX order_lines_hist_idx_changed_at ON public.order_lines_history USING btree (changed_at);


--
-- Name: order_lines_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX order_lines_hist_idx_op ON public.order_lines_history USING btree (op);


--
-- Name: order_lines_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX order_lines_hist_idx_row_id ON public.order_lines_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: orders_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX orders_hist_gin_row ON public.orders_history USING gin (row_data);


--
-- Name: orders_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX orders_hist_idx_changed_at ON public.orders_history USING btree (changed_at);


--
-- Name: orders_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX orders_hist_idx_op ON public.orders_history USING btree (op);


--
-- Name: orders_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX orders_hist_idx_row_id ON public.orders_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: products_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX products_hist_gin_row ON public.products_history USING gin (row_data);


--
-- Name: products_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX products_hist_idx_changed_at ON public.products_history USING btree (changed_at);


--
-- Name: products_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX products_hist_idx_op ON public.products_history USING btree (op);


--
-- Name: products_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX products_hist_idx_row_id ON public.products_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: purchase_requests_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX purchase_requests_hist_gin_row ON public.purchase_requests_history USING gin (row_data);


--
-- Name: purchase_requests_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX purchase_requests_hist_idx_changed_at ON public.purchase_requests_history USING btree (changed_at);


--
-- Name: purchase_requests_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX purchase_requests_hist_idx_op ON public.purchase_requests_history USING btree (op);


--
-- Name: purchase_requests_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX purchase_requests_hist_idx_row_id ON public.purchase_requests_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: sap_sync_logs_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX sap_sync_logs_hist_gin_row ON public.sap_sync_logs_history USING gin (row_data);


--
-- Name: sap_sync_logs_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX sap_sync_logs_hist_idx_changed_at ON public.sap_sync_logs_history USING btree (changed_at);


--
-- Name: sap_sync_logs_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX sap_sync_logs_hist_idx_op ON public.sap_sync_logs_history USING btree (op);


--
-- Name: sap_sync_logs_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX sap_sync_logs_hist_idx_row_id ON public.sap_sync_logs_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: stock_movements_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX stock_movements_hist_gin_row ON public.stock_movements_history USING gin (row_data);


--
-- Name: stock_movements_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX stock_movements_hist_idx_changed_at ON public.stock_movements_history USING btree (changed_at);


--
-- Name: stock_movements_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX stock_movements_hist_idx_op ON public.stock_movements_history USING btree (op);


--
-- Name: stock_movements_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX stock_movements_hist_idx_row_id ON public.stock_movements_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: suppliers_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX suppliers_hist_gin_row ON public.suppliers_history USING gin (row_data);


--
-- Name: suppliers_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX suppliers_hist_idx_changed_at ON public.suppliers_history USING btree (changed_at);


--
-- Name: suppliers_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX suppliers_hist_idx_op ON public.suppliers_history USING btree (op);


--
-- Name: suppliers_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX suppliers_hist_idx_row_id ON public.suppliers_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: unit_conversions_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX unit_conversions_hist_gin_row ON public.unit_conversions_history USING gin (row_data);


--
-- Name: unit_conversions_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX unit_conversions_hist_idx_changed_at ON public.unit_conversions_history USING btree (changed_at);


--
-- Name: unit_conversions_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX unit_conversions_hist_idx_op ON public.unit_conversions_history USING btree (op);


--
-- Name: unit_conversions_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX unit_conversions_hist_idx_row_id ON public.unit_conversions_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: uq_orders_customer_order_no_per_customer; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX uq_orders_customer_order_no_per_customer ON public.orders USING btree (customer_id, customer_order_no) WHERE (customer_order_no IS NOT NULL);


--
-- Name: uq_warehouses_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX uq_warehouses_id ON public.warehouses USING btree (id);


--
-- Name: warehouses_hist_gin_row; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX warehouses_hist_gin_row ON public.warehouses_history USING gin (row_data);


--
-- Name: warehouses_hist_idx_changed_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX warehouses_hist_idx_changed_at ON public.warehouses_history USING btree (changed_at);


--
-- Name: warehouses_hist_idx_op; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX warehouses_hist_idx_op ON public.warehouses_history USING btree (op);


--
-- Name: warehouses_hist_idx_row_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX warehouses_hist_idx_row_id ON public.warehouses_history USING btree (((row_data ->> 'id'::text)));


--
-- Name: allocations allocations_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER allocations_audit_del AFTER DELETE ON public.allocations FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: allocations allocations_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER allocations_audit_ins AFTER INSERT ON public.allocations FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: allocations allocations_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER allocations_audit_upd AFTER UPDATE ON public.allocations FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: customers customers_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER customers_audit_del AFTER DELETE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: customers customers_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER customers_audit_ins AFTER INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: customers customers_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER customers_audit_upd AFTER UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: delivery_places delivery_places_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER delivery_places_audit_del AFTER DELETE ON public.delivery_places FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: delivery_places delivery_places_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER delivery_places_audit_ins AFTER INSERT ON public.delivery_places FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: delivery_places delivery_places_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER delivery_places_audit_upd AFTER UPDATE ON public.delivery_places FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: expiry_rules expiry_rules_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER expiry_rules_audit_del AFTER DELETE ON public.expiry_rules FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: expiry_rules expiry_rules_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER expiry_rules_audit_ins AFTER INSERT ON public.expiry_rules FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: expiry_rules expiry_rules_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER expiry_rules_audit_upd AFTER UPDATE ON public.expiry_rules FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: forecasts forecasts_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER forecasts_audit_del AFTER DELETE ON public.forecasts FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: forecasts forecasts_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER forecasts_audit_ins AFTER INSERT ON public.forecasts FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: forecasts forecasts_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER forecasts_audit_upd AFTER UPDATE ON public.forecasts FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: inbound_submissions inbound_submissions_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER inbound_submissions_audit_del AFTER DELETE ON public.inbound_submissions FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: inbound_submissions inbound_submissions_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER inbound_submissions_audit_ins AFTER INSERT ON public.inbound_submissions FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: inbound_submissions inbound_submissions_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER inbound_submissions_audit_upd AFTER UPDATE ON public.inbound_submissions FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: lot_current_stock_backup lot_current_stock_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER lot_current_stock_audit_del AFTER DELETE ON public.lot_current_stock_backup FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: lot_current_stock_backup lot_current_stock_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER lot_current_stock_audit_ins AFTER INSERT ON public.lot_current_stock_backup FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: lot_current_stock_backup lot_current_stock_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER lot_current_stock_audit_upd AFTER UPDATE ON public.lot_current_stock_backup FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: lots lots_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER lots_audit_del AFTER DELETE ON public.lots FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: lots lots_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER lots_audit_ins AFTER INSERT ON public.lots FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: lots lots_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER lots_audit_upd AFTER UPDATE ON public.lots FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: order_line_warehouse_allocation order_line_warehouse_allocation_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER order_line_warehouse_allocation_audit_del AFTER DELETE ON public.order_line_warehouse_allocation FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: order_line_warehouse_allocation order_line_warehouse_allocation_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER order_line_warehouse_allocation_audit_ins AFTER INSERT ON public.order_line_warehouse_allocation FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: order_line_warehouse_allocation order_line_warehouse_allocation_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER order_line_warehouse_allocation_audit_upd AFTER UPDATE ON public.order_line_warehouse_allocation FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: order_lines order_lines_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER order_lines_audit_del AFTER DELETE ON public.order_lines FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: order_lines order_lines_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER order_lines_audit_ins AFTER INSERT ON public.order_lines FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: order_lines order_lines_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER order_lines_audit_upd AFTER UPDATE ON public.order_lines FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: orders orders_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER orders_audit_del AFTER DELETE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: orders orders_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER orders_audit_ins AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: orders orders_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER orders_audit_upd AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: products products_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER products_audit_del AFTER DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: products products_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER products_audit_ins AFTER INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: products products_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER products_audit_upd AFTER UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: purchase_requests purchase_requests_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER purchase_requests_audit_del AFTER DELETE ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: purchase_requests purchase_requests_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER purchase_requests_audit_ins AFTER INSERT ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: purchase_requests purchase_requests_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER purchase_requests_audit_upd AFTER UPDATE ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: sap_sync_logs sap_sync_logs_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER sap_sync_logs_audit_del AFTER DELETE ON public.sap_sync_logs FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: sap_sync_logs sap_sync_logs_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER sap_sync_logs_audit_ins AFTER INSERT ON public.sap_sync_logs FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: sap_sync_logs sap_sync_logs_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER sap_sync_logs_audit_upd AFTER UPDATE ON public.sap_sync_logs FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: stock_movements stock_movements_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER stock_movements_audit_del AFTER DELETE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: stock_movements stock_movements_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER stock_movements_audit_ins AFTER INSERT ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: stock_movements stock_movements_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER stock_movements_audit_upd AFTER UPDATE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: suppliers suppliers_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER suppliers_audit_del AFTER DELETE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: suppliers suppliers_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER suppliers_audit_ins AFTER INSERT ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: suppliers suppliers_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER suppliers_audit_upd AFTER UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: unit_conversions unit_conversions_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER unit_conversions_audit_del AFTER DELETE ON public.unit_conversions FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: unit_conversions unit_conversions_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER unit_conversions_audit_ins AFTER INSERT ON public.unit_conversions FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: unit_conversions unit_conversions_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER unit_conversions_audit_upd AFTER UPDATE ON public.unit_conversions FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: warehouses warehouses_audit_del; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER warehouses_audit_del AFTER DELETE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: warehouses warehouses_audit_ins; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER warehouses_audit_ins AFTER INSERT ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.audit_write();


--
-- Name: warehouses warehouses_audit_upd; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER warehouses_audit_upd AFTER UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.audit_write();


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
-- Name: allocations fk_allocations_destination; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT fk_allocations_destination FOREIGN KEY (destination_id) REFERENCES public.delivery_places(id);


--
-- Name: expiry_rules fk_expiry_rules_product; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expiry_rules
    ADD CONSTRAINT fk_expiry_rules_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: expiry_rules fk_expiry_rules_supplier; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expiry_rules
    ADD CONSTRAINT fk_expiry_rules_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: forecasts fk_forecasts_customer; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecasts
    ADD CONSTRAINT fk_forecasts_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: forecasts fk_forecasts_product; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecasts
    ADD CONSTRAINT fk_forecasts_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: lots fk_lots_product; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT fk_lots_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: lots fk_lots_supplier; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT fk_lots_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: lots fk_lots_warehouse_id__warehouses_id; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT fk_lots_warehouse_id__warehouses_id FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;


--
-- Name: next_div_map fk_nextdiv_product; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.next_div_map
    ADD CONSTRAINT fk_nextdiv_product FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: order_lines fk_order_lines_product; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT fk_order_lines_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: orders fk_orders_customer; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: orders fk_orders_delivery_place; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_delivery_place FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE RESTRICT;


--
-- Name: products fk_products_delivery_place; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_delivery_place FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id);


--
-- Name: products fk_products_supplier; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: product_uom_conversions fk_puc_product; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.product_uom_conversions
    ADD CONSTRAINT fk_puc_product FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: purchase_requests fk_purchase_requests_product; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT fk_purchase_requests_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: purchase_requests fk_purchase_requests_supplier; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT fk_purchase_requests_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: receipt_lines fk_receipt_product; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.receipt_lines
    ADD CONSTRAINT fk_receipt_product FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: stock_movements fk_stock_movements_product; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: unit_conversions fk_unit_conversions_product; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.unit_conversions
    ADD CONSTRAINT fk_unit_conversions_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: lot_current_stock_backup lot_current_stock_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lot_current_stock_backup
    ADD CONSTRAINT lot_current_stock_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: order_line_warehouse_allocation order_line_warehouse_allocation_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_line_warehouse_allocation
    ADD CONSTRAINT order_line_warehouse_allocation_order_line_id_fkey FOREIGN KEY (order_line_id) REFERENCES public.order_lines(id) ON DELETE CASCADE;


--
-- Name: order_lines order_lines_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_lines order_lines_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: purchase_requests purchase_requests_src_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_src_order_line_id_fkey FOREIGN KEY (src_order_line_id) REFERENCES public.order_lines(id);


--
-- Name: receipt_headers receipt_headers_supplier_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.receipt_headers
    ADD CONSTRAINT receipt_headers_supplier_code_fkey FOREIGN KEY (supplier_code) REFERENCES public.suppliers(supplier_code);


--
-- Name: receipt_headers receipt_headers_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.receipt_headers
    ADD CONSTRAINT receipt_headers_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


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
    ADD CONSTRAINT stock_movements_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id);


--
-- Name: stock_movements stock_movements_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: admin
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict Pm0AfkfIB6Y5ecwoWPXEiEcnrgZrcnhBOmbY74CuUkVlNQpArUiglGvfcktzHCR

