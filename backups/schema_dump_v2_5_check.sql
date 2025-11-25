--
-- PostgreSQL database dump
--

\restrict QyQ2YDYugGrYwEvJgYthCpQK0vS8dX03J87KVaZe7sbwfz9zQ9eFY8oXimli3dB

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
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: admin
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: adjustments; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.adjustments (
    id bigint NOT NULL,
    lot_id bigint NOT NULL,
    adjustment_type character varying(20) NOT NULL,
    adjusted_quantity numeric(15,3) NOT NULL,
    reason text NOT NULL,
    adjusted_by bigint NOT NULL,
    adjusted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_adjustments_type CHECK (((adjustment_type)::text = ANY ((ARRAY['physical_count'::character varying, 'damage'::character varying, 'loss'::character varying, 'found'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.adjustments OWNER TO admin;

--
-- Name: TABLE adjustments; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.adjustments IS '在庫調整(棚卸差異等)';


--
-- Name: COLUMN adjustments.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.adjustments.id IS '調整ID(主キー)';


--
-- Name: COLUMN adjustments.lot_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.adjustments.lot_id IS 'ロットID(外部キー)';


--
-- Name: COLUMN adjustments.adjustment_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.adjustments.adjustment_type IS '調整種別(physical_count/damage/loss/found/other)';


--
-- Name: COLUMN adjustments.adjusted_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.adjustments.adjusted_quantity IS '調整数量(+/-)';


--
-- Name: COLUMN adjustments.reason; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.adjustments.reason IS '調整理由';


--
-- Name: COLUMN adjustments.adjusted_by; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.adjustments.adjusted_by IS '調整者(ユーザーID)';


--
-- Name: COLUMN adjustments.adjusted_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.adjustments.adjusted_at IS '調整日時';


--
-- Name: adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.adjustments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.adjustments_id_seq OWNER TO admin;

--
-- Name: adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.adjustments_id_seq OWNED BY public.adjustments.id;


--
-- Name: allocation_suggestions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.allocation_suggestions (
    id bigint NOT NULL,
    forecast_line_id bigint NOT NULL,
    lot_id bigint NOT NULL,
    suggested_quantity numeric(15,3) NOT NULL,
    allocation_logic character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.allocation_suggestions OWNER TO admin;

--
-- Name: TABLE allocation_suggestions; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.allocation_suggestions IS '引当推奨(システムが提案する引当案)';


--
-- Name: COLUMN allocation_suggestions.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocation_suggestions.id IS '推奨ID(主キー)';


--
-- Name: COLUMN allocation_suggestions.forecast_line_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocation_suggestions.forecast_line_id IS 'フォーキャスト明細ID(外部キー)';


--
-- Name: COLUMN allocation_suggestions.lot_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocation_suggestions.lot_id IS 'ロットID(外部キー)';


--
-- Name: COLUMN allocation_suggestions.suggested_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocation_suggestions.suggested_quantity IS '推奨数量';


--
-- Name: COLUMN allocation_suggestions.allocation_logic; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocation_suggestions.allocation_logic IS '引当ロジック(FEFO/FIFO/MANUAL等)';


--
-- Name: allocation_suggestions_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.allocation_suggestions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.allocation_suggestions_id_seq OWNER TO admin;

--
-- Name: allocation_suggestions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.allocation_suggestions_id_seq OWNED BY public.allocation_suggestions.id;


--
-- Name: allocations; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.allocations (
    id bigint NOT NULL,
    order_line_id bigint NOT NULL,
    lot_id bigint NOT NULL,
    allocated_quantity numeric(15,3) NOT NULL,
    status character varying(20) DEFAULT 'allocated'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_allocations_status CHECK (((status)::text = ANY ((ARRAY['allocated'::character varying, 'shipped'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.allocations OWNER TO admin;

--
-- Name: TABLE allocations; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.allocations IS '引当実績(確定した引当)';


--
-- Name: COLUMN allocations.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocations.id IS '引当ID(主キー)';


--
-- Name: COLUMN allocations.order_line_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocations.order_line_id IS '受注明細ID(外部キー)';


--
-- Name: COLUMN allocations.lot_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocations.lot_id IS 'ロットID(外部キー)';


--
-- Name: COLUMN allocations.allocated_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocations.allocated_quantity IS '引当数量';


--
-- Name: COLUMN allocations.status; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocations.status IS 'ステータス(allocated/shipped/cancelled)';


--
-- Name: allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.allocations_id_seq
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
-- Name: batch_jobs; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.batch_jobs (
    id bigint NOT NULL,
    job_name character varying(100) NOT NULL,
    job_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    parameters jsonb,
    result_message text,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_batch_jobs_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))),
    CONSTRAINT chk_batch_jobs_type CHECK (((job_type)::text = ANY ((ARRAY['allocation_suggestion'::character varying, 'allocation_finalize'::character varying, 'inventory_sync'::character varying, 'data_import'::character varying, 'report_generation'::character varying])::text[])))
);


ALTER TABLE public.batch_jobs OWNER TO admin;

--
-- Name: TABLE batch_jobs; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.batch_jobs IS 'バッチジョブ管理';


--
-- Name: COLUMN batch_jobs.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.batch_jobs.id IS 'ジョブID(主キー)';


--
-- Name: COLUMN batch_jobs.job_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.batch_jobs.job_name IS 'ジョブ名';


--
-- Name: COLUMN batch_jobs.job_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.batch_jobs.job_type IS 'ジョブ種別';


--
-- Name: COLUMN batch_jobs.status; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.batch_jobs.status IS 'ステータス(pending/running/completed/failed)';


--
-- Name: COLUMN batch_jobs.parameters; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.batch_jobs.parameters IS 'ジョブパラメータ(JSON)';


--
-- Name: COLUMN batch_jobs.result_message; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.batch_jobs.result_message IS '実行結果メッセージ';


--
-- Name: COLUMN batch_jobs.started_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.batch_jobs.started_at IS '開始日時';


--
-- Name: COLUMN batch_jobs.completed_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.batch_jobs.completed_at IS '完了日時';


--
-- Name: batch_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.batch_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.batch_jobs_id_seq OWNER TO admin;

--
-- Name: batch_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.batch_jobs_id_seq OWNED BY public.batch_jobs.id;


--
-- Name: business_rules; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.business_rules (
    id bigint NOT NULL,
    rule_code character varying(50) NOT NULL,
    rule_name character varying(100) NOT NULL,
    rule_type character varying(50) NOT NULL,
    rule_parameters jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_business_rules_type CHECK (((rule_type)::text = ANY ((ARRAY['allocation'::character varying, 'expiry_warning'::character varying, 'kanban'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.business_rules OWNER TO admin;

--
-- Name: TABLE business_rules; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.business_rules IS '業務ルール設定';


--
-- Name: COLUMN business_rules.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.business_rules.id IS 'ルールID(主キー)';


--
-- Name: COLUMN business_rules.rule_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.business_rules.rule_code IS 'ルールコード(一意)';


--
-- Name: COLUMN business_rules.rule_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.business_rules.rule_name IS 'ルール名';


--
-- Name: COLUMN business_rules.rule_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.business_rules.rule_type IS 'ルール種別(allocation/expiry_warning/kanban/other)';


--
-- Name: COLUMN business_rules.rule_parameters; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.business_rules.rule_parameters IS 'ルールパラメータ(JSON)';


--
-- Name: COLUMN business_rules.is_active; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.business_rules.is_active IS '有効フラグ';


--
-- Name: business_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.business_rules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.business_rules_id_seq OWNER TO admin;

--
-- Name: business_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.business_rules_id_seq OWNED BY public.business_rules.id;


--
-- Name: customer_items; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.customer_items (
    customer_id bigint NOT NULL,
    external_product_code character varying(100) NOT NULL,
    product_id bigint NOT NULL,
    supplier_id bigint,
    base_unit character varying(20) NOT NULL,
    pack_unit character varying(20),
    pack_quantity integer,
    special_instructions text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.customer_items OWNER TO admin;

--
-- Name: TABLE customer_items; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.customer_items IS '得意先品番マッピング';


--
-- Name: COLUMN customer_items.customer_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customer_items.customer_id IS '得意先ID(主キー, 外部キー)';


--
-- Name: COLUMN customer_items.external_product_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customer_items.external_product_code IS '先方品番(主キー)';


--
-- Name: COLUMN customer_items.product_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customer_items.product_id IS 'メーカー品番ID(外部キー)';


--
-- Name: COLUMN customer_items.supplier_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customer_items.supplier_id IS '仕入先ID(外部キー)';


--
-- Name: COLUMN customer_items.base_unit; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customer_items.base_unit IS '社内在庫単位';


--
-- Name: COLUMN customer_items.pack_unit; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customer_items.pack_unit IS '荷姿単位';


--
-- Name: COLUMN customer_items.pack_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customer_items.pack_quantity IS '荷姿数量';


--
-- Name: COLUMN customer_items.special_instructions; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customer_items.special_instructions IS '特記事項';


--
-- Name: customers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.customers (
    id bigint NOT NULL,
    customer_code character varying(50) NOT NULL,
    customer_name character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.customers OWNER TO admin;

--
-- Name: TABLE customers; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.customers IS '得意先マスタ';


--
-- Name: COLUMN customers.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customers.id IS '得意先ID(主キー)';


--
-- Name: COLUMN customers.customer_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customers.customer_code IS '得意先コード(一意)';


--
-- Name: COLUMN customers.customer_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customers.customer_name IS '得意先名';


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.customers_id_seq
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
    id bigint NOT NULL,
    jiku_code character varying(50),
    delivery_place_code character varying(50) NOT NULL,
    delivery_place_name character varying(200) NOT NULL,
    customer_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.delivery_places OWNER TO admin;

--
-- Name: TABLE delivery_places; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.delivery_places IS '納入先マスタ';


--
-- Name: COLUMN delivery_places.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.delivery_places.id IS '納入先ID(主キー)';


--
-- Name: COLUMN delivery_places.jiku_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.delivery_places.jiku_code IS '次区コード(SAP連携用)';


--
-- Name: COLUMN delivery_places.delivery_place_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.delivery_places.delivery_place_code IS '納入先コード(表示用)';


--
-- Name: COLUMN delivery_places.delivery_place_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.delivery_places.delivery_place_name IS '納入先名';


--
-- Name: COLUMN delivery_places.customer_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.delivery_places.customer_id IS '得意先ID(外部キー)';


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
-- Name: expected_lots; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.expected_lots (
    id bigint NOT NULL,
    inbound_plan_line_id bigint NOT NULL,
    expected_lot_number character varying(100),
    expected_quantity numeric(15,3) NOT NULL,
    expected_expiry_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.expected_lots OWNER TO admin;

--
-- Name: TABLE expected_lots; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.expected_lots IS '期待ロット(入荷予定時点でロット番号が判明している場合)';


--
-- Name: COLUMN expected_lots.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.expected_lots.id IS '期待ロットID(主キー)';


--
-- Name: COLUMN expected_lots.inbound_plan_line_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.expected_lots.inbound_plan_line_id IS '入荷予定明細ID(外部キー)';


--
-- Name: COLUMN expected_lots.expected_lot_number; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.expected_lots.expected_lot_number IS '期待ロット番号';


--
-- Name: COLUMN expected_lots.expected_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.expected_lots.expected_quantity IS '期待数量';


--
-- Name: COLUMN expected_lots.expected_expiry_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.expected_lots.expected_expiry_date IS '期待消費期限';


--
-- Name: expected_lots_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.expected_lots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.expected_lots_id_seq OWNER TO admin;

--
-- Name: expected_lots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.expected_lots_id_seq OWNED BY public.expected_lots.id;


--
-- Name: forecast_current; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.forecast_current (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    delivery_place_id bigint NOT NULL,
    product_id bigint NOT NULL,
    forecast_date date NOT NULL,
    forecast_quantity numeric NOT NULL,
    unit character varying,
    snapshot_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.forecast_current OWNER TO admin;

--
-- Name: forecast_current_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.forecast_current_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.forecast_current_id_seq OWNER TO admin;

--
-- Name: forecast_current_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.forecast_current_id_seq OWNED BY public.forecast_current.id;


--
-- Name: forecast_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.forecast_history (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    delivery_place_id bigint NOT NULL,
    product_id bigint NOT NULL,
    forecast_date date NOT NULL,
    forecast_quantity numeric NOT NULL,
    unit character varying,
    snapshot_at timestamp without time zone NOT NULL,
    archived_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.forecast_history OWNER TO admin;

--
-- Name: forecast_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.forecast_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.forecast_history_id_seq OWNER TO admin;

--
-- Name: forecast_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.forecast_history_id_seq OWNED BY public.forecast_history.id;


--
-- Name: inbound_plan_lines; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.inbound_plan_lines (
    id bigint NOT NULL,
    inbound_plan_id bigint NOT NULL,
    product_id bigint NOT NULL,
    planned_quantity numeric(15,3) NOT NULL,
    unit character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.inbound_plan_lines OWNER TO admin;

--
-- Name: TABLE inbound_plan_lines; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.inbound_plan_lines IS '入荷予定明細';


--
-- Name: COLUMN inbound_plan_lines.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plan_lines.id IS '入荷予定明細ID(主キー)';


--
-- Name: COLUMN inbound_plan_lines.inbound_plan_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plan_lines.inbound_plan_id IS '入荷予定ID(外部キー)';


--
-- Name: COLUMN inbound_plan_lines.product_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plan_lines.product_id IS '製品ID(外部キー)';


--
-- Name: COLUMN inbound_plan_lines.planned_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plan_lines.planned_quantity IS '予定数量';


--
-- Name: COLUMN inbound_plan_lines.unit; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plan_lines.unit IS '単位';


--
-- Name: inbound_plan_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.inbound_plan_lines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.inbound_plan_lines_id_seq OWNER TO admin;

--
-- Name: inbound_plan_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.inbound_plan_lines_id_seq OWNED BY public.inbound_plan_lines.id;


--
-- Name: inbound_plans; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.inbound_plans (
    id bigint NOT NULL,
    plan_number character varying(50) NOT NULL,
    supplier_id bigint NOT NULL,
    planned_arrival_date date NOT NULL,
    status character varying(20) DEFAULT 'planned'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_inbound_plans_status CHECK (((status)::text = ANY ((ARRAY['planned'::character varying, 'partially_received'::character varying, 'received'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.inbound_plans OWNER TO admin;

--
-- Name: TABLE inbound_plans; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.inbound_plans IS '入荷予定ヘッダ';


--
-- Name: COLUMN inbound_plans.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plans.id IS '入荷予定ID(主キー)';


--
-- Name: COLUMN inbound_plans.plan_number; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plans.plan_number IS '入荷予定番号(一意)';


--
-- Name: COLUMN inbound_plans.supplier_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plans.supplier_id IS '仕入先ID(外部キー)';


--
-- Name: COLUMN inbound_plans.planned_arrival_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plans.planned_arrival_date IS '入荷予定日';


--
-- Name: COLUMN inbound_plans.status; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plans.status IS 'ステータス(planned/partially_received/received/cancelled)';


--
-- Name: COLUMN inbound_plans.notes; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plans.notes IS '備考';


--
-- Name: inbound_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.inbound_plans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.inbound_plans_id_seq OWNER TO admin;

--
-- Name: inbound_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.inbound_plans_id_seq OWNED BY public.inbound_plans.id;


--
-- Name: lots; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.lots (
    id bigint NOT NULL,
    lot_number character varying(100) NOT NULL,
    product_id bigint NOT NULL,
    warehouse_id bigint NOT NULL,
    supplier_id bigint,
    expected_lot_id bigint,
    received_date date NOT NULL,
    expiry_date date,
    current_quantity numeric(15,3) DEFAULT 0 NOT NULL,
    allocated_quantity numeric(15,3) DEFAULT 0 NOT NULL,
    unit character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_lots_allocated_quantity CHECK ((allocated_quantity >= (0)::numeric)),
    CONSTRAINT chk_lots_allocation_limit CHECK ((allocated_quantity <= current_quantity)),
    CONSTRAINT chk_lots_current_quantity CHECK ((current_quantity >= (0)::numeric)),
    CONSTRAINT chk_lots_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'depleted'::character varying, 'expired'::character varying, 'quarantine'::character varying])::text[])))
);


ALTER TABLE public.lots OWNER TO admin;

--
-- Name: TABLE lots; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.lots IS 'ロット在庫(実在庫)';


--
-- Name: COLUMN lots.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.id IS 'ロットID(主キー)';


--
-- Name: COLUMN lots.lot_number; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.lot_number IS 'ロット番号';


--
-- Name: COLUMN lots.product_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.product_id IS '製品ID(外部キー)';


--
-- Name: COLUMN lots.warehouse_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.warehouse_id IS '倉庫ID(外部キー)';


--
-- Name: COLUMN lots.supplier_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.supplier_id IS '仕入先ID(外部キー)';


--
-- Name: COLUMN lots.expected_lot_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.expected_lot_id IS '期待ロットID(外部キー)';


--
-- Name: COLUMN lots.received_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.received_date IS '入荷日';


--
-- Name: COLUMN lots.expiry_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.expiry_date IS '消費期限';


--
-- Name: COLUMN lots.current_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.current_quantity IS '現在庫数';


--
-- Name: COLUMN lots.allocated_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.allocated_quantity IS '引当済数量';


--
-- Name: COLUMN lots.unit; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.unit IS '単位';


--
-- Name: COLUMN lots.status; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.status IS 'ステータス(active/depleted/expired/quarantine)';


--
-- Name: lots_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.lots_id_seq
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
-- Name: master_change_logs; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.master_change_logs (
    id bigint NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id bigint NOT NULL,
    change_type character varying(20) NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_by bigint NOT NULL,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_master_change_logs_type CHECK (((change_type)::text = ANY ((ARRAY['insert'::character varying, 'update'::character varying, 'delete'::character varying])::text[])))
);


ALTER TABLE public.master_change_logs OWNER TO admin;

--
-- Name: TABLE master_change_logs; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.master_change_logs IS 'マスタ変更履歴';


--
-- Name: COLUMN master_change_logs.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.master_change_logs.id IS '変更ログID(主キー)';


--
-- Name: COLUMN master_change_logs.table_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.master_change_logs.table_name IS 'テーブル名';


--
-- Name: COLUMN master_change_logs.record_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.master_change_logs.record_id IS 'レコードID';


--
-- Name: COLUMN master_change_logs.change_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.master_change_logs.change_type IS '変更種別(insert/update/delete)';


--
-- Name: COLUMN master_change_logs.old_values; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.master_change_logs.old_values IS '変更前の値(JSON)';


--
-- Name: COLUMN master_change_logs.new_values; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.master_change_logs.new_values IS '変更後の値(JSON)';


--
-- Name: COLUMN master_change_logs.changed_by; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.master_change_logs.changed_by IS '変更者(ユーザーID)';


--
-- Name: COLUMN master_change_logs.changed_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.master_change_logs.changed_at IS '変更日時';


--
-- Name: master_change_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.master_change_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.master_change_logs_id_seq OWNER TO admin;

--
-- Name: master_change_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.master_change_logs_id_seq OWNED BY public.master_change_logs.id;


--
-- Name: operation_logs; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.operation_logs (
    id bigint NOT NULL,
    user_id bigint,
    operation_type character varying(50) NOT NULL,
    target_table character varying(50) NOT NULL,
    target_id bigint,
    changes jsonb,
    ip_address character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_operation_logs_type CHECK (((operation_type)::text = ANY ((ARRAY['create'::character varying, 'update'::character varying, 'delete'::character varying, 'login'::character varying, 'logout'::character varying, 'export'::character varying])::text[])))
);


ALTER TABLE public.operation_logs OWNER TO admin;

--
-- Name: TABLE operation_logs; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.operation_logs IS '操作ログ(監査証跡)';


--
-- Name: COLUMN operation_logs.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.operation_logs.id IS 'ログID(主キー)';


--
-- Name: COLUMN operation_logs.user_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.operation_logs.user_id IS 'ユーザーID(外部キー)';


--
-- Name: COLUMN operation_logs.operation_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.operation_logs.operation_type IS '操作種別(create/update/delete/login/logout/export)';


--
-- Name: COLUMN operation_logs.target_table; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.operation_logs.target_table IS '対象テーブル名';


--
-- Name: COLUMN operation_logs.target_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.operation_logs.target_id IS '対象レコードID';


--
-- Name: COLUMN operation_logs.changes; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.operation_logs.changes IS '変更内容(JSON)';


--
-- Name: COLUMN operation_logs.ip_address; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.operation_logs.ip_address IS 'IPアドレス';


--
-- Name: operation_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.operation_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.operation_logs_id_seq OWNER TO admin;

--
-- Name: operation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.operation_logs_id_seq OWNED BY public.operation_logs.id;


--
-- Name: order_lines; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.order_lines (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    product_id bigint NOT NULL,
    delivery_date date NOT NULL,
    order_quantity numeric(15,3) NOT NULL,
    unit character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    delivery_place_id bigint NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    CONSTRAINT chk_order_lines_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'allocated'::character varying, 'shipped'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.order_lines OWNER TO admin;

--
-- Name: TABLE order_lines; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.order_lines IS '受注明細';


--
-- Name: COLUMN order_lines.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_lines.id IS '受注明細ID(主キー)';


--
-- Name: COLUMN order_lines.order_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_lines.order_id IS '受注ID(外部キー)';


--
-- Name: COLUMN order_lines.product_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_lines.product_id IS '製品ID(外部キー)';


--
-- Name: COLUMN order_lines.delivery_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_lines.delivery_date IS '納入日';


--
-- Name: COLUMN order_lines.order_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_lines.order_quantity IS '受注数量';


--
-- Name: COLUMN order_lines.unit; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_lines.unit IS '単位';


--
-- Name: order_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.order_lines_id_seq
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
    id bigint NOT NULL,
    order_number character varying(50) NOT NULL,
    customer_id bigint NOT NULL,
    order_date date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.orders OWNER TO admin;

--
-- Name: TABLE orders; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.orders IS '受注ヘッダ';


--
-- Name: COLUMN orders.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.orders.id IS '受注ID(主キー)';


--
-- Name: COLUMN orders.order_number; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.orders.order_number IS '受注番号(一意)';


--
-- Name: COLUMN orders.customer_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.orders.customer_id IS '得意先ID(外部キー)';


--
-- Name: COLUMN orders.order_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.orders.order_date IS '受注日';


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.orders_id_seq
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
-- Name: products; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.products (
    id bigint NOT NULL,
    maker_part_code character varying(100) NOT NULL,
    product_name character varying(200) NOT NULL,
    base_unit character varying(20) NOT NULL,
    consumption_limit_days integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.products OWNER TO admin;

--
-- Name: TABLE products; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.products IS '製品マスタ';


--
-- Name: COLUMN products.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.products.id IS '製品ID(主キー)';


--
-- Name: COLUMN products.maker_part_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.products.maker_part_code IS 'メーカー品番(一意)';


--
-- Name: COLUMN products.product_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.products.product_name IS '製品名';


--
-- Name: COLUMN products.base_unit; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.products.base_unit IS '社内在庫単位(個/箱/kg等)';


--
-- Name: COLUMN products.consumption_limit_days; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.products.consumption_limit_days IS '消費期限日数';


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.products_id_seq
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
-- Name: roles; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    role_code character varying(50) NOT NULL,
    role_name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.roles OWNER TO admin;

--
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.roles IS 'ロールマスタ';


--
-- Name: COLUMN roles.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.roles.id IS 'ロールID(主キー)';


--
-- Name: COLUMN roles.role_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.roles.role_code IS 'ロールコード(一意)';


--
-- Name: COLUMN roles.role_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.roles.role_name IS 'ロール名';


--
-- Name: COLUMN roles.description; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.roles.description IS '説明';


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.roles_id_seq OWNER TO admin;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: stock_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.stock_history (
    id bigint NOT NULL,
    lot_id bigint NOT NULL,
    transaction_type character varying(20) NOT NULL,
    quantity_change numeric(15,3) NOT NULL,
    quantity_after numeric(15,3) NOT NULL,
    reference_type character varying(50),
    reference_id bigint,
    transaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_stock_history_type CHECK (((transaction_type)::text = ANY ((ARRAY['inbound'::character varying, 'allocation'::character varying, 'shipment'::character varying, 'adjustment'::character varying, 'return'::character varying])::text[])))
);


ALTER TABLE public.stock_history OWNER TO admin;

--
-- Name: TABLE stock_history; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.stock_history IS '在庫履歴(すべての在庫変動を記録)';


--
-- Name: COLUMN stock_history.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.stock_history.id IS '履歴ID(主キー)';


--
-- Name: COLUMN stock_history.lot_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.stock_history.lot_id IS 'ロットID(外部キー)';


--
-- Name: COLUMN stock_history.transaction_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.stock_history.transaction_type IS 'トランザクション種別(inbound/allocation/shipment/adjustment/return)';


--
-- Name: COLUMN stock_history.quantity_change; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.stock_history.quantity_change IS '数量変動(+/-)';


--
-- Name: COLUMN stock_history.quantity_after; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.stock_history.quantity_after IS '変動後数量';


--
-- Name: COLUMN stock_history.reference_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.stock_history.reference_type IS '参照元種別(inbound_plan/order/allocation等)';


--
-- Name: COLUMN stock_history.reference_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.stock_history.reference_id IS '参照元ID';


--
-- Name: COLUMN stock_history.transaction_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.stock_history.transaction_date IS 'トランザクション日時';


--
-- Name: stock_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.stock_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.stock_history_id_seq OWNER TO admin;

--
-- Name: stock_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.stock_history_id_seq OWNED BY public.stock_history.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.suppliers (
    id bigint NOT NULL,
    supplier_code character varying(50) NOT NULL,
    supplier_name character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.suppliers OWNER TO admin;

--
-- Name: TABLE suppliers; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.suppliers IS '仕入先マスタ';


--
-- Name: COLUMN suppliers.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.suppliers.id IS '仕入先ID(主キー)';


--
-- Name: COLUMN suppliers.supplier_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.suppliers.supplier_code IS '仕入先コード(一意)';


--
-- Name: COLUMN suppliers.supplier_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.suppliers.supplier_name IS '仕入先名';


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.suppliers_id_seq
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
-- Name: system_configs; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.system_configs (
    id bigint NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.system_configs OWNER TO admin;

--
-- Name: TABLE system_configs; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.system_configs IS 'システム設定';


--
-- Name: COLUMN system_configs.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.system_configs.id IS '設定ID(主キー)';


--
-- Name: COLUMN system_configs.config_key; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.system_configs.config_key IS '設定キー(一意)';


--
-- Name: COLUMN system_configs.config_value; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.system_configs.config_value IS '設定値';


--
-- Name: COLUMN system_configs.description; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.system_configs.description IS '説明';


--
-- Name: system_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.system_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.system_configs_id_seq OWNER TO admin;

--
-- Name: system_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.system_configs_id_seq OWNED BY public.system_configs.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.user_roles (
    user_id bigint NOT NULL,
    role_id bigint NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_roles OWNER TO admin;

--
-- Name: TABLE user_roles; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.user_roles IS 'ユーザーロール関連';


--
-- Name: COLUMN user_roles.user_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.user_roles.user_id IS 'ユーザーID(主キー, 外部キー)';


--
-- Name: COLUMN user_roles.role_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.user_roles.role_id IS 'ロールID(主キー, 外部キー)';


--
-- Name: COLUMN user_roles.assigned_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.user_roles.assigned_at IS '割当日時';


--
-- Name: users; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    display_name character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.users IS 'ユーザーマスタ';


--
-- Name: COLUMN users.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.users.id IS 'ユーザーID(主キー)';


--
-- Name: COLUMN users.username; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.users.username IS 'ユーザー名(一意)';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.users.email IS 'メールアドレス(一意)';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.users.password_hash IS 'パスワードハッシュ';


--
-- Name: COLUMN users.display_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.users.display_name IS '表示名';


--
-- Name: COLUMN users.is_active; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.users.is_active IS '有効フラグ';


--
-- Name: COLUMN users.last_login_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.users.last_login_at IS '最終ログイン日時';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO admin;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


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
 SELECT DISTINCT f.id AS forecast_id,
    f.customer_id,
    f.product_id,
    o.id AS order_id,
    ol.delivery_place_id
   FROM ((public.forecast_current f
     JOIN public.orders o ON ((o.customer_id = f.customer_id)))
     JOIN public.order_lines ol ON (((ol.order_id = o.id) AND (ol.product_id = f.product_id))));


ALTER TABLE public.v_forecast_order_pairs OWNER TO admin;

--
-- Name: v_inventory_summary; Type: VIEW; Schema: public; Owner: admin
--

CREATE VIEW public.v_inventory_summary AS
 SELECT l.product_id,
    l.warehouse_id,
    sum(l.current_quantity) AS total_quantity,
    sum(l.allocated_quantity) AS allocated_quantity,
    (sum(l.current_quantity) - sum(l.allocated_quantity)) AS available_quantity,
    max(l.updated_at) AS last_updated
   FROM public.lots l
  WHERE ((l.status)::text = 'active'::text)
  GROUP BY l.product_id, l.warehouse_id;


ALTER TABLE public.v_inventory_summary OWNER TO admin;

--
-- Name: VIEW v_inventory_summary; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON VIEW public.v_inventory_summary IS '在庫集計ビュー - 商品・倉庫ごとの在庫総数、引当済数、有効在庫数を集計';


--
-- Name: v_lot_available_qty; Type: VIEW; Schema: public; Owner: admin
--

CREATE VIEW public.v_lot_available_qty AS
 SELECT l.id AS lot_id,
    l.product_id,
    l.warehouse_id,
    (l.current_quantity - l.allocated_quantity) AS available_qty,
    l.received_date AS receipt_date,
    l.expiry_date,
    l.status AS lot_status
   FROM public.lots l
  WHERE (((l.status)::text = 'active'::text) AND ((l.expiry_date IS NULL) OR (l.expiry_date >= CURRENT_DATE)) AND ((l.current_quantity - l.allocated_quantity) > (0)::numeric));


ALTER TABLE public.v_lot_available_qty OWNER TO admin;

--
-- Name: v_lot_current_stock; Type: VIEW; Schema: public; Owner: admin
--

CREATE VIEW public.v_lot_current_stock AS
 SELECT l.id AS lot_id,
    l.product_id,
    l.warehouse_id,
    l.current_quantity,
    l.updated_at AS last_updated
   FROM public.lots l
  WHERE (l.current_quantity > (0)::numeric);


ALTER TABLE public.v_lot_current_stock OWNER TO admin;

--
-- Name: v_order_line_context; Type: VIEW; Schema: public; Owner: admin
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


ALTER TABLE public.v_order_line_context OWNER TO admin;

--
-- Name: v_product_code_to_id; Type: VIEW; Schema: public; Owner: admin
--

CREATE VIEW public.v_product_code_to_id AS
 SELECT p.maker_part_code AS product_code,
    p.id AS product_id,
    p.product_name
   FROM public.products p;


ALTER TABLE public.v_product_code_to_id OWNER TO admin;

--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.warehouses (
    id bigint NOT NULL,
    warehouse_code character varying(50) NOT NULL,
    warehouse_name character varying(200) NOT NULL,
    warehouse_type character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_warehouse_type CHECK (((warehouse_type)::text = ANY ((ARRAY['internal'::character varying, 'external'::character varying, 'supplier'::character varying])::text[])))
);


ALTER TABLE public.warehouses OWNER TO admin;

--
-- Name: TABLE warehouses; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.warehouses IS '倉庫マスタ';


--
-- Name: COLUMN warehouses.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.warehouses.id IS '倉庫ID(主キー)';


--
-- Name: COLUMN warehouses.warehouse_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.warehouses.warehouse_code IS '倉庫コード(一意)';


--
-- Name: COLUMN warehouses.warehouse_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.warehouses.warehouse_name IS '倉庫名';


--
-- Name: COLUMN warehouses.warehouse_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.warehouses.warehouse_type IS '倉庫種別(internal/external/supplier)';


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
-- Name: adjustments id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.adjustments ALTER COLUMN id SET DEFAULT nextval('public.adjustments_id_seq'::regclass);


--
-- Name: allocation_suggestions id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.allocation_suggestions ALTER COLUMN id SET DEFAULT nextval('public.allocation_suggestions_id_seq'::regclass);


--
-- Name: allocations id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.allocations ALTER COLUMN id SET DEFAULT nextval('public.allocations_id_seq'::regclass);


--
-- Name: batch_jobs id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_jobs ALTER COLUMN id SET DEFAULT nextval('public.batch_jobs_id_seq'::regclass);


--
-- Name: business_rules id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.business_rules ALTER COLUMN id SET DEFAULT nextval('public.business_rules_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: delivery_places id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.delivery_places ALTER COLUMN id SET DEFAULT nextval('public.delivery_places_id_seq'::regclass);


--
-- Name: expected_lots id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expected_lots ALTER COLUMN id SET DEFAULT nextval('public.expected_lots_id_seq'::regclass);


--
-- Name: forecast_current id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecast_current ALTER COLUMN id SET DEFAULT nextval('public.forecast_current_id_seq'::regclass);


--
-- Name: forecast_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecast_history ALTER COLUMN id SET DEFAULT nextval('public.forecast_history_id_seq'::regclass);


--
-- Name: inbound_plan_lines id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inbound_plan_lines ALTER COLUMN id SET DEFAULT nextval('public.inbound_plan_lines_id_seq'::regclass);


--
-- Name: inbound_plans id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inbound_plans ALTER COLUMN id SET DEFAULT nextval('public.inbound_plans_id_seq'::regclass);


--
-- Name: lots id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots ALTER COLUMN id SET DEFAULT nextval('public.lots_id_seq'::regclass);


--
-- Name: master_change_logs id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.master_change_logs ALTER COLUMN id SET DEFAULT nextval('public.master_change_logs_id_seq'::regclass);


--
-- Name: operation_logs id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.operation_logs ALTER COLUMN id SET DEFAULT nextval('public.operation_logs_id_seq'::regclass);


--
-- Name: order_lines id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines ALTER COLUMN id SET DEFAULT nextval('public.order_lines_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: stock_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_history ALTER COLUMN id SET DEFAULT nextval('public.stock_history_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: system_configs id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.system_configs ALTER COLUMN id SET DEFAULT nextval('public.system_configs_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Name: adjustments adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.adjustments
    ADD CONSTRAINT adjustments_pkey PRIMARY KEY (id);


--
-- Name: allocation_suggestions allocation_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT allocation_suggestions_pkey PRIMARY KEY (id);


--
-- Name: allocations allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_pkey PRIMARY KEY (id);


--
-- Name: batch_jobs batch_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.batch_jobs
    ADD CONSTRAINT batch_jobs_pkey PRIMARY KEY (id);


--
-- Name: business_rules business_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.business_rules
    ADD CONSTRAINT business_rules_pkey PRIMARY KEY (id);


--
-- Name: business_rules business_rules_rule_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.business_rules
    ADD CONSTRAINT business_rules_rule_code_key UNIQUE (rule_code);


--
-- Name: customer_items customer_items_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.customer_items
    ADD CONSTRAINT customer_items_pkey PRIMARY KEY (customer_id, external_product_code);


--
-- Name: customers customers_customer_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_customer_code_key UNIQUE (customer_code);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: delivery_places delivery_places_delivery_place_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.delivery_places
    ADD CONSTRAINT delivery_places_delivery_place_code_key UNIQUE (delivery_place_code);


--
-- Name: delivery_places delivery_places_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.delivery_places
    ADD CONSTRAINT delivery_places_pkey PRIMARY KEY (id);


--
-- Name: expected_lots expected_lots_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expected_lots
    ADD CONSTRAINT expected_lots_pkey PRIMARY KEY (id);


--
-- Name: forecast_current forecast_current_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecast_current
    ADD CONSTRAINT forecast_current_pkey PRIMARY KEY (id);


--
-- Name: forecast_history forecast_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecast_history
    ADD CONSTRAINT forecast_history_pkey PRIMARY KEY (id);


--
-- Name: inbound_plan_lines inbound_plan_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inbound_plan_lines
    ADD CONSTRAINT inbound_plan_lines_pkey PRIMARY KEY (id);


--
-- Name: inbound_plans inbound_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inbound_plans
    ADD CONSTRAINT inbound_plans_pkey PRIMARY KEY (id);


--
-- Name: inbound_plans inbound_plans_plan_number_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inbound_plans
    ADD CONSTRAINT inbound_plans_plan_number_key UNIQUE (plan_number);


--
-- Name: lots lots_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_pkey PRIMARY KEY (id);


--
-- Name: master_change_logs master_change_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.master_change_logs
    ADD CONSTRAINT master_change_logs_pkey PRIMARY KEY (id);


--
-- Name: operation_logs operation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.operation_logs
    ADD CONSTRAINT operation_logs_pkey PRIMARY KEY (id);


--
-- Name: order_lines order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_maker_part_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_maker_part_code_key UNIQUE (maker_part_code);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: roles roles_role_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_code_key UNIQUE (role_code);


--
-- Name: stock_history stock_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_history
    ADD CONSTRAINT stock_history_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_supplier_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_supplier_code_key UNIQUE (supplier_code);


--
-- Name: system_configs system_configs_config_key_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_config_key_key UNIQUE (config_key);


--
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- Name: lots uq_lots_number_product_warehouse; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT uq_lots_number_product_warehouse UNIQUE (lot_number, product_id, warehouse_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_warehouse_code_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_warehouse_code_key UNIQUE (warehouse_code);


--
-- Name: idx_adjustments_date; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_adjustments_date ON public.adjustments USING btree (adjusted_at);


--
-- Name: idx_adjustments_lot; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_adjustments_lot ON public.adjustments USING btree (lot_id);


--
-- Name: idx_allocation_suggestions_forecast; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_allocation_suggestions_forecast ON public.allocation_suggestions USING btree (forecast_line_id);


--
-- Name: idx_allocation_suggestions_lot; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_allocation_suggestions_lot ON public.allocation_suggestions USING btree (lot_id);


--
-- Name: idx_allocations_lot; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_allocations_lot ON public.allocations USING btree (lot_id);


--
-- Name: idx_allocations_order_line; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_allocations_order_line ON public.allocations USING btree (order_line_id);


--
-- Name: idx_allocations_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_allocations_status ON public.allocations USING btree (status);


--
-- Name: idx_batch_jobs_created; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_batch_jobs_created ON public.batch_jobs USING btree (created_at);


--
-- Name: idx_batch_jobs_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_batch_jobs_status ON public.batch_jobs USING btree (status);


--
-- Name: idx_batch_jobs_type; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_batch_jobs_type ON public.batch_jobs USING btree (job_type);


--
-- Name: idx_business_rules_active; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_business_rules_active ON public.business_rules USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_business_rules_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_business_rules_code ON public.business_rules USING btree (rule_code);


--
-- Name: idx_business_rules_type; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_business_rules_type ON public.business_rules USING btree (rule_type);


--
-- Name: idx_customer_items_product; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_customer_items_product ON public.customer_items USING btree (product_id);


--
-- Name: idx_customer_items_supplier; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_customer_items_supplier ON public.customer_items USING btree (supplier_id);


--
-- Name: idx_customers_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_customers_code ON public.customers USING btree (customer_code);


--
-- Name: idx_delivery_places_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_delivery_places_code ON public.delivery_places USING btree (delivery_place_code);


--
-- Name: idx_delivery_places_customer; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_delivery_places_customer ON public.delivery_places USING btree (customer_id);


--
-- Name: idx_expected_lots_line; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_expected_lots_line ON public.expected_lots USING btree (inbound_plan_line_id);


--
-- Name: idx_expected_lots_number; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_expected_lots_number ON public.expected_lots USING btree (expected_lot_number);


--
-- Name: idx_inbound_plan_lines_plan; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_inbound_plan_lines_plan ON public.inbound_plan_lines USING btree (inbound_plan_id);


--
-- Name: idx_inbound_plan_lines_product; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_inbound_plan_lines_product ON public.inbound_plan_lines USING btree (product_id);


--
-- Name: idx_inbound_plans_date; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_inbound_plans_date ON public.inbound_plans USING btree (planned_arrival_date);


--
-- Name: idx_inbound_plans_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_inbound_plans_status ON public.inbound_plans USING btree (status);


--
-- Name: idx_inbound_plans_supplier; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_inbound_plans_supplier ON public.inbound_plans USING btree (supplier_id);


--
-- Name: idx_lots_expiry_date; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_lots_expiry_date ON public.lots USING btree (expiry_date) WHERE (expiry_date IS NOT NULL);


--
-- Name: idx_lots_number; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_lots_number ON public.lots USING btree (lot_number);


--
-- Name: idx_lots_product_warehouse; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_lots_product_warehouse ON public.lots USING btree (product_id, warehouse_id);


--
-- Name: idx_lots_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_lots_status ON public.lots USING btree (status);


--
-- Name: idx_lots_supplier; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_lots_supplier ON public.lots USING btree (supplier_id);


--
-- Name: idx_lots_warehouse; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_lots_warehouse ON public.lots USING btree (warehouse_id);


--
-- Name: idx_master_change_logs_changed; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_master_change_logs_changed ON public.master_change_logs USING btree (changed_at);


--
-- Name: idx_master_change_logs_record; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_master_change_logs_record ON public.master_change_logs USING btree (record_id);


--
-- Name: idx_master_change_logs_table; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_master_change_logs_table ON public.master_change_logs USING btree (table_name);


--
-- Name: idx_master_change_logs_user; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_master_change_logs_user ON public.master_change_logs USING btree (changed_by);


--
-- Name: idx_operation_logs_created; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_operation_logs_created ON public.operation_logs USING btree (created_at);


--
-- Name: idx_operation_logs_table; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_operation_logs_table ON public.operation_logs USING btree (target_table);


--
-- Name: idx_operation_logs_type; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_operation_logs_type ON public.operation_logs USING btree (operation_type);


--
-- Name: idx_operation_logs_user; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_operation_logs_user ON public.operation_logs USING btree (user_id);


--
-- Name: idx_order_lines_date; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_order_lines_date ON public.order_lines USING btree (delivery_date);


--
-- Name: idx_order_lines_delivery_place; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_order_lines_delivery_place ON public.order_lines USING btree (delivery_place_id);


--
-- Name: idx_order_lines_order; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_order_lines_order ON public.order_lines USING btree (order_id);


--
-- Name: idx_order_lines_product; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_order_lines_product ON public.order_lines USING btree (product_id);


--
-- Name: idx_order_lines_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_order_lines_status ON public.order_lines USING btree (status);


--
-- Name: idx_orders_customer; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_orders_customer ON public.orders USING btree (customer_id);


--
-- Name: idx_orders_date; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_orders_date ON public.orders USING btree (order_date);


--
-- Name: idx_products_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_products_code ON public.products USING btree (maker_part_code);


--
-- Name: idx_products_name; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_products_name ON public.products USING btree (product_name);


--
-- Name: idx_roles_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_roles_code ON public.roles USING btree (role_code);


--
-- Name: idx_stock_history_date; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_stock_history_date ON public.stock_history USING btree (transaction_date);


--
-- Name: idx_stock_history_lot; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_stock_history_lot ON public.stock_history USING btree (lot_id);


--
-- Name: idx_stock_history_type; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_stock_history_type ON public.stock_history USING btree (transaction_type);


--
-- Name: idx_suppliers_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_suppliers_code ON public.suppliers USING btree (supplier_code);


--
-- Name: idx_system_configs_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_system_configs_key ON public.system_configs USING btree (config_key);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_users_active ON public.users USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: idx_warehouses_code; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_warehouses_code ON public.warehouses USING btree (warehouse_code);


--
-- Name: idx_warehouses_type; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_warehouses_type ON public.warehouses USING btree (warehouse_type);


--
-- Name: ix_forecast_current_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_forecast_current_key ON public.forecast_current USING btree (customer_id, delivery_place_id, product_id);


--
-- Name: ix_forecast_history_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_forecast_history_key ON public.forecast_history USING btree (customer_id, delivery_place_id, product_id);


--
-- Name: ux_forecast_current_unique; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX ux_forecast_current_unique ON public.forecast_current USING btree (customer_id, delivery_place_id, product_id, forecast_date);


--
-- Name: adjustments fk_adjustments_lot; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.adjustments
    ADD CONSTRAINT fk_adjustments_lot FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE RESTRICT;


--
-- Name: adjustments fk_adjustments_user; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.adjustments
    ADD CONSTRAINT fk_adjustments_user FOREIGN KEY (adjusted_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: allocation_suggestions fk_allocation_suggestions_forecast_current; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT fk_allocation_suggestions_forecast_current FOREIGN KEY (forecast_line_id) REFERENCES public.forecast_current(id) ON DELETE CASCADE;


--
-- Name: allocation_suggestions fk_allocation_suggestions_lot; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT fk_allocation_suggestions_lot FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: allocations fk_allocations_lot; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT fk_allocations_lot FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE RESTRICT;


--
-- Name: allocations fk_allocations_order_line; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT fk_allocations_order_line FOREIGN KEY (order_line_id) REFERENCES public.order_lines(id) ON DELETE CASCADE;


--
-- Name: customer_items fk_customer_items_customer; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.customer_items
    ADD CONSTRAINT fk_customer_items_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_items fk_customer_items_product; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.customer_items
    ADD CONSTRAINT fk_customer_items_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: customer_items fk_customer_items_supplier; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.customer_items
    ADD CONSTRAINT fk_customer_items_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: delivery_places fk_delivery_places_customer; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.delivery_places
    ADD CONSTRAINT fk_delivery_places_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: expected_lots fk_expected_lots_line; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expected_lots
    ADD CONSTRAINT fk_expected_lots_line FOREIGN KEY (inbound_plan_line_id) REFERENCES public.inbound_plan_lines(id) ON DELETE CASCADE;


--
-- Name: forecast_current fk_forecast_current_customer; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecast_current
    ADD CONSTRAINT fk_forecast_current_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: forecast_current fk_forecast_current_delivery_place; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecast_current
    ADD CONSTRAINT fk_forecast_current_delivery_place FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE RESTRICT;


--
-- Name: forecast_current fk_forecast_current_product; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecast_current
    ADD CONSTRAINT fk_forecast_current_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: forecast_history fk_forecast_history_customer; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecast_history
    ADD CONSTRAINT fk_forecast_history_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: forecast_history fk_forecast_history_delivery_place; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecast_history
    ADD CONSTRAINT fk_forecast_history_delivery_place FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE RESTRICT;


--
-- Name: forecast_history fk_forecast_history_product; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.forecast_history
    ADD CONSTRAINT fk_forecast_history_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: inbound_plan_lines fk_inbound_plan_lines_plan; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inbound_plan_lines
    ADD CONSTRAINT fk_inbound_plan_lines_plan FOREIGN KEY (inbound_plan_id) REFERENCES public.inbound_plans(id) ON DELETE CASCADE;


--
-- Name: inbound_plan_lines fk_inbound_plan_lines_product; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inbound_plan_lines
    ADD CONSTRAINT fk_inbound_plan_lines_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: inbound_plans fk_inbound_plans_supplier; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inbound_plans
    ADD CONSTRAINT fk_inbound_plans_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: lots fk_lots_expected; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT fk_lots_expected FOREIGN KEY (expected_lot_id) REFERENCES public.expected_lots(id) ON DELETE SET NULL;


--
-- Name: lots fk_lots_product; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT fk_lots_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: lots fk_lots_supplier; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT fk_lots_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: lots fk_lots_warehouse; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT fk_lots_warehouse FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;


--
-- Name: master_change_logs fk_master_change_logs_user; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.master_change_logs
    ADD CONSTRAINT fk_master_change_logs_user FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: operation_logs fk_operation_logs_user; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.operation_logs
    ADD CONSTRAINT fk_operation_logs_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: order_lines fk_order_lines_delivery_place; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT fk_order_lines_delivery_place FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE RESTRICT;


--
-- Name: order_lines fk_order_lines_order; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT fk_order_lines_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


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
-- Name: stock_history fk_stock_history_lot; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.stock_history
    ADD CONSTRAINT fk_stock_history_lot FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: user_roles fk_user_roles_role; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles fk_user_roles_user; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: admin
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict QyQ2YDYugGrYwEvJgYthCpQK0vS8dX03J87KVaZe7sbwfz9zQ9eFY8oXimli3dB

