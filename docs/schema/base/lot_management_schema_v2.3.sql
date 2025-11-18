--
-- PostgreSQL database dump
--

\restrict hdZn6NiwXMYQy8yOKdLn1qbI2I3ldAu949k0nCJNGfKLUdKaTpD493iqyHnmwen

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: adjustments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.adjustments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.adjustments_id_seq OWNED BY public.adjustments.id;


--
-- Name: allocation_suggestions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: allocation_suggestions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.allocation_suggestions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: allocation_suggestions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.allocation_suggestions_id_seq OWNED BY public.allocation_suggestions.id;


--
-- Name: allocations; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.allocations_id_seq
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
-- Name: batch_jobs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: batch_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.batch_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: batch_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.batch_jobs_id_seq OWNED BY public.batch_jobs.id;


--
-- Name: business_rules; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: business_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.business_rules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: business_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.business_rules_id_seq OWNED BY public.business_rules.id;


--
-- Name: customer_items; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id bigint NOT NULL,
    customer_code character varying(50) NOT NULL,
    customer_name character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_id_seq
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
    id bigint NOT NULL,
    jiku_code character varying(50),
    delivery_place_code character varying(50) NOT NULL,
    delivery_place_name character varying(200) NOT NULL,
    customer_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


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
-- Name: expected_lots; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: expected_lots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expected_lots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expected_lots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expected_lots_id_seq OWNED BY public.expected_lots.id;


