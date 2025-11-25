--
-- PostgreSQL database dump
--

\restrict hROCR298krNe8oYYMkr4oMLmzYMEw2Q9j90r1h5pOEiJ9Y7cVyjYwOsmnODzP0o

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

ALTER TABLE IF EXISTS ONLY public.user_roles DROP CONSTRAINT IF EXISTS fk_user_roles_user;
ALTER TABLE IF EXISTS ONLY public.user_roles DROP CONSTRAINT IF EXISTS fk_user_roles_role;
ALTER TABLE IF EXISTS ONLY public.stock_history DROP CONSTRAINT IF EXISTS fk_stock_history_lot;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS fk_orders_customer;
ALTER TABLE IF EXISTS ONLY public.order_lines DROP CONSTRAINT IF EXISTS fk_order_lines_product;
ALTER TABLE IF EXISTS ONLY public.order_lines DROP CONSTRAINT IF EXISTS fk_order_lines_order;
ALTER TABLE IF EXISTS ONLY public.order_lines DROP CONSTRAINT IF EXISTS fk_order_lines_delivery_place;
ALTER TABLE IF EXISTS ONLY public.operation_logs DROP CONSTRAINT IF EXISTS fk_operation_logs_user;
ALTER TABLE IF EXISTS ONLY public.master_change_logs DROP CONSTRAINT IF EXISTS fk_master_change_logs_user;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS fk_lots_warehouse;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS fk_lots_supplier;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS fk_lots_product;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS fk_lots_expected;
ALTER TABLE IF EXISTS ONLY public.inbound_plans DROP CONSTRAINT IF EXISTS fk_inbound_plans_supplier;
ALTER TABLE IF EXISTS ONLY public.inbound_plan_lines DROP CONSTRAINT IF EXISTS fk_inbound_plan_lines_product;
ALTER TABLE IF EXISTS ONLY public.inbound_plan_lines DROP CONSTRAINT IF EXISTS fk_inbound_plan_lines_plan;
ALTER TABLE IF EXISTS ONLY public.forecast_history DROP CONSTRAINT IF EXISTS fk_forecast_history_product;
ALTER TABLE IF EXISTS ONLY public.forecast_history DROP CONSTRAINT IF EXISTS fk_forecast_history_delivery_place;
ALTER TABLE IF EXISTS ONLY public.forecast_history DROP CONSTRAINT IF EXISTS fk_forecast_history_customer;
ALTER TABLE IF EXISTS ONLY public.forecast_current DROP CONSTRAINT IF EXISTS fk_forecast_current_product;
ALTER TABLE IF EXISTS ONLY public.forecast_current DROP CONSTRAINT IF EXISTS fk_forecast_current_delivery_place;
ALTER TABLE IF EXISTS ONLY public.forecast_current DROP CONSTRAINT IF EXISTS fk_forecast_current_customer;
ALTER TABLE IF EXISTS ONLY public.expected_lots DROP CONSTRAINT IF EXISTS fk_expected_lots_line;
ALTER TABLE IF EXISTS ONLY public.delivery_places DROP CONSTRAINT IF EXISTS fk_delivery_places_customer;
ALTER TABLE IF EXISTS ONLY public.customer_items DROP CONSTRAINT IF EXISTS fk_customer_items_supplier;
ALTER TABLE IF EXISTS ONLY public.customer_items DROP CONSTRAINT IF EXISTS fk_customer_items_product;
ALTER TABLE IF EXISTS ONLY public.customer_items DROP CONSTRAINT IF EXISTS fk_customer_items_customer;
ALTER TABLE IF EXISTS ONLY public.allocations DROP CONSTRAINT IF EXISTS fk_allocations_order_line;
ALTER TABLE IF EXISTS ONLY public.allocations DROP CONSTRAINT IF EXISTS fk_allocations_lot;
ALTER TABLE IF EXISTS ONLY public.allocation_suggestions DROP CONSTRAINT IF EXISTS fk_allocation_suggestions_lot;
ALTER TABLE IF EXISTS ONLY public.allocation_suggestions DROP CONSTRAINT IF EXISTS fk_allocation_suggestions_forecast_current;
ALTER TABLE IF EXISTS ONLY public.adjustments DROP CONSTRAINT IF EXISTS fk_adjustments_user;
ALTER TABLE IF EXISTS ONLY public.adjustments DROP CONSTRAINT IF EXISTS fk_adjustments_lot;
DROP INDEX IF EXISTS public.ux_forecast_current_unique;
DROP INDEX IF EXISTS public.ix_forecast_history_key;
DROP INDEX IF EXISTS public.ix_forecast_current_key;
DROP INDEX IF EXISTS public.idx_warehouses_type;
DROP INDEX IF EXISTS public.idx_warehouses_code;
DROP INDEX IF EXISTS public.idx_users_username;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_users_active;
DROP INDEX IF EXISTS public.idx_user_roles_user;
DROP INDEX IF EXISTS public.idx_user_roles_role;
DROP INDEX IF EXISTS public.idx_system_configs_key;
DROP INDEX IF EXISTS public.idx_suppliers_code;
DROP INDEX IF EXISTS public.idx_stock_history_type;
DROP INDEX IF EXISTS public.idx_stock_history_lot;
DROP INDEX IF EXISTS public.idx_stock_history_date;
DROP INDEX IF EXISTS public.idx_roles_code;
DROP INDEX IF EXISTS public.idx_products_name;
DROP INDEX IF EXISTS public.idx_products_code;
DROP INDEX IF EXISTS public.idx_orders_date;
DROP INDEX IF EXISTS public.idx_orders_customer;
DROP INDEX IF EXISTS public.idx_order_lines_status;
DROP INDEX IF EXISTS public.idx_order_lines_product;
DROP INDEX IF EXISTS public.idx_order_lines_order;
DROP INDEX IF EXISTS public.idx_order_lines_delivery_place;
DROP INDEX IF EXISTS public.idx_order_lines_date;
DROP INDEX IF EXISTS public.idx_operation_logs_user;
DROP INDEX IF EXISTS public.idx_operation_logs_type;
DROP INDEX IF EXISTS public.idx_operation_logs_table;
DROP INDEX IF EXISTS public.idx_operation_logs_created;
DROP INDEX IF EXISTS public.idx_master_change_logs_user;
DROP INDEX IF EXISTS public.idx_master_change_logs_table;
DROP INDEX IF EXISTS public.idx_master_change_logs_record;
DROP INDEX IF EXISTS public.idx_master_change_logs_changed;
DROP INDEX IF EXISTS public.idx_lots_warehouse;
DROP INDEX IF EXISTS public.idx_lots_supplier;
DROP INDEX IF EXISTS public.idx_lots_status;
DROP INDEX IF EXISTS public.idx_lots_product_warehouse;
DROP INDEX IF EXISTS public.idx_lots_number;
DROP INDEX IF EXISTS public.idx_lots_expiry_date;
DROP INDEX IF EXISTS public.idx_inbound_plans_supplier;
DROP INDEX IF EXISTS public.idx_inbound_plans_status;
DROP INDEX IF EXISTS public.idx_inbound_plans_date;
DROP INDEX IF EXISTS public.idx_inbound_plan_lines_product;
DROP INDEX IF EXISTS public.idx_inbound_plan_lines_plan;
DROP INDEX IF EXISTS public.idx_expected_lots_number;
DROP INDEX IF EXISTS public.idx_expected_lots_line;
DROP INDEX IF EXISTS public.idx_delivery_places_customer;
DROP INDEX IF EXISTS public.idx_delivery_places_code;
DROP INDEX IF EXISTS public.idx_customers_code;
DROP INDEX IF EXISTS public.idx_customer_items_supplier;
DROP INDEX IF EXISTS public.idx_customer_items_product;
DROP INDEX IF EXISTS public.idx_business_rules_type;
DROP INDEX IF EXISTS public.idx_business_rules_code;
DROP INDEX IF EXISTS public.idx_business_rules_active;
DROP INDEX IF EXISTS public.idx_batch_jobs_type;
DROP INDEX IF EXISTS public.idx_batch_jobs_status;
DROP INDEX IF EXISTS public.idx_batch_jobs_created;
DROP INDEX IF EXISTS public.idx_allocations_status;
DROP INDEX IF EXISTS public.idx_allocations_order_line;
DROP INDEX IF EXISTS public.idx_allocations_lot;
DROP INDEX IF EXISTS public.idx_allocation_suggestions_lot;
DROP INDEX IF EXISTS public.idx_allocation_suggestions_forecast;
DROP INDEX IF EXISTS public.idx_adjustments_lot;
DROP INDEX IF EXISTS public.idx_adjustments_date;
ALTER TABLE IF EXISTS ONLY public.warehouses DROP CONSTRAINT IF EXISTS warehouses_warehouse_code_key;
ALTER TABLE IF EXISTS ONLY public.warehouses DROP CONSTRAINT IF EXISTS warehouses_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.user_roles DROP CONSTRAINT IF EXISTS user_roles_pkey;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS uq_lots_number_product_warehouse;
ALTER TABLE IF EXISTS ONLY public.system_configs DROP CONSTRAINT IF EXISTS system_configs_pkey;
ALTER TABLE IF EXISTS ONLY public.system_configs DROP CONSTRAINT IF EXISTS system_configs_config_key_key;
ALTER TABLE IF EXISTS ONLY public.suppliers DROP CONSTRAINT IF EXISTS suppliers_supplier_code_key;
ALTER TABLE IF EXISTS ONLY public.suppliers DROP CONSTRAINT IF EXISTS suppliers_pkey;
ALTER TABLE IF EXISTS ONLY public.stock_history DROP CONSTRAINT IF EXISTS stock_history_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_role_code_key;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_maker_part_code_key;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_order_number_key;
ALTER TABLE IF EXISTS ONLY public.order_lines DROP CONSTRAINT IF EXISTS order_lines_pkey;
ALTER TABLE IF EXISTS ONLY public.operation_logs DROP CONSTRAINT IF EXISTS operation_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.master_change_logs DROP CONSTRAINT IF EXISTS master_change_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS lots_pkey;
ALTER TABLE IF EXISTS ONLY public.inbound_plans DROP CONSTRAINT IF EXISTS inbound_plans_plan_number_key;
ALTER TABLE IF EXISTS ONLY public.inbound_plans DROP CONSTRAINT IF EXISTS inbound_plans_pkey;
ALTER TABLE IF EXISTS ONLY public.inbound_plan_lines DROP CONSTRAINT IF EXISTS inbound_plan_lines_pkey;
ALTER TABLE IF EXISTS ONLY public.forecast_history DROP CONSTRAINT IF EXISTS forecast_history_pkey;
ALTER TABLE IF EXISTS ONLY public.forecast_current DROP CONSTRAINT IF EXISTS forecast_current_pkey;
ALTER TABLE IF EXISTS ONLY public.expected_lots DROP CONSTRAINT IF EXISTS expected_lots_pkey;
ALTER TABLE IF EXISTS ONLY public.delivery_places DROP CONSTRAINT IF EXISTS delivery_places_pkey;
ALTER TABLE IF EXISTS ONLY public.delivery_places DROP CONSTRAINT IF EXISTS delivery_places_delivery_place_code_key;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_pkey;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_customer_code_key;
ALTER TABLE IF EXISTS ONLY public.customer_items DROP CONSTRAINT IF EXISTS customer_items_pkey;
ALTER TABLE IF EXISTS ONLY public.business_rules DROP CONSTRAINT IF EXISTS business_rules_rule_code_key;
ALTER TABLE IF EXISTS ONLY public.business_rules DROP CONSTRAINT IF EXISTS business_rules_pkey;
ALTER TABLE IF EXISTS ONLY public.batch_jobs DROP CONSTRAINT IF EXISTS batch_jobs_pkey;
ALTER TABLE IF EXISTS ONLY public.allocations DROP CONSTRAINT IF EXISTS allocations_pkey;
ALTER TABLE IF EXISTS ONLY public.allocation_suggestions DROP CONSTRAINT IF EXISTS allocation_suggestions_pkey;
ALTER TABLE IF EXISTS ONLY public.adjustments DROP CONSTRAINT IF EXISTS adjustments_pkey;
ALTER TABLE IF EXISTS public.warehouses ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_configs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.suppliers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.stock_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.products ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.orders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.order_lines ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.operation_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.master_change_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lots ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.inbound_plans ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.inbound_plan_lines ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.forecast_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.forecast_current ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.expected_lots ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.delivery_places ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.customers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.business_rules ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.batch_jobs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.allocations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.allocation_suggestions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.adjustments ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.warehouses_id_seq;
DROP TABLE IF EXISTS public.warehouses;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_roles;
DROP SEQUENCE IF EXISTS public.system_configs_id_seq;
DROP TABLE IF EXISTS public.system_configs;
DROP SEQUENCE IF EXISTS public.suppliers_id_seq;
DROP TABLE IF EXISTS public.suppliers;
DROP SEQUENCE IF EXISTS public.stock_history_id_seq;
DROP TABLE IF EXISTS public.stock_history;
DROP SEQUENCE IF EXISTS public.roles_id_seq;
DROP TABLE IF EXISTS public.roles;
DROP SEQUENCE IF EXISTS public.products_id_seq;
DROP TABLE IF EXISTS public.products;
DROP SEQUENCE IF EXISTS public.orders_id_seq;
DROP TABLE IF EXISTS public.orders;
DROP SEQUENCE IF EXISTS public.order_lines_id_seq;
DROP TABLE IF EXISTS public.order_lines;
DROP SEQUENCE IF EXISTS public.operation_logs_id_seq;
DROP TABLE IF EXISTS public.operation_logs;
DROP SEQUENCE IF EXISTS public.master_change_logs_id_seq;
DROP TABLE IF EXISTS public.master_change_logs;
DROP SEQUENCE IF EXISTS public.lots_id_seq;
DROP TABLE IF EXISTS public.lots;
DROP SEQUENCE IF EXISTS public.inbound_plans_id_seq;
DROP TABLE IF EXISTS public.inbound_plans;
DROP SEQUENCE IF EXISTS public.inbound_plan_lines_id_seq;
DROP TABLE IF EXISTS public.inbound_plan_lines;
DROP SEQUENCE IF EXISTS public.forecast_history_id_seq;
DROP TABLE IF EXISTS public.forecast_history;
DROP SEQUENCE IF EXISTS public.forecast_current_id_seq;
DROP TABLE IF EXISTS public.forecast_current;
DROP SEQUENCE IF EXISTS public.expected_lots_id_seq;
DROP TABLE IF EXISTS public.expected_lots;
DROP SEQUENCE IF EXISTS public.delivery_places_id_seq;
DROP TABLE IF EXISTS public.delivery_places;
DROP SEQUENCE IF EXISTS public.customers_id_seq;
DROP TABLE IF EXISTS public.customers;
DROP TABLE IF EXISTS public.customer_items;
DROP SEQUENCE IF EXISTS public.business_rules_id_seq;
DROP TABLE IF EXISTS public.business_rules;
DROP SEQUENCE IF EXISTS public.batch_jobs_id_seq;
DROP TABLE IF EXISTS public.batch_jobs;
DROP SEQUENCE IF EXISTS public.allocations_id_seq;
DROP TABLE IF EXISTS public.allocations;
DROP SEQUENCE IF EXISTS public.allocation_suggestions_id_seq;
DROP TABLE IF EXISTS public.allocation_suggestions;
DROP SEQUENCE IF EXISTS public.adjustments_id_seq;
DROP TABLE IF EXISTS public.adjustments;
-- *not* dropping schema, since initdb creates it
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