--
-- Name: forecast_headers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forecast_headers (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    delivery_place_id bigint NOT NULL,
    forecast_number character varying(50) NOT NULL,
    forecast_start_date date NOT NULL,
    forecast_end_date date NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_forecast_headers_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: forecast_headers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forecast_headers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forecast_headers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forecast_headers_id_seq OWNED BY public.forecast_headers.id;


--
-- Name: forecast_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forecast_lines (
    id bigint NOT NULL,
    forecast_id bigint NOT NULL,
    product_id bigint NOT NULL,
    delivery_date date NOT NULL,
    forecast_quantity numeric(15,3) NOT NULL,
    unit character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: forecast_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forecast_lines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forecast_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forecast_lines_id_seq OWNED BY public.forecast_lines.id;


--
-- Name: inbound_plan_lines; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: inbound_plan_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inbound_plan_lines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inbound_plan_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inbound_plan_lines_id_seq OWNED BY public.inbound_plan_lines.id;


--
-- Name: inbound_plans; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: inbound_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inbound_plans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inbound_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inbound_plans_id_seq OWNED BY public.inbound_plans.id;


--
-- Name: lots; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: lots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lots_id_seq
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
-- Name: master_change_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: master_change_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.master_change_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: master_change_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.master_change_logs_id_seq OWNED BY public.master_change_logs.id;


--
-- Name: operation_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: operation_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operation_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: operation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operation_logs_id_seq OWNED BY public.operation_logs.id;


--
-- Name: order_lines; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: order_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_lines_id_seq
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
    id bigint NOT NULL,
    order_number character varying(50) NOT NULL,
    customer_id bigint NOT NULL,
    order_date date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
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
-- Name: products; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
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
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    role_code character varying(50) NOT NULL,
    role_name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: stock_history; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: stock_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_history_id_seq OWNED BY public.stock_history.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id bigint NOT NULL,
    supplier_code character varying(50) NOT NULL,
    supplier_name character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_id_seq
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
-- Name: system_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_configs (
    id bigint NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: system_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_configs_id_seq OWNED BY public.system_configs.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_id bigint NOT NULL,
    role_id bigint NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: -
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
-- Name: adjustments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adjustments ALTER COLUMN id SET DEFAULT nextval('public.adjustments_id_seq'::regclass);


--
-- Name: allocation_suggestions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions ALTER COLUMN id SET DEFAULT nextval('public.allocation_suggestions_id_seq'::regclass);


--
-- Name: allocations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations ALTER COLUMN id SET DEFAULT nextval('public.allocations_id_seq'::regclass);


--
-- Name: batch_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_jobs ALTER COLUMN id SET DEFAULT nextval('public.batch_jobs_id_seq'::regclass);


--
-- Name: business_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_rules ALTER COLUMN id SET DEFAULT nextval('public.business_rules_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: delivery_places id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_places ALTER COLUMN id SET DEFAULT nextval('public.delivery_places_id_seq'::regclass);


--
-- Name: expected_lots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expected_lots ALTER COLUMN id SET DEFAULT nextval('public.expected_lots_id_seq'::regclass);


--
-- Name: forecast_headers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_headers ALTER COLUMN id SET DEFAULT nextval('public.forecast_headers_id_seq'::regclass);


--
-- Name: forecast_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_lines ALTER COLUMN id SET DEFAULT nextval('public.forecast_lines_id_seq'::regclass);


--
-- Name: inbound_plan_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plan_lines ALTER COLUMN id SET DEFAULT nextval('public.inbound_plan_lines_id_seq'::regclass);


--
-- Name: inbound_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plans ALTER COLUMN id SET DEFAULT nextval('public.inbound_plans_id_seq'::regclass);


--
-- Name: lots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots ALTER COLUMN id SET DEFAULT nextval('public.lots_id_seq'::regclass);


--
-- Name: master_change_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_change_logs ALTER COLUMN id SET DEFAULT nextval('public.master_change_logs_id_seq'::regclass);


--
-- Name: operation_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_logs ALTER COLUMN id SET DEFAULT nextval('public.operation_logs_id_seq'::regclass);


--
-- Name: order_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines ALTER COLUMN id SET DEFAULT nextval('public.order_lines_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: stock_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_history ALTER COLUMN id SET DEFAULT nextval('public.stock_history_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: system_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs ALTER COLUMN id SET DEFAULT nextval('public.system_configs_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Name: adjustments adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adjustments
    ADD CONSTRAINT adjustments_pkey PRIMARY KEY (id);


--
-- Name: allocation_suggestions allocation_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT allocation_suggestions_pkey PRIMARY KEY (id);


--
-- Name: allocations allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT allocations_pkey PRIMARY KEY (id);


--
-- Name: batch_jobs batch_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_jobs
    ADD CONSTRAINT batch_jobs_pkey PRIMARY KEY (id);


--
-- Name: business_rules business_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_rules
    ADD CONSTRAINT business_rules_pkey PRIMARY KEY (id);


--
-- Name: business_rules business_rules_rule_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_rules
    ADD CONSTRAINT business_rules_rule_code_key UNIQUE (rule_code);


--
-- Name: customer_items customer_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_items
    ADD CONSTRAINT customer_items_pkey PRIMARY KEY (customer_id, external_product_code);


--
-- Name: customers customers_customer_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_customer_code_key UNIQUE (customer_code);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: delivery_places delivery_places_delivery_place_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_places
    ADD CONSTRAINT delivery_places_delivery_place_code_key UNIQUE (delivery_place_code);


--
-- Name: delivery_places delivery_places_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_places
    ADD CONSTRAINT delivery_places_pkey PRIMARY KEY (id);


--
-- Name: expected_lots expected_lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expected_lots
    ADD CONSTRAINT expected_lots_pkey PRIMARY KEY (id);


--
-- Name: forecast_headers forecast_headers_forecast_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_headers
    ADD CONSTRAINT forecast_headers_forecast_number_key UNIQUE (forecast_number);


--
-- Name: forecast_headers forecast_headers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_headers
    ADD CONSTRAINT forecast_headers_pkey PRIMARY KEY (id);


--
-- Name: forecast_lines forecast_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_lines
    ADD CONSTRAINT forecast_lines_pkey PRIMARY KEY (id);


--
-- Name: inbound_plan_lines inbound_plan_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plan_lines
    ADD CONSTRAINT inbound_plan_lines_pkey PRIMARY KEY (id);


--
-- Name: inbound_plans inbound_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plans
    ADD CONSTRAINT inbound_plans_pkey PRIMARY KEY (id);


--
-- Name: inbound_plans inbound_plans_plan_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plans
    ADD CONSTRAINT inbound_plans_plan_number_key UNIQUE (plan_number);


--
-- Name: lots lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_pkey PRIMARY KEY (id);


--
-- Name: master_change_logs master_change_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_change_logs
    ADD CONSTRAINT master_change_logs_pkey PRIMARY KEY (id);


--
-- Name: operation_logs operation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_logs
    ADD CONSTRAINT operation_logs_pkey PRIMARY KEY (id);


--
-- Name: order_lines order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_maker_part_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_maker_part_code_key UNIQUE (maker_part_code);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: roles roles_role_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_code_key UNIQUE (role_code);


--
-- Name: stock_history stock_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_history
    ADD CONSTRAINT stock_history_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_supplier_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_supplier_code_key UNIQUE (supplier_code);


--
-- Name: system_configs system_configs_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_config_key_key UNIQUE (config_key);


--
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- Name: lots uq_lots_number_product_warehouse; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT uq_lots_number_product_warehouse UNIQUE (lot_number, product_id, warehouse_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_warehouse_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_warehouse_code_key UNIQUE (warehouse_code);


--
-- Name: idx_adjustments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adjustments_date ON public.adjustments USING btree (adjusted_at);


--
-- Name: idx_adjustments_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adjustments_lot ON public.adjustments USING btree (lot_id);


--
-- Name: idx_allocation_suggestions_forecast; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_suggestions_forecast ON public.allocation_suggestions USING btree (forecast_line_id);


--
-- Name: idx_allocation_suggestions_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_suggestions_lot ON public.allocation_suggestions USING btree (lot_id);


--
-- Name: idx_allocations_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocations_lot ON public.allocations USING btree (lot_id);


--
-- Name: idx_allocations_order_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocations_order_line ON public.allocations USING btree (order_line_id);


--
-- Name: idx_allocations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocations_status ON public.allocations USING btree (status);


--
-- Name: idx_batch_jobs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_batch_jobs_created ON public.batch_jobs USING btree (created_at);


--
-- Name: idx_batch_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_batch_jobs_status ON public.batch_jobs USING btree (status);


--
-- Name: idx_batch_jobs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_batch_jobs_type ON public.batch_jobs USING btree (job_type);


--
-- Name: idx_business_rules_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_rules_active ON public.business_rules USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_business_rules_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_rules_code ON public.business_rules USING btree (rule_code);


--
-- Name: idx_business_rules_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_rules_type ON public.business_rules USING btree (rule_type);


--
-- Name: idx_customer_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_items_product ON public.customer_items USING btree (product_id);


--
-- Name: idx_customer_items_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_items_supplier ON public.customer_items USING btree (supplier_id);


--
-- Name: idx_customers_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_code ON public.customers USING btree (customer_code);


--
-- Name: idx_delivery_places_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_places_code ON public.delivery_places USING btree (delivery_place_code);


--
-- Name: idx_delivery_places_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_places_customer ON public.delivery_places USING btree (customer_id);


--
-- Name: idx_expected_lots_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expected_lots_line ON public.expected_lots USING btree (inbound_plan_line_id);


--
-- Name: idx_expected_lots_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expected_lots_number ON public.expected_lots USING btree (expected_lot_number);


--
-- Name: idx_forecast_headers_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forecast_headers_customer ON public.forecast_headers USING btree (customer_id);


--
-- Name: idx_forecast_headers_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forecast_headers_dates ON public.forecast_headers USING btree (forecast_start_date, forecast_end_date);


--
-- Name: idx_forecast_headers_delivery_place; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forecast_headers_delivery_place ON public.forecast_headers USING btree (delivery_place_id);


--
-- Name: idx_forecast_lines_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forecast_lines_date ON public.forecast_lines USING btree (delivery_date);


--
-- Name: idx_forecast_lines_header; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forecast_lines_header ON public.forecast_lines USING btree (forecast_id);


--
-- Name: idx_forecast_lines_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forecast_lines_product ON public.forecast_lines USING btree (product_id);


--
-- Name: idx_inbound_plan_lines_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_plan_lines_plan ON public.inbound_plan_lines USING btree (inbound_plan_id);


--
-- Name: idx_inbound_plan_lines_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_plan_lines_product ON public.inbound_plan_lines USING btree (product_id);


--
-- Name: idx_inbound_plans_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_plans_date ON public.inbound_plans USING btree (planned_arrival_date);


--
-- Name: idx_inbound_plans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_plans_status ON public.inbound_plans USING btree (status);


--
-- Name: idx_inbound_plans_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_plans_supplier ON public.inbound_plans USING btree (supplier_id);


--
-- Name: idx_lots_expiry_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_expiry_date ON public.lots USING btree (expiry_date) WHERE (expiry_date IS NOT NULL);


--
-- Name: idx_lots_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_number ON public.lots USING btree (lot_number);


--
-- Name: idx_lots_product_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_product_warehouse ON public.lots USING btree (product_id, warehouse_id);


--
-- Name: idx_lots_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_status ON public.lots USING btree (status);


--
-- Name: idx_lots_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_supplier ON public.lots USING btree (supplier_id);


--
-- Name: idx_lots_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_warehouse ON public.lots USING btree (warehouse_id);


--
-- Name: idx_master_change_logs_changed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_change_logs_changed ON public.master_change_logs USING btree (changed_at);


--
-- Name: idx_master_change_logs_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_change_logs_record ON public.master_change_logs USING btree (record_id);


--
-- Name: idx_master_change_logs_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_change_logs_table ON public.master_change_logs USING btree (table_name);


--
-- Name: idx_master_change_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_change_logs_user ON public.master_change_logs USING btree (changed_by);


--
-- Name: idx_operation_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_logs_created ON public.operation_logs USING btree (created_at);


--
-- Name: idx_operation_logs_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_logs_table ON public.operation_logs USING btree (target_table);


--
-- Name: idx_operation_logs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_logs_type ON public.operation_logs USING btree (operation_type);


--
-- Name: idx_operation_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_logs_user ON public.operation_logs USING btree (user_id);


--
-- Name: idx_order_lines_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_date ON public.order_lines USING btree (delivery_date);


--
-- Name: idx_order_lines_delivery_place; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_delivery_place ON public.order_lines USING btree (delivery_place_id);


--
-- Name: idx_order_lines_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_order ON public.order_lines USING btree (order_id);


--
-- Name: idx_order_lines_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_product ON public.order_lines USING btree (product_id);


--
-- Name: idx_order_lines_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_status ON public.order_lines USING btree (status);


--
-- Name: idx_orders_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer ON public.orders USING btree (customer_id);


--
-- Name: idx_orders_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_date ON public.orders USING btree (order_date);


--
-- Name: idx_products_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_code ON public.products USING btree (maker_part_code);


--
-- Name: idx_products_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_name ON public.products USING btree (product_name);


--
-- Name: idx_roles_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roles_code ON public.roles USING btree (role_code);


--
-- Name: idx_stock_history_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_history_date ON public.stock_history USING btree (transaction_date);


--
-- Name: idx_stock_history_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_history_lot ON public.stock_history USING btree (lot_id);


--
-- Name: idx_stock_history_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_history_type ON public.stock_history USING btree (transaction_type);


--
-- Name: idx_suppliers_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_code ON public.suppliers USING btree (supplier_code);


--
-- Name: idx_system_configs_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_key ON public.system_configs USING btree (config_key);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_active ON public.users USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: idx_warehouses_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouses_code ON public.warehouses USING btree (warehouse_code);


--
-- Name: idx_warehouses_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouses_type ON public.warehouses USING btree (warehouse_type);


--
-- Name: adjustments fk_adjustments_lot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adjustments
    ADD CONSTRAINT fk_adjustments_lot FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE RESTRICT;


--
-- Name: adjustments fk_adjustments_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adjustments
    ADD CONSTRAINT fk_adjustments_user FOREIGN KEY (adjusted_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: allocation_suggestions fk_allocation_suggestions_forecast; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT fk_allocation_suggestions_forecast FOREIGN KEY (forecast_line_id) REFERENCES public.forecast_lines(id) ON DELETE CASCADE;


--
-- Name: allocation_suggestions fk_allocation_suggestions_lot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT fk_allocation_suggestions_lot FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: allocations fk_allocations_lot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT fk_allocations_lot FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE RESTRICT;


--
-- Name: allocations fk_allocations_order_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT fk_allocations_order_line FOREIGN KEY (order_line_id) REFERENCES public.order_lines(id) ON DELETE CASCADE;


--
-- Name: customer_items fk_customer_items_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_items
    ADD CONSTRAINT fk_customer_items_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_items fk_customer_items_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_items
    ADD CONSTRAINT fk_customer_items_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: customer_items fk_customer_items_supplier; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_items
    ADD CONSTRAINT fk_customer_items_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: delivery_places fk_delivery_places_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_places
    ADD CONSTRAINT fk_delivery_places_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: expected_lots fk_expected_lots_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expected_lots
    ADD CONSTRAINT fk_expected_lots_line FOREIGN KEY (inbound_plan_line_id) REFERENCES public.inbound_plan_lines(id) ON DELETE CASCADE;


--
-- Name: forecast_headers fk_forecast_headers_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_headers
    ADD CONSTRAINT fk_forecast_headers_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: forecast_headers fk_forecast_headers_delivery_place; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_headers
    ADD CONSTRAINT fk_forecast_headers_delivery_place FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE RESTRICT;


--
-- Name: forecast_lines fk_forecast_lines_header; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_lines
    ADD CONSTRAINT fk_forecast_lines_header FOREIGN KEY (forecast_id) REFERENCES public.forecast_headers(id) ON DELETE CASCADE;


--
-- Name: forecast_lines fk_forecast_lines_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_lines
    ADD CONSTRAINT fk_forecast_lines_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: inbound_plan_lines fk_inbound_plan_lines_plan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plan_lines
    ADD CONSTRAINT fk_inbound_plan_lines_plan FOREIGN KEY (inbound_plan_id) REFERENCES public.inbound_plans(id) ON DELETE CASCADE;


--
-- Name: inbound_plan_lines fk_inbound_plan_lines_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plan_lines
    ADD CONSTRAINT fk_inbound_plan_lines_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: inbound_plans fk_inbound_plans_supplier; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plans
    ADD CONSTRAINT fk_inbound_plans_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: lots fk_lots_expected; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT fk_lots_expected FOREIGN KEY (expected_lot_id) REFERENCES public.expected_lots(id) ON DELETE SET NULL;


--
-- Name: lots fk_lots_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT fk_lots_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: lots fk_lots_supplier; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT fk_lots_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: lots fk_lots_warehouse; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT fk_lots_warehouse FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;


--
-- Name: master_change_logs fk_master_change_logs_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_change_logs
    ADD CONSTRAINT fk_master_change_logs_user FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: operation_logs fk_operation_logs_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_logs
    ADD CONSTRAINT fk_operation_logs_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: order_lines fk_order_lines_delivery_place; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT fk_order_lines_delivery_place FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE RESTRICT;


--
-- Name: order_lines fk_order_lines_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT fk_order_lines_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


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
-- Name: stock_history fk_stock_history_lot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_history
    ADD CONSTRAINT fk_stock_history_lot FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: user_roles fk_user_roles_role; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles fk_user_roles_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict hdZn6NiwXMYQy8yOKdLn1qbI2I3ldAu949k0nCJNGfKLUdKaTpD493iqyHnmwen