COMMENT ON TABLE public.adjustments IS '蝨ｨ蠎ｫ隱ｿ謨ｴ(譽壼査蟾ｮ逡ｰ遲・';


--
-- Name: COLUMN adjustments.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.adjustments.id IS '隱ｿ謨ｴID(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN adjustments.lot_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.adjustments.lot_id IS '繝ｭ繝・ヨID(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN adjustments.adjustment_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.adjustments.adjustment_type IS '隱ｿ謨ｴ遞ｮ蛻･(physical_count/damage/loss/found/other)';


--
-- Name: COLUMN adjustments.adjusted_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.adjustments.adjusted_quantity IS '隱ｿ謨ｴ謨ｰ驥・+/-)';


--
-- Name: COLUMN adjustments.reason; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.adjustments.reason IS '隱ｿ謨ｴ逅・罰';


--
-- Name: COLUMN adjustments.adjusted_by; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.adjustments.adjusted_by IS '隱ｿ謨ｴ閠・繝ｦ繝ｼ繧ｶ繝ｼID)';


--
-- Name: COLUMN adjustments.adjusted_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.adjustments.adjusted_at IS '隱ｿ謨ｴ譌･譎・;


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

COMMENT ON TABLE public.allocation_suggestions IS '蠑募ｽ捺耳螂ｨ(繧ｷ繧ｹ繝・Β縺梧署譯医☆繧句ｼ募ｽ捺｡・';


--
-- Name: COLUMN allocation_suggestions.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocation_suggestions.id IS '謗ｨ螂ｨID(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN allocation_suggestions.forecast_line_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocation_suggestions.forecast_line_id IS '繝輔か繝ｼ繧ｭ繝｣繧ｹ繝域・邏ｰID(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN allocation_suggestions.lot_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocation_suggestions.lot_id IS '繝ｭ繝・ヨID(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN allocation_suggestions.suggested_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocation_suggestions.suggested_quantity IS '謗ｨ螂ｨ謨ｰ驥・;


--
-- Name: COLUMN allocation_suggestions.allocation_logic; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocation_suggestions.allocation_logic IS '蠑募ｽ薙Ο繧ｸ繝・け(FEFO/FIFO/MANUAL遲・';


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

COMMENT ON TABLE public.allocations IS '蠑募ｽ灘ｮ溽ｸｾ(遒ｺ螳壹＠縺溷ｼ募ｽ・';


--
-- Name: COLUMN allocations.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocations.id IS '蠑募ｽ的D(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN allocations.order_line_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocations.order_line_id IS '蜿玲ｳｨ譏守ｴｰID(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN allocations.lot_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocations.lot_id IS '繝ｭ繝・ヨID(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN allocations.allocated_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocations.allocated_quantity IS '蠑募ｽ捺焚驥・;


--
-- Name: COLUMN allocations.status; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.allocations.status IS '繧ｹ繝・・繧ｿ繧ｹ(allocated/shipped/cancelled)';


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

COMMENT ON TABLE public.batch_jobs IS '繝舌ャ繝√ず繝ｧ繝也ｮ｡逅・;


--
-- Name: COLUMN batch_jobs.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.batch_jobs.id IS '繧ｸ繝ｧ繝蜂D(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN batch_jobs.job_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.batch_jobs.job_name IS '繧ｸ繝ｧ繝門錐';


--
-- Name: COLUMN batch_jobs.job_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.batch_jobs.job_type IS '繧ｸ繝ｧ繝也ｨｮ蛻･';


--
-- Name: COLUMN batch_jobs.status; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.batch_jobs.status IS '繧ｹ繝・・繧ｿ繧ｹ(pending/running/completed/failed)';


--
-- Name: COLUMN batch_jobs.parameters; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.batch_jobs.parameters IS '繧ｸ繝ｧ繝悶ヱ繝ｩ繝｡繝ｼ繧ｿ(JSON)';


--
-- Name: COLUMN batch_jobs.result_message; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.batch_jobs.result_message IS '螳溯｡檎ｵ先棡繝｡繝・そ繝ｼ繧ｸ';


--
-- Name: COLUMN batch_jobs.started_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.batch_jobs.started_at IS '髢句ｧ区律譎・;


--
-- Name: COLUMN batch_jobs.completed_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.batch_jobs.completed_at IS '螳御ｺ・律譎・;


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

COMMENT ON TABLE public.business_rules IS '讌ｭ蜍吶Ν繝ｼ繝ｫ險ｭ螳・;


--
-- Name: COLUMN business_rules.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.business_rules.id IS '繝ｫ繝ｼ繝ｫID(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN business_rules.rule_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.business_rules.rule_code IS '繝ｫ繝ｼ繝ｫ繧ｳ繝ｼ繝・荳諢・';


--
-- Name: COLUMN business_rules.rule_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.business_rules.rule_name IS '繝ｫ繝ｼ繝ｫ蜷・;


--
-- Name: COLUMN business_rules.rule_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.business_rules.rule_type IS '繝ｫ繝ｼ繝ｫ遞ｮ蛻･(allocation/expiry_warning/kanban/other)';


--
-- Name: COLUMN business_rules.rule_parameters; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.business_rules.rule_parameters IS '繝ｫ繝ｼ繝ｫ繝代Λ繝｡繝ｼ繧ｿ(JSON)';


--
-- Name: COLUMN business_rules.is_active; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.business_rules.is_active IS '譛牙柑繝輔Λ繧ｰ';


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

COMMENT ON TABLE public.customer_items IS '蠕玲э蜈亥刀逡ｪ繝槭ャ繝斐Φ繧ｰ';


--
-- Name: COLUMN customer_items.customer_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customer_items.customer_id IS '蠕玲э蜈・D(荳ｻ繧ｭ繝ｼ, 螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN customer_items.external_product_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customer_items.external_product_code IS '蜈域婿蜩∫分(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN customer_items.product_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customer_items.product_id IS '繝｡繝ｼ繧ｫ繝ｼ蜩∫分ID(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN customer_items.supplier_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customer_items.supplier_id IS '莉募・蜈・D(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN customer_items.base_unit; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customer_items.base_unit IS '遉ｾ蜀・惠蠎ｫ蜊倅ｽ・;


--
-- Name: COLUMN customer_items.pack_unit; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customer_items.pack_unit IS '闕ｷ蟋ｿ蜊倅ｽ・;


--
-- Name: COLUMN customer_items.pack_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customer_items.pack_quantity IS '闕ｷ蟋ｿ謨ｰ驥・;


--
-- Name: COLUMN customer_items.special_instructions; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customer_items.special_instructions IS '迚ｹ險倅ｺ矩・;


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

COMMENT ON TABLE public.customers IS '蠕玲э蜈医・繧ｹ繧ｿ';


--
-- Name: COLUMN customers.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customers.id IS '蠕玲э蜈・D(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN customers.customer_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customers.customer_code IS '蠕玲э蜈医さ繝ｼ繝・荳諢・';


--
-- Name: COLUMN customers.customer_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.customers.customer_name IS '蠕玲э蜈亥錐';


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

COMMENT ON TABLE public.delivery_places IS '邏榊・蜈医・繧ｹ繧ｿ';


--
-- Name: COLUMN delivery_places.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.delivery_places.id IS '邏榊・蜈・D(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN delivery_places.jiku_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.delivery_places.jiku_code IS '谺｡蛹ｺ繧ｳ繝ｼ繝・SAP騾｣謳ｺ逕ｨ)';


--
-- Name: COLUMN delivery_places.delivery_place_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.delivery_places.delivery_place_code IS '邏榊・蜈医さ繝ｼ繝・陦ｨ遉ｺ逕ｨ)';


--
-- Name: COLUMN delivery_places.delivery_place_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.delivery_places.delivery_place_name IS '邏榊・蜈亥錐';


--
-- Name: COLUMN delivery_places.customer_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.delivery_places.customer_id IS '蠕玲э蜈・D(螟夜Κ繧ｭ繝ｼ)';


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

COMMENT ON TABLE public.expected_lots IS '譛溷ｾ・Ο繝・ヨ(蜈･闕ｷ莠亥ｮ壽凾轤ｹ縺ｧ繝ｭ繝・ヨ逡ｪ蜿ｷ縺悟愛譏弱＠縺ｦ縺・ｋ蝣ｴ蜷・';


--
-- Name: COLUMN expected_lots.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.expected_lots.id IS '譛溷ｾ・Ο繝・ヨID(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN expected_lots.inbound_plan_line_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.expected_lots.inbound_plan_line_id IS '蜈･闕ｷ莠亥ｮ壽・邏ｰID(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN expected_lots.expected_lot_number; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.expected_lots.expected_lot_number IS '譛溷ｾ・Ο繝・ヨ逡ｪ蜿ｷ';


--
-- Name: COLUMN expected_lots.expected_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.expected_lots.expected_quantity IS '譛溷ｾ・焚驥・;


--
-- Name: COLUMN expected_lots.expected_expiry_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.expected_lots.expected_expiry_date IS '譛溷ｾ・ｶ郁ｲｻ譛滄剞';


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

COMMENT ON TABLE public.inbound_plan_lines IS '蜈･闕ｷ莠亥ｮ壽・邏ｰ';


--
-- Name: COLUMN inbound_plan_lines.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plan_lines.id IS '蜈･闕ｷ莠亥ｮ壽・邏ｰID(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN inbound_plan_lines.inbound_plan_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plan_lines.inbound_plan_id IS '蜈･闕ｷ莠亥ｮ唔D(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN inbound_plan_lines.product_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plan_lines.product_id IS '陬ｽ蜩！D(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN inbound_plan_lines.planned_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plan_lines.planned_quantity IS '莠亥ｮ壽焚驥・;


--
-- Name: COLUMN inbound_plan_lines.unit; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plan_lines.unit IS '蜊倅ｽ・;


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

COMMENT ON TABLE public.inbound_plans IS '蜈･闕ｷ莠亥ｮ壹・繝・ム';


--
-- Name: COLUMN inbound_plans.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plans.id IS '蜈･闕ｷ莠亥ｮ唔D(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN inbound_plans.plan_number; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plans.plan_number IS '蜈･闕ｷ莠亥ｮ夂分蜿ｷ(荳諢・';


--
-- Name: COLUMN inbound_plans.supplier_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plans.supplier_id IS '莉募・蜈・D(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN inbound_plans.planned_arrival_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plans.planned_arrival_date IS '蜈･闕ｷ莠亥ｮ壽律';


--
-- Name: COLUMN inbound_plans.status; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plans.status IS '繧ｹ繝・・繧ｿ繧ｹ(planned/partially_received/received/cancelled)';


--
-- Name: COLUMN inbound_plans.notes; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.inbound_plans.notes IS '蛯呵・;


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

COMMENT ON TABLE public.lots IS '繝ｭ繝・ヨ蝨ｨ蠎ｫ(螳溷惠蠎ｫ)';


--
-- Name: COLUMN lots.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.id IS '繝ｭ繝・ヨID(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN lots.lot_number; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.lot_number IS '繝ｭ繝・ヨ逡ｪ蜿ｷ';


--
-- Name: COLUMN lots.product_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.product_id IS '陬ｽ蜩！D(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN lots.warehouse_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.warehouse_id IS '蛟牙ｺｫID(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN lots.supplier_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.supplier_id IS '莉募・蜈・D(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN lots.expected_lot_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.expected_lot_id IS '譛溷ｾ・Ο繝・ヨID(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN lots.received_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.received_date IS '蜈･闕ｷ譌･';


--
-- Name: COLUMN lots.expiry_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.expiry_date IS '豸郁ｲｻ譛滄剞';


--
-- Name: COLUMN lots.current_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.current_quantity IS '迴ｾ蝨ｨ蠎ｫ謨ｰ';


--
-- Name: COLUMN lots.allocated_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.allocated_quantity IS '蠑募ｽ捺ｸ域焚驥・;


--
-- Name: COLUMN lots.unit; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.unit IS '蜊倅ｽ・;


--
-- Name: COLUMN lots.status; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.lots.status IS '繧ｹ繝・・繧ｿ繧ｹ(active/depleted/expired/quarantine)';


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

COMMENT ON TABLE public.master_change_logs IS '繝槭せ繧ｿ螟画峩螻･豁ｴ';


--
-- Name: COLUMN master_change_logs.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.master_change_logs.id IS '螟画峩繝ｭ繧ｰID(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN master_change_logs.table_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.master_change_logs.table_name IS '繝・・繝悶Ν蜷・;


--
-- Name: COLUMN master_change_logs.record_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.master_change_logs.record_id IS '繝ｬ繧ｳ繝ｼ繝迂D';


--
-- Name: COLUMN master_change_logs.change_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.master_change_logs.change_type IS '螟画峩遞ｮ蛻･(insert/update/delete)';


--
-- Name: COLUMN master_change_logs.old_values; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.master_change_logs.old_values IS '螟画峩蜑阪・蛟､(JSON)';


--
-- Name: COLUMN master_change_logs.new_values; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.master_change_logs.new_values IS '螟画峩蠕後・蛟､(JSON)';


--
-- Name: COLUMN master_change_logs.changed_by; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.master_change_logs.changed_by IS '螟画峩閠・繝ｦ繝ｼ繧ｶ繝ｼID)';


--
-- Name: COLUMN master_change_logs.changed_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.master_change_logs.changed_at IS '螟画峩譌･譎・;


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

COMMENT ON TABLE public.operation_logs IS '謫堺ｽ懊Ο繧ｰ(逶｣譟ｻ險ｼ霍｡)';


--
-- Name: COLUMN operation_logs.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.operation_logs.id IS '繝ｭ繧ｰID(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN operation_logs.user_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.operation_logs.user_id IS '繝ｦ繝ｼ繧ｶ繝ｼID(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN operation_logs.operation_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.operation_logs.operation_type IS '謫堺ｽ懃ｨｮ蛻･(create/update/delete/login/logout/export)';


--
-- Name: COLUMN operation_logs.target_table; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.operation_logs.target_table IS '蟇ｾ雎｡繝・・繝悶Ν蜷・;


--
-- Name: COLUMN operation_logs.target_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.operation_logs.target_id IS '蟇ｾ雎｡繝ｬ繧ｳ繝ｼ繝迂D';


--
-- Name: COLUMN operation_logs.changes; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.operation_logs.changes IS '螟画峩蜀・ｮｹ(JSON)';


--
-- Name: COLUMN operation_logs.ip_address; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.operation_logs.ip_address IS 'IP繧｢繝峨Ξ繧ｹ';


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

COMMENT ON TABLE public.order_lines IS '蜿玲ｳｨ譏守ｴｰ';


--
-- Name: COLUMN order_lines.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_lines.id IS '蜿玲ｳｨ譏守ｴｰID(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN order_lines.order_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_lines.order_id IS '蜿玲ｳｨID(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN order_lines.product_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_lines.product_id IS '陬ｽ蜩！D(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN order_lines.delivery_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_lines.delivery_date IS '邏榊・譌･';


--
-- Name: COLUMN order_lines.order_quantity; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_lines.order_quantity IS '蜿玲ｳｨ謨ｰ驥・;


--
-- Name: COLUMN order_lines.unit; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_lines.unit IS '蜊倅ｽ・;


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

COMMENT ON TABLE public.orders IS '蜿玲ｳｨ繝倥ャ繝';


--
-- Name: COLUMN orders.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.orders.id IS '蜿玲ｳｨID(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN orders.order_number; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.orders.order_number IS '蜿玲ｳｨ逡ｪ蜿ｷ(荳諢・';


--
-- Name: COLUMN orders.customer_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.orders.customer_id IS '蠕玲э蜈・D(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN orders.order_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.orders.order_date IS '蜿玲ｳｨ譌･';


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

COMMENT ON TABLE public.products IS '陬ｽ蜩√・繧ｹ繧ｿ';


--
-- Name: COLUMN products.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.products.id IS '陬ｽ蜩！D(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN products.maker_part_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.products.maker_part_code IS '繝｡繝ｼ繧ｫ繝ｼ蜩∫分(荳諢・';


--
-- Name: COLUMN products.product_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.products.product_name IS '陬ｽ蜩∝錐';


--
-- Name: COLUMN products.base_unit; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.products.base_unit IS '遉ｾ蜀・惠蠎ｫ蜊倅ｽ・蛟・邂ｱ/kg遲・';


--
-- Name: COLUMN products.consumption_limit_days; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.products.consumption_limit_days IS '豸郁ｲｻ譛滄剞譌･謨ｰ';


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

COMMENT ON TABLE public.roles IS '繝ｭ繝ｼ繝ｫ繝槭せ繧ｿ';


--
-- Name: COLUMN roles.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.roles.id IS '繝ｭ繝ｼ繝ｫID(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN roles.role_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.roles.role_code IS '繝ｭ繝ｼ繝ｫ繧ｳ繝ｼ繝・荳諢・';


--
-- Name: COLUMN roles.role_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.roles.role_name IS '繝ｭ繝ｼ繝ｫ蜷・;


--
-- Name: COLUMN roles.description; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.roles.description IS '隱ｬ譏・;


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

COMMENT ON TABLE public.stock_history IS '蝨ｨ蠎ｫ螻･豁ｴ(縺吶∋縺ｦ縺ｮ蝨ｨ蠎ｫ螟牙虚繧定ｨ倬鹸)';


--
-- Name: COLUMN stock_history.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.stock_history.id IS '螻･豁ｴID(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN stock_history.lot_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.stock_history.lot_id IS '繝ｭ繝・ヨID(螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN stock_history.transaction_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.stock_history.transaction_type IS '繝医Λ繝ｳ繧ｶ繧ｯ繧ｷ繝ｧ繝ｳ遞ｮ蛻･(inbound/allocation/shipment/adjustment/return)';


--
-- Name: COLUMN stock_history.quantity_change; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.stock_history.quantity_change IS '謨ｰ驥丞､牙虚(+/-)';


--
-- Name: COLUMN stock_history.quantity_after; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.stock_history.quantity_after IS '螟牙虚蠕梧焚驥・;


--
-- Name: COLUMN stock_history.reference_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.stock_history.reference_type IS '蜿ら・蜈・ｨｮ蛻･(inbound_plan/order/allocation遲・';


--
-- Name: COLUMN stock_history.reference_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.stock_history.reference_id IS '蜿ら・蜈オD';


--
-- Name: COLUMN stock_history.transaction_date; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.stock_history.transaction_date IS '繝医Λ繝ｳ繧ｶ繧ｯ繧ｷ繝ｧ繝ｳ譌･譎・;


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

COMMENT ON TABLE public.suppliers IS '莉募・蜈医・繧ｹ繧ｿ';


--
-- Name: COLUMN suppliers.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.suppliers.id IS '莉募・蜈・D(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN suppliers.supplier_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.suppliers.supplier_code IS '莉募・蜈医さ繝ｼ繝・荳諢・';


--
-- Name: COLUMN suppliers.supplier_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.suppliers.supplier_name IS '莉募・蜈亥錐';


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

COMMENT ON TABLE public.system_configs IS '繧ｷ繧ｹ繝・Β險ｭ螳・;


--
-- Name: COLUMN system_configs.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.system_configs.id IS '險ｭ螳唔D(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN system_configs.config_key; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.system_configs.config_key IS '險ｭ螳壹く繝ｼ(荳諢・';


--
-- Name: COLUMN system_configs.config_value; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.system_configs.config_value IS '險ｭ螳壼､';


--
-- Name: COLUMN system_configs.description; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.system_configs.description IS '隱ｬ譏・;


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

COMMENT ON TABLE public.user_roles IS '繝ｦ繝ｼ繧ｶ繝ｼ繝ｭ繝ｼ繝ｫ髢｢騾｣';


--
-- Name: COLUMN user_roles.user_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.user_roles.user_id IS '繝ｦ繝ｼ繧ｶ繝ｼID(荳ｻ繧ｭ繝ｼ, 螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN user_roles.role_id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.user_roles.role_id IS '繝ｭ繝ｼ繝ｫID(荳ｻ繧ｭ繝ｼ, 螟夜Κ繧ｭ繝ｼ)';


--
-- Name: COLUMN user_roles.assigned_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.user_roles.assigned_at IS '蜑ｲ蠖捺律譎・;


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

COMMENT ON TABLE public.users IS '繝ｦ繝ｼ繧ｶ繝ｼ繝槭せ繧ｿ';


--
-- Name: COLUMN users.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.users.id IS '繝ｦ繝ｼ繧ｶ繝ｼID(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN users.username; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.users.username IS '繝ｦ繝ｼ繧ｶ繝ｼ蜷・荳諢・';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.users.email IS '繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ(荳諢・';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.users.password_hash IS '繝代せ繝ｯ繝ｼ繝峨ワ繝・す繝･';


--
-- Name: COLUMN users.display_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.users.display_name IS '陦ｨ遉ｺ蜷・;


--
-- Name: COLUMN users.is_active; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.users.is_active IS '譛牙柑繝輔Λ繧ｰ';


--
-- Name: COLUMN users.last_login_at; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.users.last_login_at IS '譛邨ゅΟ繧ｰ繧､繝ｳ譌･譎・;


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

COMMENT ON TABLE public.warehouses IS '蛟牙ｺｫ繝槭せ繧ｿ';


--
-- Name: COLUMN warehouses.id; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.warehouses.id IS '蛟牙ｺｫID(荳ｻ繧ｭ繝ｼ)';


--
-- Name: COLUMN warehouses.warehouse_code; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.warehouses.warehouse_code IS '蛟牙ｺｫ繧ｳ繝ｼ繝・荳諢・';


--
-- Name: COLUMN warehouses.warehouse_name; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.warehouses.warehouse_name IS '蛟牙ｺｫ蜷・;


--
-- Name: COLUMN warehouses.warehouse_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.warehouses.warehouse_type IS '蛟牙ｺｫ遞ｮ蛻･(internal/external/supplier)';


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

\unrestrict hROCR298krNe8oYYMkr4oMLmzYMEw2Q9j90r1h5pOEiJ9Y7cVyjYwOsmnODzP0o

