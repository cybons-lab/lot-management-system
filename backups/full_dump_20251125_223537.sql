--
-- PostgreSQL database dump
--

\restrict 1NrhomP48Nj6GNb21vH0ETqVVWTWUPN8in9wa8gfGugn00KisgjxKuy3rDVbJIC

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
-- Data for Name: adjustments; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.adjustments (id, lot_id, adjustment_type, adjusted_quantity, reason, adjusted_by, adjusted_at) FROM stdin;
\.


--
-- Data for Name: allocation_suggestions; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.allocation_suggestions (id, forecast_line_id, lot_id, suggested_quantity, allocation_logic, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: allocations; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.allocations (id, order_line_id, lot_id, allocated_quantity, status, created_at, updated_at) FROM stdin;
1	4	10	23.000	shipped	2025-11-19 08:33:27.840174	2025-11-19 08:33:27.840178
2	1	3	35.000	shipped	2025-11-19 08:33:27.840454	2025-11-19 08:33:27.840457
3	5	4	79.000	shipped	2025-11-19 08:33:27.840593	2025-11-19 08:33:27.840595
4	3	4	73.000	shipped	2025-11-19 08:33:27.840717	2025-11-19 08:33:27.840719
\.


--
-- Data for Name: batch_jobs; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.batch_jobs (id, job_name, job_type, status, parameters, result_message, started_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: business_rules; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.business_rules (id, rule_code, rule_name, rule_type, rule_parameters, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customer_items; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.customer_items (customer_id, external_product_code, product_id, supplier_id, base_unit, pack_unit, pack_quantity, special_instructions, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.customers (id, customer_code, customer_name, created_at, updated_at) FROM stdin;
1	C8290	螻ｱ蜿｣髮ｻ豌玲怏髯蝉ｼ夂､ｾ	2025-11-19 08:33:27.269056	2025-11-19 17:33:27.27247
2	C9398	譬ｪ蠑丈ｼ夂､ｾ蜉阯､鬟溷刀	2025-11-19 08:33:27.269166	2025-11-19 17:33:27.27247
3	C8133	菴占陸霎ｲ譫玲怏髯蝉ｼ夂､ｾ	2025-11-19 08:33:27.269224	2025-11-19 17:33:27.27247
\.


--
-- Data for Name: delivery_places; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.delivery_places (id, jiku_code, delivery_place_code, delivery_place_name, customer_id, created_at, updated_at) FROM stdin;
1	\N	D517	讓ｪ豬懷ｸよ虻蝪壼玄驟埼√そ繝ｳ繧ｿ繝ｼ	1	2025-11-19 08:33:27.284934	2025-11-19 17:33:27.27247
2	\N	D569	譏ｭ蟲ｶ蟶る・騾√そ繝ｳ繧ｿ繝ｼ	2	2025-11-19 08:33:27.284976	2025-11-19 17:33:27.27247
3	\N	D778	讓ｪ豬懷ｸゆｿ晏悄繧ｱ隹ｷ蛹ｺ驟埼√そ繝ｳ繧ｿ繝ｼ	1	2025-11-19 08:33:27.285005	2025-11-19 17:33:27.27247
4	\N	D583	蟾晏ｴ主ｸょｷ晏ｴ主玄驟埼√そ繝ｳ繧ｿ繝ｼ	1	2025-11-19 08:33:27.285033	2025-11-19 17:33:27.27247
5	\N	D758	雎雁ｳｶ蛹ｺ驟埼√そ繝ｳ繧ｿ繝ｼ	3	2025-11-19 08:33:27.285062	2025-11-19 17:33:27.27247
\.


--
-- Data for Name: expected_lots; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.expected_lots (id, inbound_plan_line_id, expected_lot_number, expected_quantity, expected_expiry_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: forecast_current; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.forecast_current (id, customer_id, delivery_place_id, product_id, forecast_date, forecast_quantity, unit, snapshot_at, created_at, updated_at) FROM stdin;
1	1	1	1	2025-10-19	363	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2	1	1	2	2025-10-19	461	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
3	1	1	3	2025-10-19	678	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
4	1	1	4	2025-10-19	691	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
5	1	1	5	2025-10-19	885	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
6	1	1	1	2025-10-20	763	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
7	1	1	2	2025-10-20	555	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
8	1	1	3	2025-10-20	154	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
9	1	1	4	2025-10-20	20	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
10	1	1	5	2025-10-20	153	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
11	1	1	1	2025-10-21	274	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
12	1	1	2	2025-10-21	791	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
13	1	1	3	2025-10-21	400	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
14	1	1	4	2025-10-21	15	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
15	1	1	5	2025-10-21	493	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
16	1	1	1	2025-10-22	290	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
17	1	1	2	2025-10-22	138	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
18	1	1	3	2025-10-22	481	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
19	1	1	4	2025-10-22	737	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
20	1	1	5	2025-10-22	448	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
21	1	1	1	2025-10-23	803	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
22	1	1	2	2025-10-23	612	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
23	1	1	3	2025-10-23	722	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
24	1	1	4	2025-10-23	565	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
25	1	1	5	2025-10-23	698	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
26	1	1	1	2025-10-24	563	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
27	1	1	2	2025-10-24	700	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
28	1	1	3	2025-10-24	794	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
29	1	1	4	2025-10-24	415	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
30	1	1	5	2025-10-24	100	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
31	1	1	1	2025-10-25	247	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
32	1	1	2	2025-10-25	901	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
33	1	1	3	2025-10-25	861	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
34	1	1	4	2025-10-25	407	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
35	1	1	5	2025-10-25	451	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
36	1	1	1	2025-10-26	371	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
37	1	1	2	2025-10-26	252	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
38	1	1	3	2025-10-26	234	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
39	1	1	4	2025-10-26	647	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
40	1	1	5	2025-10-26	925	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
41	1	1	1	2025-10-27	802	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
42	1	1	2	2025-10-27	653	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
43	1	1	3	2025-10-27	512	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
44	1	1	4	2025-10-27	464	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
45	1	1	5	2025-10-27	989	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
46	1	1	1	2025-10-28	66	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
47	1	1	2	2025-10-28	701	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
48	1	1	3	2025-10-28	803	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
49	1	1	4	2025-10-28	835	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
50	1	1	5	2025-10-28	574	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
51	1	1	1	2025-10-29	506	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
52	1	1	2	2025-10-29	896	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
53	1	1	3	2025-10-29	605	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
54	1	1	4	2025-10-29	575	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
55	1	1	5	2025-10-29	807	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
56	1	1	1	2025-10-30	720	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
57	1	1	2	2025-10-30	859	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
58	1	1	3	2025-10-30	343	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
59	1	1	4	2025-10-30	205	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
60	1	1	5	2025-10-30	655	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
61	1	1	1	2025-10-31	690	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
62	1	1	2	2025-10-31	155	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
63	1	1	3	2025-10-31	149	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
64	1	1	4	2025-10-31	712	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
65	1	1	5	2025-10-31	502	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
66	1	1	1	2025-11-01	870	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
67	1	1	2	2025-11-01	513	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
68	1	1	3	2025-11-01	262	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
69	1	1	4	2025-11-01	916	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
70	1	1	5	2025-11-01	13	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
71	1	1	1	2025-11-02	342	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
72	1	1	2	2025-11-02	211	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
73	1	1	3	2025-11-02	509	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
74	1	1	4	2025-11-02	225	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
75	1	1	5	2025-11-02	939	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
76	1	1	1	2025-11-03	935	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
77	1	1	2	2025-11-03	55	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
78	1	1	3	2025-11-03	724	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
79	1	1	4	2025-11-03	882	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
80	1	1	5	2025-11-03	361	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
81	1	1	1	2025-11-04	245	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
82	1	1	2	2025-11-04	857	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
83	1	1	3	2025-11-04	748	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
84	1	1	4	2025-11-04	635	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
85	1	1	5	2025-11-04	928	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
86	1	1	1	2025-11-05	837	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
87	1	1	2	2025-11-05	984	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
88	1	1	3	2025-11-05	16	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
89	1	1	4	2025-11-05	19	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
90	1	1	5	2025-11-05	491	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
91	1	1	1	2025-11-06	152	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
92	1	1	2	2025-11-06	605	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
93	1	1	3	2025-11-06	740	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
94	1	1	4	2025-11-06	794	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
95	1	1	5	2025-11-06	348	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
96	1	1	1	2025-11-07	620	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
97	1	1	2	2025-11-07	729	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
98	1	1	3	2025-11-07	856	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
99	1	1	4	2025-11-07	235	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
100	1	1	5	2025-11-07	360	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
101	1	1	1	2025-11-08	72	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
102	1	1	2	2025-11-08	244	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
103	1	1	3	2025-11-08	176	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
104	1	1	4	2025-11-08	774	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
105	1	1	5	2025-11-08	538	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
106	1	1	1	2025-11-09	417	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
107	1	1	2	2025-11-09	36	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
108	1	1	3	2025-11-09	738	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
109	1	1	4	2025-11-09	83	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
110	1	1	5	2025-11-09	28	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
111	1	1	1	2025-11-10	476	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
112	1	1	2	2025-11-10	649	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
113	1	1	3	2025-11-10	104	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
114	1	1	4	2025-11-10	370	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
115	1	1	5	2025-11-10	849	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
116	1	1	1	2025-11-11	400	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
117	1	1	2	2025-11-11	45	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
118	1	1	3	2025-11-11	883	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
119	1	1	4	2025-11-11	911	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
120	1	1	5	2025-11-11	865	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
121	1	1	1	2025-11-12	246	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
122	1	1	2	2025-11-12	920	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
123	1	1	3	2025-11-12	998	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
124	1	1	4	2025-11-12	650	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
125	1	1	5	2025-11-12	78	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
126	1	1	1	2025-11-13	896	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
127	1	1	2	2025-11-13	244	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
128	1	1	3	2025-11-13	508	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
129	1	1	4	2025-11-13	157	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
130	1	1	5	2025-11-13	340	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
131	1	1	1	2025-11-14	368	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
132	1	1	2	2025-11-14	108	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
133	1	1	3	2025-11-14	931	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
134	1	1	4	2025-11-14	888	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
135	1	1	5	2025-11-14	243	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
136	1	1	1	2025-11-15	279	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
137	1	1	2	2025-11-15	990	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
138	1	1	3	2025-11-15	717	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
139	1	1	4	2025-11-15	50	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
140	1	1	5	2025-11-15	370	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
141	1	1	1	2025-11-16	195	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
142	1	1	2	2025-11-16	427	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
143	1	1	3	2025-11-16	580	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
144	1	1	4	2025-11-16	67	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
145	1	1	5	2025-11-16	375	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
146	1	1	1	2025-11-17	53	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
147	1	1	2	2025-11-17	406	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
148	1	1	3	2025-11-17	418	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
149	1	1	4	2025-11-17	573	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
150	1	1	5	2025-11-17	953	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
151	1	1	1	2025-11-18	940	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
152	1	1	2	2025-11-18	618	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
153	1	1	3	2025-11-18	50	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
154	1	1	4	2025-11-18	807	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
155	1	1	5	2025-11-18	477	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
156	1	1	1	2025-11-19	929	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
157	1	1	2	2025-11-19	28	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
158	1	1	3	2025-11-19	604	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
159	1	1	4	2025-11-19	820	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
160	1	1	5	2025-11-19	331	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
161	1	1	1	2025-11-20	671	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
162	1	1	2	2025-11-20	22	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
163	1	1	3	2025-11-20	320	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
164	1	1	4	2025-11-20	743	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
165	1	1	5	2025-11-20	833	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
166	1	1	1	2025-11-21	685	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
167	1	1	2	2025-11-21	954	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
168	1	1	3	2025-11-21	662	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
169	1	1	4	2025-11-21	964	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
170	1	1	5	2025-11-21	973	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
171	1	1	1	2025-11-22	868	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
172	1	1	2	2025-11-22	839	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
173	1	1	3	2025-11-22	869	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
174	1	1	4	2025-11-22	934	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
175	1	1	5	2025-11-22	477	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
176	1	1	1	2025-11-23	954	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
177	1	1	2	2025-11-23	238	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
178	1	1	3	2025-11-23	177	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
179	1	1	4	2025-11-23	215	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
180	1	1	5	2025-11-23	742	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
181	1	1	1	2025-11-24	226	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
182	1	1	2	2025-11-24	891	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
183	1	1	3	2025-11-24	347	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
184	1	1	4	2025-11-24	604	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
185	1	1	5	2025-11-24	700	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
186	1	1	1	2025-11-25	24	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
187	1	1	2	2025-11-25	601	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
188	1	1	3	2025-11-25	632	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
189	1	1	4	2025-11-25	537	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
190	1	1	5	2025-11-25	923	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
191	1	1	1	2025-11-26	362	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
192	1	1	2	2025-11-26	750	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
193	1	1	3	2025-11-26	207	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
194	1	1	4	2025-11-26	383	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
195	1	1	5	2025-11-26	471	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
196	1	1	1	2025-11-27	42	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
197	1	1	2	2025-11-27	726	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
198	1	1	3	2025-11-27	547	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
199	1	1	4	2025-11-27	254	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
200	1	1	5	2025-11-27	778	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
201	1	1	1	2025-11-28	48	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
202	1	1	2	2025-11-28	28	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
203	1	1	3	2025-11-28	836	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
204	1	1	4	2025-11-28	569	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
205	1	1	5	2025-11-28	99	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
206	1	1	1	2025-11-29	406	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
207	1	1	2	2025-11-29	763	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
208	1	1	3	2025-11-29	177	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
209	1	1	4	2025-11-29	41	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
210	1	1	5	2025-11-29	273	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
211	1	1	1	2025-11-30	810	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
212	1	1	2	2025-11-30	878	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
213	1	1	3	2025-11-30	690	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
214	1	1	4	2025-11-30	955	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
215	1	1	5	2025-11-30	386	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
216	1	1	1	2025-12-01	594	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
217	1	1	2	2025-12-01	976	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
218	1	1	3	2025-12-01	644	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
219	1	1	4	2025-12-01	79	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
220	1	1	5	2025-12-01	430	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
221	1	1	1	2025-12-02	660	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
222	1	1	2	2025-12-02	890	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
223	1	1	3	2025-12-02	520	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
224	1	1	4	2025-12-02	541	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
225	1	1	5	2025-12-02	422	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
226	1	1	1	2025-12-03	767	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
227	1	1	2	2025-12-03	303	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
228	1	1	3	2025-12-03	785	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
229	1	1	4	2025-12-03	791	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
230	1	1	5	2025-12-03	219	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
231	1	1	1	2025-12-04	94	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
232	1	1	2	2025-12-04	239	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
233	1	1	3	2025-12-04	879	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
234	1	1	4	2025-12-04	570	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
235	1	1	5	2025-12-04	895	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
236	1	1	1	2025-12-05	263	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
237	1	1	2	2025-12-05	729	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
238	1	1	3	2025-12-05	822	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
239	1	1	4	2025-12-05	156	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
240	1	1	5	2025-12-05	900	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
241	1	1	1	2025-12-06	394	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
242	1	1	2	2025-12-06	387	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
243	1	1	3	2025-12-06	154	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
244	1	1	4	2025-12-06	150	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
245	1	1	5	2025-12-06	117	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
246	1	1	1	2025-12-07	399	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
247	1	1	2	2025-12-07	544	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
248	1	1	3	2025-12-07	310	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
249	1	1	4	2025-12-07	254	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
250	1	1	5	2025-12-07	639	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
251	1	1	1	2025-12-08	692	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
252	1	1	2	2025-12-08	392	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
253	1	1	3	2025-12-08	140	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
254	1	1	4	2025-12-08	764	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
255	1	1	5	2025-12-08	558	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
256	1	1	1	2025-12-09	710	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
257	1	1	2	2025-12-09	649	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
258	1	1	3	2025-12-09	624	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
259	1	1	4	2025-12-09	467	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
260	1	1	5	2025-12-09	500	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
261	1	1	1	2025-12-10	570	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
262	1	1	2	2025-12-10	910	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
263	1	1	3	2025-12-10	846	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
264	1	1	4	2025-12-10	223	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
265	1	1	5	2025-12-10	59	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
266	1	1	1	2025-12-11	498	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
267	1	1	2	2025-12-11	717	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
268	1	1	3	2025-12-11	283	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
269	1	1	4	2025-12-11	400	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
270	1	1	5	2025-12-11	947	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
271	1	1	1	2025-12-12	142	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
272	1	1	2	2025-12-12	587	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
273	1	1	3	2025-12-12	159	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
274	1	1	4	2025-12-12	870	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
275	1	1	5	2025-12-12	958	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
276	1	1	1	2025-12-13	620	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
277	1	1	2	2025-12-13	195	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
278	1	1	3	2025-12-13	215	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
279	1	1	4	2025-12-13	952	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
280	1	1	5	2025-12-13	101	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
281	1	1	1	2025-12-14	782	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
282	1	1	2	2025-12-14	254	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
283	1	1	3	2025-12-14	515	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
284	1	1	4	2025-12-14	98	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
285	1	1	5	2025-12-14	715	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
286	1	1	1	2025-12-15	886	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
287	1	1	2	2025-12-15	581	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
288	1	1	3	2025-12-15	767	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
289	1	1	4	2025-12-15	777	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
290	1	1	5	2025-12-15	225	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
291	1	1	1	2025-12-16	35	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
292	1	1	2	2025-12-16	280	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
293	1	1	3	2025-12-16	135	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
294	1	1	4	2025-12-16	208	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
295	1	1	5	2025-12-16	892	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
296	1	1	1	2025-12-17	582	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
297	1	1	2	2025-12-17	302	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
298	1	1	3	2025-12-17	43	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
299	1	1	4	2025-12-17	243	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
300	1	1	5	2025-12-17	413	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
301	1	1	1	2025-12-18	930	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
302	1	1	2	2025-12-18	629	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
303	1	1	3	2025-12-18	571	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
304	1	1	4	2025-12-18	422	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
305	1	1	5	2025-12-18	758	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
306	1	1	1	2025-12-19	771	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
307	1	1	2	2025-12-19	764	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
308	1	1	3	2025-12-19	393	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
309	1	1	4	2025-12-19	484	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
310	1	1	5	2025-12-19	220	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
311	1	1	1	2025-12-20	714	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
312	1	1	2	2025-12-20	657	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
313	1	1	3	2025-12-20	255	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
314	1	1	4	2025-12-20	26	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
315	1	1	5	2025-12-20	532	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
316	1	1	1	2025-12-21	443	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
317	1	1	2	2025-12-21	651	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
318	1	1	3	2025-12-21	461	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
319	1	1	4	2025-12-21	961	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
320	1	1	5	2025-12-21	966	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
321	1	1	1	2025-12-22	342	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
322	1	1	2	2025-12-22	611	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
323	1	1	3	2025-12-22	769	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
324	1	1	4	2025-12-22	623	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
325	1	1	5	2025-12-22	943	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
326	1	1	1	2025-12-23	553	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
327	1	1	2	2025-12-23	671	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
328	1	1	3	2025-12-23	639	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
329	1	1	4	2025-12-23	782	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
330	1	1	5	2025-12-23	953	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
331	1	1	1	2025-12-24	320	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
332	1	1	2	2025-12-24	970	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
333	1	1	3	2025-12-24	812	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
334	1	1	4	2025-12-24	977	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
335	1	1	5	2025-12-24	362	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
336	1	1	1	2025-12-25	223	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
337	1	1	2	2025-12-25	728	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
338	1	1	3	2025-12-25	899	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
339	1	1	4	2025-12-25	66	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
340	1	1	5	2025-12-25	72	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
341	1	1	1	2025-12-26	61	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
342	1	1	2	2025-12-26	835	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
343	1	1	3	2025-12-26	804	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
344	1	1	4	2025-12-26	460	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
345	1	1	5	2025-12-26	636	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
346	1	1	1	2025-12-27	679	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
347	1	1	2	2025-12-27	881	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
348	1	1	3	2025-12-27	245	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
349	1	1	4	2025-12-27	82	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
350	1	1	5	2025-12-27	804	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
351	1	1	1	2025-12-28	923	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
352	1	1	2	2025-12-28	83	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
353	1	1	3	2025-12-28	613	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
354	1	1	4	2025-12-28	722	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
355	1	1	5	2025-12-28	135	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
356	1	1	1	2025-12-29	862	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
357	1	1	2	2025-12-29	777	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
358	1	1	3	2025-12-29	930	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
359	1	1	4	2025-12-29	386	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
360	1	1	5	2025-12-29	280	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
361	1	1	1	2025-12-30	361	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
362	1	1	2	2025-12-30	75	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
363	1	1	3	2025-12-30	229	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
364	1	1	4	2025-12-30	323	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
365	1	1	5	2025-12-30	391	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
366	1	1	1	2025-12-31	533	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
367	1	1	2	2025-12-31	90	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
368	1	1	3	2025-12-31	158	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
369	1	1	4	2025-12-31	22	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
370	1	1	5	2025-12-31	997	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
371	1	1	1	2026-01-01	83	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
372	1	1	2	2026-01-01	1000	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
373	1	1	3	2026-01-01	218	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
374	1	1	4	2026-01-01	524	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
375	1	1	5	2026-01-01	394	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
376	1	1	1	2026-01-02	436	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
377	1	1	2	2026-01-02	886	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
378	1	1	3	2026-01-02	703	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
379	1	1	4	2026-01-02	215	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
380	1	1	5	2026-01-02	631	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
381	1	1	1	2026-01-03	665	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
382	1	1	2	2026-01-03	497	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
383	1	1	3	2026-01-03	318	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
384	1	1	4	2026-01-03	584	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
385	1	1	5	2026-01-03	282	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
386	1	1	1	2026-01-04	609	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
387	1	1	2	2026-01-04	371	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
388	1	1	3	2026-01-04	344	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
389	1	1	4	2026-01-04	16	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
390	1	1	5	2026-01-04	512	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
391	1	1	1	2026-01-05	424	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
392	1	1	2	2026-01-05	849	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
393	1	1	3	2026-01-05	551	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
394	1	1	4	2026-01-05	862	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
395	1	1	5	2026-01-05	740	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
396	1	1	1	2026-01-06	796	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
397	1	1	2	2026-01-06	118	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
398	1	1	3	2026-01-06	360	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
399	1	1	4	2026-01-06	290	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
400	1	1	5	2026-01-06	263	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
401	1	1	1	2026-01-07	42	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
402	1	1	2	2026-01-07	157	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
403	1	1	3	2026-01-07	906	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
404	1	1	4	2026-01-07	735	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
405	1	1	5	2026-01-07	827	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
406	1	1	1	2026-01-08	993	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
407	1	1	2	2026-01-08	17	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
408	1	1	3	2026-01-08	52	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
409	1	1	4	2026-01-08	87	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
410	1	1	5	2026-01-08	903	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
411	1	1	1	2026-01-09	120	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
412	1	1	2	2026-01-09	886	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
413	1	1	3	2026-01-09	169	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
414	1	1	4	2026-01-09	171	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
415	1	1	5	2026-01-09	752	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
416	1	1	1	2026-01-10	582	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
417	1	1	2	2026-01-10	358	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
418	1	1	3	2026-01-10	832	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
419	1	1	4	2026-01-10	745	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
420	1	1	5	2026-01-10	388	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
421	2	2	1	2025-10-19	94	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
422	2	2	2	2025-10-19	132	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
423	2	2	3	2025-10-19	570	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
424	2	2	4	2025-10-19	401	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
425	2	2	5	2025-10-19	778	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
426	2	2	1	2025-10-20	187	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
427	2	2	2	2025-10-20	782	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
428	2	2	3	2025-10-20	672	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
429	2	2	4	2025-10-20	329	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
430	2	2	5	2025-10-20	651	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
431	2	2	1	2025-10-21	559	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
432	2	2	2	2025-10-21	978	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
433	2	2	3	2025-10-21	259	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
434	2	2	4	2025-10-21	859	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
435	2	2	5	2025-10-21	148	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
436	2	2	1	2025-10-22	653	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
437	2	2	2	2025-10-22	739	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
438	2	2	3	2025-10-22	680	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
439	2	2	4	2025-10-22	699	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
440	2	2	5	2025-10-22	655	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
441	2	2	1	2025-10-23	590	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
442	2	2	2	2025-10-23	381	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
443	2	2	3	2025-10-23	178	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
444	2	2	4	2025-10-23	212	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
445	2	2	5	2025-10-23	957	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
446	2	2	1	2025-10-24	626	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
447	2	2	2	2025-10-24	721	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
448	2	2	3	2025-10-24	878	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
449	2	2	4	2025-10-24	809	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
450	2	2	5	2025-10-24	868	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
451	2	2	1	2025-10-25	579	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
452	2	2	2	2025-10-25	880	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
453	2	2	3	2025-10-25	24	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
454	2	2	4	2025-10-25	139	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
455	2	2	5	2025-10-25	629	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
456	2	2	1	2025-10-26	213	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
457	2	2	2	2025-10-26	145	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
458	2	2	3	2025-10-26	637	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
459	2	2	4	2025-10-26	928	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
460	2	2	5	2025-10-26	812	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
461	2	2	1	2025-10-27	396	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
462	2	2	2	2025-10-27	733	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
463	2	2	3	2025-10-27	984	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
464	2	2	4	2025-10-27	466	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
465	2	2	5	2025-10-27	466	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
466	2	2	1	2025-10-28	200	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
467	2	2	2	2025-10-28	137	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
468	2	2	3	2025-10-28	290	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
469	2	2	4	2025-10-28	45	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
470	2	2	5	2025-10-28	349	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
471	2	2	1	2025-10-29	618	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
472	2	2	2	2025-10-29	265	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
473	2	2	3	2025-10-29	422	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
474	2	2	4	2025-10-29	52	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
475	2	2	5	2025-10-29	894	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
476	2	2	1	2025-10-30	349	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
477	2	2	2	2025-10-30	761	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
478	2	2	3	2025-10-30	686	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
479	2	2	4	2025-10-30	446	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
480	2	2	5	2025-10-30	158	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
481	2	2	1	2025-10-31	889	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
482	2	2	2	2025-10-31	723	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
483	2	2	3	2025-10-31	834	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
484	2	2	4	2025-10-31	27	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
485	2	2	5	2025-10-31	359	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
486	2	2	1	2025-11-01	232	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
487	2	2	2	2025-11-01	296	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
488	2	2	3	2025-11-01	745	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
489	2	2	4	2025-11-01	45	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
490	2	2	5	2025-11-01	139	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
491	2	2	1	2025-11-02	164	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
492	2	2	2	2025-11-02	797	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
493	2	2	3	2025-11-02	231	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
494	2	2	4	2025-11-02	161	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
495	2	2	5	2025-11-02	403	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
496	2	2	1	2025-11-03	578	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
497	2	2	2	2025-11-03	722	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
498	2	2	3	2025-11-03	997	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
499	2	2	4	2025-11-03	969	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
500	2	2	5	2025-11-03	885	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
501	2	2	1	2025-11-04	188	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
502	2	2	2	2025-11-04	451	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
503	2	2	3	2025-11-04	703	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
504	2	2	4	2025-11-04	590	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
505	2	2	5	2025-11-04	920	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
506	2	2	1	2025-11-05	185	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
507	2	2	2	2025-11-05	10	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
508	2	2	3	2025-11-05	596	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
509	2	2	4	2025-11-05	29	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
510	2	2	5	2025-11-05	386	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
511	2	2	1	2025-11-06	491	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
512	2	2	2	2025-11-06	702	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
513	2	2	3	2025-11-06	327	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
514	2	2	4	2025-11-06	237	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
515	2	2	5	2025-11-06	706	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
516	2	2	1	2025-11-07	462	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
517	2	2	2	2025-11-07	516	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
518	2	2	3	2025-11-07	534	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
519	2	2	4	2025-11-07	473	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
520	2	2	5	2025-11-07	415	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
521	2	2	1	2025-11-08	146	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
522	2	2	2	2025-11-08	125	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
523	2	2	3	2025-11-08	726	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
524	2	2	4	2025-11-08	751	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
525	2	2	5	2025-11-08	664	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
526	2	2	1	2025-11-09	907	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
527	2	2	2	2025-11-09	421	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
528	2	2	3	2025-11-09	202	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
529	2	2	4	2025-11-09	980	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
530	2	2	5	2025-11-09	514	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
531	2	2	1	2025-11-10	709	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
532	2	2	2	2025-11-10	910	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
533	2	2	3	2025-11-10	477	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
534	2	2	4	2025-11-10	513	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
535	2	2	5	2025-11-10	76	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
536	2	2	1	2025-11-11	684	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
537	2	2	2	2025-11-11	631	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
538	2	2	3	2025-11-11	513	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
539	2	2	4	2025-11-11	125	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
540	2	2	5	2025-11-11	848	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
541	2	2	1	2025-11-12	734	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
542	2	2	2	2025-11-12	138	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
543	2	2	3	2025-11-12	311	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
544	2	2	4	2025-11-12	317	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
545	2	2	5	2025-11-12	591	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
546	2	2	1	2025-11-13	863	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
547	2	2	2	2025-11-13	902	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
548	2	2	3	2025-11-13	468	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
549	2	2	4	2025-11-13	738	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
550	2	2	5	2025-11-13	904	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
551	2	2	1	2025-11-14	626	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
552	2	2	2	2025-11-14	822	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
553	2	2	3	2025-11-14	544	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
554	2	2	4	2025-11-14	919	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
555	2	2	5	2025-11-14	864	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
556	2	2	1	2025-11-15	406	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
557	2	2	2	2025-11-15	48	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
558	2	2	3	2025-11-15	707	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
559	2	2	4	2025-11-15	193	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
560	2	2	5	2025-11-15	469	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
561	2	2	1	2025-11-16	853	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
562	2	2	2	2025-11-16	293	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
563	2	2	3	2025-11-16	957	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
564	2	2	4	2025-11-16	758	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
565	2	2	5	2025-11-16	780	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
566	2	2	1	2025-11-17	349	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
567	2	2	2	2025-11-17	791	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
568	2	2	3	2025-11-17	648	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
569	2	2	4	2025-11-17	262	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
570	2	2	5	2025-11-17	139	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
571	2	2	1	2025-11-18	858	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
572	2	2	2	2025-11-18	809	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
573	2	2	3	2025-11-18	687	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
574	2	2	4	2025-11-18	609	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
575	2	2	5	2025-11-18	503	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
576	2	2	1	2025-11-19	560	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
577	2	2	2	2025-11-19	216	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
578	2	2	3	2025-11-19	233	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
579	2	2	4	2025-11-19	372	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
580	2	2	5	2025-11-19	681	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
581	2	2	1	2025-11-20	348	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
582	2	2	2	2025-11-20	103	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
583	2	2	3	2025-11-20	623	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
584	2	2	4	2025-11-20	961	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
585	2	2	5	2025-11-20	498	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
586	2	2	1	2025-11-21	344	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
587	2	2	2	2025-11-21	830	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
588	2	2	3	2025-11-21	163	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
589	2	2	4	2025-11-21	986	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
590	2	2	5	2025-11-21	553	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
591	2	2	1	2025-11-22	59	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
592	2	2	2	2025-11-22	892	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
593	2	2	3	2025-11-22	439	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
594	2	2	4	2025-11-22	292	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
595	2	2	5	2025-11-22	10	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
596	2	2	1	2025-11-23	794	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
597	2	2	2	2025-11-23	155	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
598	2	2	3	2025-11-23	708	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
599	2	2	4	2025-11-23	148	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
600	2	2	5	2025-11-23	499	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
601	2	2	1	2025-11-24	829	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
602	2	2	2	2025-11-24	714	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
603	2	2	3	2025-11-24	766	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
604	2	2	4	2025-11-24	801	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
605	2	2	5	2025-11-24	254	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
606	2	2	1	2025-11-25	180	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
607	2	2	2	2025-11-25	184	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
608	2	2	3	2025-11-25	187	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
609	2	2	4	2025-11-25	341	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
610	2	2	5	2025-11-25	313	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
611	2	2	1	2025-11-26	236	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
612	2	2	2	2025-11-26	510	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
613	2	2	3	2025-11-26	950	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
614	2	2	4	2025-11-26	22	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
615	2	2	5	2025-11-26	839	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
616	2	2	1	2025-11-27	97	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
617	2	2	2	2025-11-27	638	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
618	2	2	3	2025-11-27	631	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
619	2	2	4	2025-11-27	417	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
620	2	2	5	2025-11-27	704	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
621	2	2	1	2025-11-28	499	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
622	2	2	2	2025-11-28	344	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
623	2	2	3	2025-11-28	20	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
624	2	2	4	2025-11-28	648	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
625	2	2	5	2025-11-28	426	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
626	2	2	1	2025-11-29	258	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
627	2	2	2	2025-11-29	93	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
628	2	2	3	2025-11-29	897	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
629	2	2	4	2025-11-29	224	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
630	2	2	5	2025-11-29	701	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
631	2	2	1	2025-11-30	838	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
632	2	2	2	2025-11-30	79	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
633	2	2	3	2025-11-30	474	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
634	2	2	4	2025-11-30	28	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
635	2	2	5	2025-11-30	644	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
636	2	2	1	2025-12-01	400	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
637	2	2	2	2025-12-01	947	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
638	2	2	3	2025-12-01	212	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
639	2	2	4	2025-12-01	488	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
640	2	2	5	2025-12-01	747	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
641	2	2	1	2025-12-02	67	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
642	2	2	2	2025-12-02	159	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
643	2	2	3	2025-12-02	348	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
644	2	2	4	2025-12-02	128	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
645	2	2	5	2025-12-02	464	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
646	2	2	1	2025-12-03	707	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
647	2	2	2	2025-12-03	444	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
648	2	2	3	2025-12-03	599	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
649	2	2	4	2025-12-03	161	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
650	2	2	5	2025-12-03	494	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
651	2	2	1	2025-12-04	897	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
652	2	2	2	2025-12-04	722	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
653	2	2	3	2025-12-04	77	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
654	2	2	4	2025-12-04	62	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
655	2	2	5	2025-12-04	561	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
656	2	2	1	2025-12-05	120	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
657	2	2	2	2025-12-05	834	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
658	2	2	3	2025-12-05	129	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
659	2	2	4	2025-12-05	979	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
660	2	2	5	2025-12-05	534	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
661	2	2	1	2025-12-06	707	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
662	2	2	2	2025-12-06	180	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
663	2	2	3	2025-12-06	283	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
664	2	2	4	2025-12-06	428	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
665	2	2	5	2025-12-06	829	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
666	2	2	1	2025-12-07	444	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
667	2	2	2	2025-12-07	735	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
668	2	2	3	2025-12-07	702	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
669	2	2	4	2025-12-07	783	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
670	2	2	5	2025-12-07	747	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
671	2	2	1	2025-12-08	727	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
672	2	2	2	2025-12-08	768	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
673	2	2	3	2025-12-08	158	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
674	2	2	4	2025-12-08	507	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
675	2	2	5	2025-12-08	55	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
676	2	2	1	2025-12-09	461	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
677	2	2	2	2025-12-09	42	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
678	2	2	3	2025-12-09	188	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
679	2	2	4	2025-12-09	515	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
680	2	2	5	2025-12-09	645	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
681	2	2	1	2025-12-10	314	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
682	2	2	2	2025-12-10	834	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
683	2	2	3	2025-12-10	346	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
684	2	2	4	2025-12-10	156	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
685	2	2	5	2025-12-10	133	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
686	2	2	1	2025-12-11	429	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
687	2	2	2	2025-12-11	281	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
688	2	2	3	2025-12-11	953	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
689	2	2	4	2025-12-11	521	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
690	2	2	5	2025-12-11	705	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
691	2	2	1	2025-12-12	48	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
692	2	2	2	2025-12-12	407	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
693	2	2	3	2025-12-12	814	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
694	2	2	4	2025-12-12	777	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
695	2	2	5	2025-12-12	620	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
696	2	2	1	2025-12-13	12	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
697	2	2	2	2025-12-13	218	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
698	2	2	3	2025-12-13	319	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
699	2	2	4	2025-12-13	375	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
700	2	2	5	2025-12-13	376	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
701	2	2	1	2025-12-14	293	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
702	2	2	2	2025-12-14	656	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
703	2	2	3	2025-12-14	849	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
704	2	2	4	2025-12-14	578	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
705	2	2	5	2025-12-14	208	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
706	2	2	1	2025-12-15	893	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
707	2	2	2	2025-12-15	960	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
708	2	2	3	2025-12-15	378	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
709	2	2	4	2025-12-15	583	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
710	2	2	5	2025-12-15	332	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
711	2	2	1	2025-12-16	309	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
712	2	2	2	2025-12-16	317	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
713	2	2	3	2025-12-16	340	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
714	2	2	4	2025-12-16	597	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
715	2	2	5	2025-12-16	986	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
716	2	2	1	2025-12-17	888	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
717	2	2	2	2025-12-17	721	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
718	2	2	3	2025-12-17	92	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
719	2	2	4	2025-12-17	51	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
720	2	2	5	2025-12-17	472	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
721	2	2	1	2025-12-18	717	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
722	2	2	2	2025-12-18	773	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
723	2	2	3	2025-12-18	720	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
724	2	2	4	2025-12-18	342	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
725	2	2	5	2025-12-18	271	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
726	2	2	1	2025-12-19	78	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
727	2	2	2	2025-12-19	333	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
728	2	2	3	2025-12-19	652	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
729	2	2	4	2025-12-19	538	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
730	2	2	5	2025-12-19	607	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
731	2	2	1	2025-12-20	940	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
732	2	2	2	2025-12-20	48	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
733	2	2	3	2025-12-20	28	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
734	2	2	4	2025-12-20	16	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
735	2	2	5	2025-12-20	961	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
736	2	2	1	2025-12-21	383	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
737	2	2	2	2025-12-21	908	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
738	2	2	3	2025-12-21	64	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
739	2	2	4	2025-12-21	444	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
740	2	2	5	2025-12-21	492	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
741	2	2	1	2025-12-22	502	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
742	2	2	2	2025-12-22	266	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
743	2	2	3	2025-12-22	220	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
744	2	2	4	2025-12-22	647	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
745	2	2	5	2025-12-22	85	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
746	2	2	1	2025-12-23	885	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
747	2	2	2	2025-12-23	378	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
748	2	2	3	2025-12-23	898	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
749	2	2	4	2025-12-23	298	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
750	2	2	5	2025-12-23	531	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
751	2	2	1	2025-12-24	645	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
752	2	2	2	2025-12-24	158	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
753	2	2	3	2025-12-24	32	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
754	2	2	4	2025-12-24	43	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
755	2	2	5	2025-12-24	703	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
756	2	2	1	2025-12-25	99	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
757	2	2	2	2025-12-25	95	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
758	2	2	3	2025-12-25	411	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
759	2	2	4	2025-12-25	11	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
760	2	2	5	2025-12-25	320	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
761	2	2	1	2025-12-26	563	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
762	2	2	2	2025-12-26	916	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
763	2	2	3	2025-12-26	412	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
764	2	2	4	2025-12-26	311	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
765	2	2	5	2025-12-26	911	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
766	2	2	1	2025-12-27	785	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
767	2	2	2	2025-12-27	828	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
768	2	2	3	2025-12-27	134	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
769	2	2	4	2025-12-27	328	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
770	2	2	5	2025-12-27	86	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
771	2	2	1	2025-12-28	977	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
772	2	2	2	2025-12-28	799	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
773	2	2	3	2025-12-28	723	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
774	2	2	4	2025-12-28	114	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
775	2	2	5	2025-12-28	858	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
776	2	2	1	2025-12-29	944	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
777	2	2	2	2025-12-29	951	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
778	2	2	3	2025-12-29	180	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
779	2	2	4	2025-12-29	96	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
780	2	2	5	2025-12-29	11	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
781	2	2	1	2025-12-30	638	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
782	2	2	2	2025-12-30	511	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
783	2	2	3	2025-12-30	554	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
784	2	2	4	2025-12-30	769	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
785	2	2	5	2025-12-30	775	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
786	2	2	1	2025-12-31	989	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
787	2	2	2	2025-12-31	167	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
788	2	2	3	2025-12-31	137	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
789	2	2	4	2025-12-31	413	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
790	2	2	5	2025-12-31	483	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
791	2	2	1	2026-01-01	671	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
792	2	2	2	2026-01-01	80	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
793	2	2	3	2026-01-01	866	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
794	2	2	4	2026-01-01	784	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
795	2	2	5	2026-01-01	721	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
796	2	2	1	2026-01-02	433	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
797	2	2	2	2026-01-02	937	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
798	2	2	3	2026-01-02	127	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
799	2	2	4	2026-01-02	317	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
800	2	2	5	2026-01-02	960	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
801	2	2	1	2026-01-03	763	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
802	2	2	2	2026-01-03	79	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
803	2	2	3	2026-01-03	917	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
804	2	2	4	2026-01-03	289	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
805	2	2	5	2026-01-03	512	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
806	2	2	1	2026-01-04	264	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
807	2	2	2	2026-01-04	816	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
808	2	2	3	2026-01-04	234	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
809	2	2	4	2026-01-04	37	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
810	2	2	5	2026-01-04	553	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
811	2	2	1	2026-01-05	961	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
812	2	2	2	2026-01-05	562	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
813	2	2	3	2026-01-05	34	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
814	2	2	4	2026-01-05	472	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
815	2	2	5	2026-01-05	666	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
816	2	2	1	2026-01-06	337	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
817	2	2	2	2026-01-06	323	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
818	2	2	3	2026-01-06	774	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
819	2	2	4	2026-01-06	606	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
820	2	2	5	2026-01-06	740	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
821	2	2	1	2026-01-07	436	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
822	2	2	2	2026-01-07	512	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
823	2	2	3	2026-01-07	756	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
824	2	2	4	2026-01-07	78	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
825	2	2	5	2026-01-07	881	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
826	2	2	1	2026-01-08	934	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
827	2	2	2	2026-01-08	865	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
828	2	2	3	2026-01-08	520	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
829	2	2	4	2026-01-08	837	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
830	2	2	5	2026-01-08	542	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
831	2	2	1	2026-01-09	257	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
832	2	2	2	2026-01-09	320	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
833	2	2	3	2026-01-09	623	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
834	2	2	4	2026-01-09	112	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
835	2	2	5	2026-01-09	385	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
836	2	2	1	2026-01-10	708	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
837	2	2	2	2026-01-10	380	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
838	2	2	3	2026-01-10	145	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
839	2	2	4	2026-01-10	506	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
840	2	2	5	2026-01-10	498	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
841	1	3	1	2025-10-19	870	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
842	1	3	2	2025-10-19	57	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
843	1	3	3	2025-10-19	630	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
844	1	3	4	2025-10-19	515	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
845	1	3	5	2025-10-19	477	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
846	1	3	1	2025-10-20	649	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
847	1	3	2	2025-10-20	289	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
848	1	3	3	2025-10-20	104	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
849	1	3	4	2025-10-20	949	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
850	1	3	5	2025-10-20	278	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
851	1	3	1	2025-10-21	327	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
852	1	3	2	2025-10-21	174	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
853	1	3	3	2025-10-21	763	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
854	1	3	4	2025-10-21	859	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
855	1	3	5	2025-10-21	439	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
856	1	3	1	2025-10-22	908	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
857	1	3	2	2025-10-22	217	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
858	1	3	3	2025-10-22	699	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
859	1	3	4	2025-10-22	162	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
860	1	3	5	2025-10-22	271	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
861	1	3	1	2025-10-23	919	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
862	1	3	2	2025-10-23	461	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
863	1	3	3	2025-10-23	300	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
864	1	3	4	2025-10-23	669	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
865	1	3	5	2025-10-23	439	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
866	1	3	1	2025-10-24	30	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
867	1	3	2	2025-10-24	387	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
868	1	3	3	2025-10-24	463	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
869	1	3	4	2025-10-24	484	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
870	1	3	5	2025-10-24	65	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
871	1	3	1	2025-10-25	630	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
872	1	3	2	2025-10-25	779	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
873	1	3	3	2025-10-25	782	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
874	1	3	4	2025-10-25	879	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
875	1	3	5	2025-10-25	548	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
876	1	3	1	2025-10-26	124	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
877	1	3	2	2025-10-26	733	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
878	1	3	3	2025-10-26	750	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
879	1	3	4	2025-10-26	258	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
880	1	3	5	2025-10-26	402	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
881	1	3	1	2025-10-27	735	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
882	1	3	2	2025-10-27	377	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
883	1	3	3	2025-10-27	325	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
884	1	3	4	2025-10-27	523	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
885	1	3	5	2025-10-27	396	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
886	1	3	1	2025-10-28	31	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
887	1	3	2	2025-10-28	918	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
888	1	3	3	2025-10-28	153	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
889	1	3	4	2025-10-28	518	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
890	1	3	5	2025-10-28	126	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
891	1	3	1	2025-10-29	737	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
892	1	3	2	2025-10-29	247	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
893	1	3	3	2025-10-29	766	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
894	1	3	4	2025-10-29	770	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
895	1	3	5	2025-10-29	273	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
896	1	3	1	2025-10-30	334	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
897	1	3	2	2025-10-30	226	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
898	1	3	3	2025-10-30	127	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
899	1	3	4	2025-10-30	256	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
900	1	3	5	2025-10-30	19	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
901	1	3	1	2025-10-31	725	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
902	1	3	2	2025-10-31	619	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
903	1	3	3	2025-10-31	330	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
904	1	3	4	2025-10-31	862	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
905	1	3	5	2025-10-31	616	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
906	1	3	1	2025-11-01	783	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
907	1	3	2	2025-11-01	951	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
908	1	3	3	2025-11-01	953	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
909	1	3	4	2025-11-01	106	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
910	1	3	5	2025-11-01	721	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
911	1	3	1	2025-11-02	595	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
912	1	3	2	2025-11-02	113	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
913	1	3	3	2025-11-02	694	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
914	1	3	4	2025-11-02	280	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
915	1	3	5	2025-11-02	821	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
916	1	3	1	2025-11-03	533	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
917	1	3	2	2025-11-03	824	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
918	1	3	3	2025-11-03	157	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
919	1	3	4	2025-11-03	44	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
920	1	3	5	2025-11-03	132	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
921	1	3	1	2025-11-04	838	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
922	1	3	2	2025-11-04	467	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
923	1	3	3	2025-11-04	273	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
924	1	3	4	2025-11-04	741	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
925	1	3	5	2025-11-04	627	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
926	1	3	1	2025-11-05	948	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
927	1	3	2	2025-11-05	121	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
928	1	3	3	2025-11-05	108	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
929	1	3	4	2025-11-05	331	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
930	1	3	5	2025-11-05	334	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
931	1	3	1	2025-11-06	116	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
932	1	3	2	2025-11-06	694	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
933	1	3	3	2025-11-06	722	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
934	1	3	4	2025-11-06	812	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
935	1	3	5	2025-11-06	695	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
936	1	3	1	2025-11-07	217	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
937	1	3	2	2025-11-07	774	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
938	1	3	3	2025-11-07	605	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
939	1	3	4	2025-11-07	835	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
940	1	3	5	2025-11-07	502	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
941	1	3	1	2025-11-08	436	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
942	1	3	2	2025-11-08	483	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
943	1	3	3	2025-11-08	196	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
944	1	3	4	2025-11-08	495	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
945	1	3	5	2025-11-08	974	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
946	1	3	1	2025-11-09	725	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
947	1	3	2	2025-11-09	773	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
948	1	3	3	2025-11-09	332	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
949	1	3	4	2025-11-09	581	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
950	1	3	5	2025-11-09	307	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
951	1	3	1	2025-11-10	413	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
952	1	3	2	2025-11-10	296	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
953	1	3	3	2025-11-10	282	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
954	1	3	4	2025-11-10	650	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
955	1	3	5	2025-11-10	866	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
956	1	3	1	2025-11-11	410	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
957	1	3	2	2025-11-11	172	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
958	1	3	3	2025-11-11	661	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
959	1	3	4	2025-11-11	131	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
960	1	3	5	2025-11-11	421	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
961	1	3	1	2025-11-12	315	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
962	1	3	2	2025-11-12	366	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
963	1	3	3	2025-11-12	154	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
964	1	3	4	2025-11-12	686	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
965	1	3	5	2025-11-12	888	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
966	1	3	1	2025-11-13	158	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
967	1	3	2	2025-11-13	407	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
968	1	3	3	2025-11-13	515	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
969	1	3	4	2025-11-13	303	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
970	1	3	5	2025-11-13	232	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
971	1	3	1	2025-11-14	34	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
972	1	3	2	2025-11-14	873	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
973	1	3	3	2025-11-14	557	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
974	1	3	4	2025-11-14	71	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
975	1	3	5	2025-11-14	640	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
976	1	3	1	2025-11-15	479	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
977	1	3	2	2025-11-15	699	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
978	1	3	3	2025-11-15	436	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
979	1	3	4	2025-11-15	193	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
980	1	3	5	2025-11-15	698	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
981	1	3	1	2025-11-16	569	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
982	1	3	2	2025-11-16	800	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
983	1	3	3	2025-11-16	552	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
984	1	3	4	2025-11-16	652	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
985	1	3	5	2025-11-16	259	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
986	1	3	1	2025-11-17	490	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
987	1	3	2	2025-11-17	859	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
988	1	3	3	2025-11-17	853	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
989	1	3	4	2025-11-17	599	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
990	1	3	5	2025-11-17	857	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
991	1	3	1	2025-11-18	749	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
992	1	3	2	2025-11-18	812	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
993	1	3	3	2025-11-18	234	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
994	1	3	4	2025-11-18	360	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
995	1	3	5	2025-11-18	488	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
996	1	3	1	2025-11-19	28	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
997	1	3	2	2025-11-19	264	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
998	1	3	3	2025-11-19	152	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
999	1	3	4	2025-11-19	438	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1000	1	3	5	2025-11-19	843	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1001	1	3	1	2025-11-20	710	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1002	1	3	2	2025-11-20	725	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1003	1	3	3	2025-11-20	986	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1004	1	3	4	2025-11-20	55	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1005	1	3	5	2025-11-20	971	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1006	1	3	1	2025-11-21	673	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1007	1	3	2	2025-11-21	561	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1008	1	3	3	2025-11-21	183	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1009	1	3	4	2025-11-21	507	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1010	1	3	5	2025-11-21	145	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1011	1	3	1	2025-11-22	541	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1012	1	3	2	2025-11-22	355	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1013	1	3	3	2025-11-22	950	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1014	1	3	4	2025-11-22	800	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1015	1	3	5	2025-11-22	508	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1016	1	3	1	2025-11-23	837	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1017	1	3	2	2025-11-23	762	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1018	1	3	3	2025-11-23	194	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1019	1	3	4	2025-11-23	426	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1020	1	3	5	2025-11-23	361	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1021	1	3	1	2025-11-24	719	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1022	1	3	2	2025-11-24	855	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1023	1	3	3	2025-11-24	436	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1024	1	3	4	2025-11-24	990	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1025	1	3	5	2025-11-24	571	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1026	1	3	1	2025-11-25	656	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1027	1	3	2	2025-11-25	148	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1028	1	3	3	2025-11-25	354	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1029	1	3	4	2025-11-25	325	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1030	1	3	5	2025-11-25	421	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1031	1	3	1	2025-11-26	381	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1032	1	3	2	2025-11-26	616	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1033	1	3	3	2025-11-26	763	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1034	1	3	4	2025-11-26	230	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1035	1	3	5	2025-11-26	253	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1036	1	3	1	2025-11-27	531	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1037	1	3	2	2025-11-27	967	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1038	1	3	3	2025-11-27	190	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1039	1	3	4	2025-11-27	823	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1040	1	3	5	2025-11-27	964	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1041	1	3	1	2025-11-28	444	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1042	1	3	2	2025-11-28	662	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1043	1	3	3	2025-11-28	807	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1044	1	3	4	2025-11-28	795	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1045	1	3	5	2025-11-28	119	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1046	1	3	1	2025-11-29	873	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1047	1	3	2	2025-11-29	925	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1048	1	3	3	2025-11-29	140	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1049	1	3	4	2025-11-29	149	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1050	1	3	5	2025-11-29	931	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1051	1	3	1	2025-11-30	884	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1052	1	3	2	2025-11-30	602	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1053	1	3	3	2025-11-30	657	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1054	1	3	4	2025-11-30	804	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1055	1	3	5	2025-11-30	643	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1056	1	3	1	2025-12-01	925	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1057	1	3	2	2025-12-01	327	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1058	1	3	3	2025-12-01	467	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1059	1	3	4	2025-12-01	523	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1060	1	3	5	2025-12-01	187	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1061	1	3	1	2025-12-02	20	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1062	1	3	2	2025-12-02	418	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1063	1	3	3	2025-12-02	461	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1064	1	3	4	2025-12-02	175	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1065	1	3	5	2025-12-02	327	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1066	1	3	1	2025-12-03	191	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1067	1	3	2	2025-12-03	654	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1068	1	3	3	2025-12-03	124	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1069	1	3	4	2025-12-03	57	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1070	1	3	5	2025-12-03	825	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1071	1	3	1	2025-12-04	696	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1072	1	3	2	2025-12-04	447	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1073	1	3	3	2025-12-04	564	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1074	1	3	4	2025-12-04	641	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1075	1	3	5	2025-12-04	360	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1076	1	3	1	2025-12-05	19	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1077	1	3	2	2025-12-05	821	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1078	1	3	3	2025-12-05	386	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1079	1	3	4	2025-12-05	105	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1080	1	3	5	2025-12-05	267	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1081	1	3	1	2025-12-06	422	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1082	1	3	2	2025-12-06	905	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1083	1	3	3	2025-12-06	335	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1084	1	3	4	2025-12-06	636	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1085	1	3	5	2025-12-06	233	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1086	1	3	1	2025-12-07	766	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1087	1	3	2	2025-12-07	309	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1088	1	3	3	2025-12-07	424	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1089	1	3	4	2025-12-07	562	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1090	1	3	5	2025-12-07	947	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1091	1	3	1	2025-12-08	47	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1092	1	3	2	2025-12-08	867	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1093	1	3	3	2025-12-08	642	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1094	1	3	4	2025-12-08	375	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1095	1	3	5	2025-12-08	410	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1096	1	3	1	2025-12-09	684	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1097	1	3	2	2025-12-09	354	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1098	1	3	3	2025-12-09	69	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1099	1	3	4	2025-12-09	951	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1100	1	3	5	2025-12-09	769	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1101	1	3	1	2025-12-10	626	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1102	1	3	2	2025-12-10	279	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1103	1	3	3	2025-12-10	874	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1104	1	3	4	2025-12-10	682	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1105	1	3	5	2025-12-10	366	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1106	1	3	1	2025-12-11	892	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1107	1	3	2	2025-12-11	842	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1108	1	3	3	2025-12-11	26	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1109	1	3	4	2025-12-11	607	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1110	1	3	5	2025-12-11	200	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1111	1	3	1	2025-12-12	133	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1112	1	3	2	2025-12-12	754	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1113	1	3	3	2025-12-12	995	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1114	1	3	4	2025-12-12	293	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1115	1	3	5	2025-12-12	236	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1116	1	3	1	2025-12-13	721	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1117	1	3	2	2025-12-13	340	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1118	1	3	3	2025-12-13	970	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1119	1	3	4	2025-12-13	138	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1120	1	3	5	2025-12-13	462	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1121	1	3	1	2025-12-14	775	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1122	1	3	2	2025-12-14	570	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1123	1	3	3	2025-12-14	934	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1124	1	3	4	2025-12-14	133	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1125	1	3	5	2025-12-14	117	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1126	1	3	1	2025-12-15	250	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1127	1	3	2	2025-12-15	731	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1128	1	3	3	2025-12-15	680	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1129	1	3	4	2025-12-15	766	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1130	1	3	5	2025-12-15	310	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1131	1	3	1	2025-12-16	410	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1132	1	3	2	2025-12-16	553	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1133	1	3	3	2025-12-16	693	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1134	1	3	4	2025-12-16	227	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1135	1	3	5	2025-12-16	434	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1136	1	3	1	2025-12-17	815	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1137	1	3	2	2025-12-17	388	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1138	1	3	3	2025-12-17	426	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1139	1	3	4	2025-12-17	418	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1140	1	3	5	2025-12-17	815	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1141	1	3	1	2025-12-18	903	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1142	1	3	2	2025-12-18	604	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1143	1	3	3	2025-12-18	552	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1144	1	3	4	2025-12-18	691	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1145	1	3	5	2025-12-18	310	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1146	1	3	1	2025-12-19	441	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1147	1	3	2	2025-12-19	391	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1148	1	3	3	2025-12-19	662	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1149	1	3	4	2025-12-19	737	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1150	1	3	5	2025-12-19	414	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1151	1	3	1	2025-12-20	242	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1152	1	3	2	2025-12-20	98	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1153	1	3	3	2025-12-20	976	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1154	1	3	4	2025-12-20	561	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1155	1	3	5	2025-12-20	214	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1156	1	3	1	2025-12-21	310	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1157	1	3	2	2025-12-21	609	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1158	1	3	3	2025-12-21	162	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1159	1	3	4	2025-12-21	623	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1160	1	3	5	2025-12-21	855	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1161	1	3	1	2025-12-22	706	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1162	1	3	2	2025-12-22	841	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1163	1	3	3	2025-12-22	940	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1164	1	3	4	2025-12-22	249	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1165	1	3	5	2025-12-22	890	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1166	1	3	1	2025-12-23	546	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1167	1	3	2	2025-12-23	738	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1168	1	3	3	2025-12-23	145	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1169	1	3	4	2025-12-23	112	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1170	1	3	5	2025-12-23	292	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1171	1	3	1	2025-12-24	761	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1172	1	3	2	2025-12-24	643	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1173	1	3	3	2025-12-24	830	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1174	1	3	4	2025-12-24	683	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1175	1	3	5	2025-12-24	762	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1176	1	3	1	2025-12-25	105	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1177	1	3	2	2025-12-25	735	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1178	1	3	3	2025-12-25	146	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1179	1	3	4	2025-12-25	24	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1180	1	3	5	2025-12-25	452	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1181	1	3	1	2025-12-26	219	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1182	1	3	2	2025-12-26	668	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1183	1	3	3	2025-12-26	886	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1184	1	3	4	2025-12-26	89	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1185	1	3	5	2025-12-26	610	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1186	1	3	1	2025-12-27	904	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1187	1	3	2	2025-12-27	594	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1188	1	3	3	2025-12-27	527	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1189	1	3	4	2025-12-27	44	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1190	1	3	5	2025-12-27	59	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1191	1	3	1	2025-12-28	777	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1192	1	3	2	2025-12-28	743	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1193	1	3	3	2025-12-28	91	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1194	1	3	4	2025-12-28	348	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1195	1	3	5	2025-12-28	926	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1196	1	3	1	2025-12-29	365	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1197	1	3	2	2025-12-29	770	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1198	1	3	3	2025-12-29	623	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1199	1	3	4	2025-12-29	114	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1200	1	3	5	2025-12-29	763	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1201	1	3	1	2025-12-30	214	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1202	1	3	2	2025-12-30	260	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1203	1	3	3	2025-12-30	523	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1204	1	3	4	2025-12-30	885	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1205	1	3	5	2025-12-30	408	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1206	1	3	1	2025-12-31	169	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1207	1	3	2	2025-12-31	730	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1208	1	3	3	2025-12-31	852	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1209	1	3	4	2025-12-31	434	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1210	1	3	5	2025-12-31	313	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1211	1	3	1	2026-01-01	667	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1212	1	3	2	2026-01-01	34	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1213	1	3	3	2026-01-01	260	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1214	1	3	4	2026-01-01	731	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1215	1	3	5	2026-01-01	202	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1216	1	3	1	2026-01-02	408	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1217	1	3	2	2026-01-02	833	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1218	1	3	3	2026-01-02	65	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1219	1	3	4	2026-01-02	737	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1220	1	3	5	2026-01-02	673	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1221	1	3	1	2026-01-03	515	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1222	1	3	2	2026-01-03	781	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1223	1	3	3	2026-01-03	490	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1224	1	3	4	2026-01-03	49	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1225	1	3	5	2026-01-03	279	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1226	1	3	1	2026-01-04	521	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1227	1	3	2	2026-01-04	668	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1228	1	3	3	2026-01-04	958	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1229	1	3	4	2026-01-04	464	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1230	1	3	5	2026-01-04	204	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1231	1	3	1	2026-01-05	71	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1232	1	3	2	2026-01-05	146	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1233	1	3	3	2026-01-05	788	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1234	1	3	4	2026-01-05	641	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1235	1	3	5	2026-01-05	308	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1236	1	3	1	2026-01-06	448	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1237	1	3	2	2026-01-06	499	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1238	1	3	3	2026-01-06	294	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1239	1	3	4	2026-01-06	46	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1240	1	3	5	2026-01-06	873	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1241	1	3	1	2026-01-07	987	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1242	1	3	2	2026-01-07	881	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1243	1	3	3	2026-01-07	696	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1244	1	3	4	2026-01-07	804	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1245	1	3	5	2026-01-07	870	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1246	1	3	1	2026-01-08	530	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1247	1	3	2	2026-01-08	488	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1248	1	3	3	2026-01-08	804	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1249	1	3	4	2026-01-08	766	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1250	1	3	5	2026-01-08	249	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1251	1	3	1	2026-01-09	944	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1252	1	3	2	2026-01-09	835	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1253	1	3	3	2026-01-09	607	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1254	1	3	4	2026-01-09	186	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1255	1	3	5	2026-01-09	49	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1256	1	3	1	2026-01-10	825	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1257	1	3	2	2026-01-10	282	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1258	1	3	3	2026-01-10	228	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1259	1	3	4	2026-01-10	280	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1260	1	3	5	2026-01-10	932	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1261	1	4	1	2025-10-19	474	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1262	1	4	2	2025-10-19	363	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1263	1	4	3	2025-10-19	376	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1264	1	4	4	2025-10-19	154	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1265	1	4	5	2025-10-19	256	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1266	1	4	1	2025-10-20	949	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1267	1	4	2	2025-10-20	208	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1268	1	4	3	2025-10-20	380	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1269	1	4	4	2025-10-20	399	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1270	1	4	5	2025-10-20	51	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1271	1	4	1	2025-10-21	603	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1272	1	4	2	2025-10-21	409	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1273	1	4	3	2025-10-21	317	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1274	1	4	4	2025-10-21	607	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1275	1	4	5	2025-10-21	23	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1276	1	4	1	2025-10-22	357	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1277	1	4	2	2025-10-22	70	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1278	1	4	3	2025-10-22	196	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1279	1	4	4	2025-10-22	414	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1280	1	4	5	2025-10-22	627	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1281	1	4	1	2025-10-23	234	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1282	1	4	2	2025-10-23	371	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1283	1	4	3	2025-10-23	848	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1284	1	4	4	2025-10-23	210	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1285	1	4	5	2025-10-23	580	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1286	1	4	1	2025-10-24	552	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1287	1	4	2	2025-10-24	536	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1288	1	4	3	2025-10-24	782	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1289	1	4	4	2025-10-24	604	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1290	1	4	5	2025-10-24	917	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1291	1	4	1	2025-10-25	926	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1292	1	4	2	2025-10-25	564	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1293	1	4	3	2025-10-25	223	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1294	1	4	4	2025-10-25	752	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1295	1	4	5	2025-10-25	211	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1296	1	4	1	2025-10-26	36	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1297	1	4	2	2025-10-26	102	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1298	1	4	3	2025-10-26	412	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1299	1	4	4	2025-10-26	441	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1300	1	4	5	2025-10-26	668	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1301	1	4	1	2025-10-27	778	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1302	1	4	2	2025-10-27	527	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1303	1	4	3	2025-10-27	336	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1304	1	4	4	2025-10-27	114	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1305	1	4	5	2025-10-27	710	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1306	1	4	1	2025-10-28	872	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1307	1	4	2	2025-10-28	803	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1308	1	4	3	2025-10-28	952	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1309	1	4	4	2025-10-28	343	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1310	1	4	5	2025-10-28	202	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1311	1	4	1	2025-10-29	452	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1312	1	4	2	2025-10-29	247	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1313	1	4	3	2025-10-29	417	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1314	1	4	4	2025-10-29	838	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1315	1	4	5	2025-10-29	76	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1316	1	4	1	2025-10-30	654	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1317	1	4	2	2025-10-30	56	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1318	1	4	3	2025-10-30	821	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1319	1	4	4	2025-10-30	620	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1320	1	4	5	2025-10-30	605	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1321	1	4	1	2025-10-31	153	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1322	1	4	2	2025-10-31	669	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1323	1	4	3	2025-10-31	19	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1324	1	4	4	2025-10-31	769	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1325	1	4	5	2025-10-31	421	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1326	1	4	1	2025-11-01	737	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1327	1	4	2	2025-11-01	752	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1328	1	4	3	2025-11-01	971	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1329	1	4	4	2025-11-01	318	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1330	1	4	5	2025-11-01	588	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1331	1	4	1	2025-11-02	968	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1332	1	4	2	2025-11-02	255	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1333	1	4	3	2025-11-02	944	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1334	1	4	4	2025-11-02	740	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1335	1	4	5	2025-11-02	724	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1336	1	4	1	2025-11-03	569	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1337	1	4	2	2025-11-03	690	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1338	1	4	3	2025-11-03	234	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1339	1	4	4	2025-11-03	276	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1340	1	4	5	2025-11-03	742	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1341	1	4	1	2025-11-04	279	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1342	1	4	2	2025-11-04	473	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1343	1	4	3	2025-11-04	271	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1344	1	4	4	2025-11-04	66	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1345	1	4	5	2025-11-04	788	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1346	1	4	1	2025-11-05	398	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1347	1	4	2	2025-11-05	862	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1348	1	4	3	2025-11-05	161	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1349	1	4	4	2025-11-05	66	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1350	1	4	5	2025-11-05	851	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1351	1	4	1	2025-11-06	508	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1352	1	4	2	2025-11-06	728	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1353	1	4	3	2025-11-06	428	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1354	1	4	4	2025-11-06	433	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1355	1	4	5	2025-11-06	443	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1356	1	4	1	2025-11-07	636	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1357	1	4	2	2025-11-07	455	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1358	1	4	3	2025-11-07	572	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1359	1	4	4	2025-11-07	666	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1360	1	4	5	2025-11-07	354	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1361	1	4	1	2025-11-08	444	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1362	1	4	2	2025-11-08	343	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1363	1	4	3	2025-11-08	451	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1364	1	4	4	2025-11-08	993	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1365	1	4	5	2025-11-08	151	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1366	1	4	1	2025-11-09	11	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1367	1	4	2	2025-11-09	126	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1368	1	4	3	2025-11-09	128	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1369	1	4	4	2025-11-09	740	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1370	1	4	5	2025-11-09	589	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1371	1	4	1	2025-11-10	103	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1372	1	4	2	2025-11-10	904	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1373	1	4	3	2025-11-10	517	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1374	1	4	4	2025-11-10	128	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1375	1	4	5	2025-11-10	939	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1376	1	4	1	2025-11-11	34	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1377	1	4	2	2025-11-11	376	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1378	1	4	3	2025-11-11	29	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1379	1	4	4	2025-11-11	560	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1380	1	4	5	2025-11-11	195	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1381	1	4	1	2025-11-12	374	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1382	1	4	2	2025-11-12	721	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1383	1	4	3	2025-11-12	458	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1384	1	4	4	2025-11-12	312	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1385	1	4	5	2025-11-12	953	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1386	1	4	1	2025-11-13	22	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1387	1	4	2	2025-11-13	243	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1388	1	4	3	2025-11-13	125	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1389	1	4	4	2025-11-13	920	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1390	1	4	5	2025-11-13	766	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1391	1	4	1	2025-11-14	119	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1392	1	4	2	2025-11-14	538	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1393	1	4	3	2025-11-14	793	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1394	1	4	4	2025-11-14	35	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1395	1	4	5	2025-11-14	194	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1396	1	4	1	2025-11-15	785	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1397	1	4	2	2025-11-15	823	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1398	1	4	3	2025-11-15	592	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1399	1	4	4	2025-11-15	261	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1400	1	4	5	2025-11-15	882	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1401	1	4	1	2025-11-16	127	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1402	1	4	2	2025-11-16	15	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1403	1	4	3	2025-11-16	132	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1404	1	4	4	2025-11-16	592	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1405	1	4	5	2025-11-16	480	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1406	1	4	1	2025-11-17	64	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1407	1	4	2	2025-11-17	55	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1408	1	4	3	2025-11-17	817	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1409	1	4	4	2025-11-17	741	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1410	1	4	5	2025-11-17	889	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1411	1	4	1	2025-11-18	975	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1412	1	4	2	2025-11-18	355	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1413	1	4	3	2025-11-18	588	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1414	1	4	4	2025-11-18	15	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1415	1	4	5	2025-11-18	517	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1416	1	4	1	2025-11-19	240	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1417	1	4	2	2025-11-19	636	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1418	1	4	3	2025-11-19	745	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1419	1	4	4	2025-11-19	790	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1420	1	4	5	2025-11-19	961	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1421	1	4	1	2025-11-20	765	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1422	1	4	2	2025-11-20	320	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1423	1	4	3	2025-11-20	224	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1424	1	4	4	2025-11-20	129	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1425	1	4	5	2025-11-20	657	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1426	1	4	1	2025-11-21	421	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1427	1	4	2	2025-11-21	361	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1428	1	4	3	2025-11-21	345	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1429	1	4	4	2025-11-21	765	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1430	1	4	5	2025-11-21	387	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1431	1	4	1	2025-11-22	212	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1432	1	4	2	2025-11-22	211	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1433	1	4	3	2025-11-22	963	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1434	1	4	4	2025-11-22	61	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1435	1	4	5	2025-11-22	630	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1436	1	4	1	2025-11-23	82	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1437	1	4	2	2025-11-23	943	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1438	1	4	3	2025-11-23	269	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1439	1	4	4	2025-11-23	325	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1440	1	4	5	2025-11-23	337	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1441	1	4	1	2025-11-24	987	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1442	1	4	2	2025-11-24	203	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1443	1	4	3	2025-11-24	666	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1444	1	4	4	2025-11-24	496	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1445	1	4	5	2025-11-24	368	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1446	1	4	1	2025-11-25	865	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1447	1	4	2	2025-11-25	37	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1448	1	4	3	2025-11-25	705	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1449	1	4	4	2025-11-25	437	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1450	1	4	5	2025-11-25	199	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1451	1	4	1	2025-11-26	435	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1452	1	4	2	2025-11-26	90	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1453	1	4	3	2025-11-26	322	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1454	1	4	4	2025-11-26	758	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1455	1	4	5	2025-11-26	501	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1456	1	4	1	2025-11-27	900	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1457	1	4	2	2025-11-27	470	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1458	1	4	3	2025-11-27	370	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1459	1	4	4	2025-11-27	657	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1460	1	4	5	2025-11-27	771	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1461	1	4	1	2025-11-28	861	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1462	1	4	2	2025-11-28	339	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1463	1	4	3	2025-11-28	157	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1464	1	4	4	2025-11-28	634	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1465	1	4	5	2025-11-28	667	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1466	1	4	1	2025-11-29	704	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1467	1	4	2	2025-11-29	144	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1468	1	4	3	2025-11-29	492	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1469	1	4	4	2025-11-29	592	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1470	1	4	5	2025-11-29	360	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1471	1	4	1	2025-11-30	971	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1472	1	4	2	2025-11-30	132	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1473	1	4	3	2025-11-30	821	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1474	1	4	4	2025-11-30	418	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1475	1	4	5	2025-11-30	608	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1476	1	4	1	2025-12-01	412	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1477	1	4	2	2025-12-01	485	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1478	1	4	3	2025-12-01	479	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1479	1	4	4	2025-12-01	165	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1480	1	4	5	2025-12-01	27	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1481	1	4	1	2025-12-02	868	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1482	1	4	2	2025-12-02	900	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1483	1	4	3	2025-12-02	243	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1484	1	4	4	2025-12-02	724	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1485	1	4	5	2025-12-02	23	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1486	1	4	1	2025-12-03	513	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1487	1	4	2	2025-12-03	307	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1488	1	4	3	2025-12-03	44	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1489	1	4	4	2025-12-03	648	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1490	1	4	5	2025-12-03	153	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1491	1	4	1	2025-12-04	174	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1492	1	4	2	2025-12-04	349	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1493	1	4	3	2025-12-04	802	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1494	1	4	4	2025-12-04	656	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1495	1	4	5	2025-12-04	895	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1496	1	4	1	2025-12-05	969	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1497	1	4	2	2025-12-05	857	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1498	1	4	3	2025-12-05	784	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1499	1	4	4	2025-12-05	33	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1500	1	4	5	2025-12-05	548	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1501	1	4	1	2025-12-06	768	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1502	1	4	2	2025-12-06	549	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1503	1	4	3	2025-12-06	361	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1504	1	4	4	2025-12-06	952	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1505	1	4	5	2025-12-06	121	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1506	1	4	1	2025-12-07	299	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1507	1	4	2	2025-12-07	822	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1508	1	4	3	2025-12-07	491	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1509	1	4	4	2025-12-07	936	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1510	1	4	5	2025-12-07	480	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1511	1	4	1	2025-12-08	818	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1512	1	4	2	2025-12-08	749	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1513	1	4	3	2025-12-08	553	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1514	1	4	4	2025-12-08	728	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1515	1	4	5	2025-12-08	253	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1516	1	4	1	2025-12-09	373	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1517	1	4	2	2025-12-09	737	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1518	1	4	3	2025-12-09	422	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1519	1	4	4	2025-12-09	512	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1520	1	4	5	2025-12-09	960	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1521	1	4	1	2025-12-10	599	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1522	1	4	2	2025-12-10	51	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1523	1	4	3	2025-12-10	212	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1524	1	4	4	2025-12-10	800	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1525	1	4	5	2025-12-10	823	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1526	1	4	1	2025-12-11	239	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1527	1	4	2	2025-12-11	753	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1528	1	4	3	2025-12-11	109	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1529	1	4	4	2025-12-11	838	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1530	1	4	5	2025-12-11	313	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1531	1	4	1	2025-12-12	812	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1532	1	4	2	2025-12-12	771	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1533	1	4	3	2025-12-12	427	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1534	1	4	4	2025-12-12	41	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1535	1	4	5	2025-12-12	945	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1536	1	4	1	2025-12-13	437	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1537	1	4	2	2025-12-13	152	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1538	1	4	3	2025-12-13	416	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1539	1	4	4	2025-12-13	601	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1540	1	4	5	2025-12-13	710	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1541	1	4	1	2025-12-14	353	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1542	1	4	2	2025-12-14	951	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1543	1	4	3	2025-12-14	711	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1544	1	4	4	2025-12-14	173	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1545	1	4	5	2025-12-14	946	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1546	1	4	1	2025-12-15	13	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1547	1	4	2	2025-12-15	885	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1548	1	4	3	2025-12-15	533	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1549	1	4	4	2025-12-15	182	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1550	1	4	5	2025-12-15	402	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1551	1	4	1	2025-12-16	619	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1552	1	4	2	2025-12-16	429	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1553	1	4	3	2025-12-16	489	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1554	1	4	4	2025-12-16	773	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1555	1	4	5	2025-12-16	393	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1556	1	4	1	2025-12-17	570	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1557	1	4	2	2025-12-17	432	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1558	1	4	3	2025-12-17	621	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1559	1	4	4	2025-12-17	104	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1560	1	4	5	2025-12-17	425	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1561	1	4	1	2025-12-18	708	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1562	1	4	2	2025-12-18	344	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1563	1	4	3	2025-12-18	989	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1564	1	4	4	2025-12-18	442	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1565	1	4	5	2025-12-18	542	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1566	1	4	1	2025-12-19	525	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1567	1	4	2	2025-12-19	396	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1568	1	4	3	2025-12-19	681	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1569	1	4	4	2025-12-19	218	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1570	1	4	5	2025-12-19	227	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1571	1	4	1	2025-12-20	189	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1572	1	4	2	2025-12-20	317	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1573	1	4	3	2025-12-20	86	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1574	1	4	4	2025-12-20	46	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1575	1	4	5	2025-12-20	965	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1576	1	4	1	2025-12-21	753	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1577	1	4	2	2025-12-21	202	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1578	1	4	3	2025-12-21	194	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1579	1	4	4	2025-12-21	127	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1580	1	4	5	2025-12-21	666	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1581	1	4	1	2025-12-22	336	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1582	1	4	2	2025-12-22	99	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1583	1	4	3	2025-12-22	246	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1584	1	4	4	2025-12-22	465	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1585	1	4	5	2025-12-22	711	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1586	1	4	1	2025-12-23	435	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1587	1	4	2	2025-12-23	223	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1588	1	4	3	2025-12-23	582	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1589	1	4	4	2025-12-23	264	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1590	1	4	5	2025-12-23	432	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1591	1	4	1	2025-12-24	444	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1592	1	4	2	2025-12-24	28	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1593	1	4	3	2025-12-24	736	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1594	1	4	4	2025-12-24	539	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1595	1	4	5	2025-12-24	863	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1596	1	4	1	2025-12-25	714	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1597	1	4	2	2025-12-25	704	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1598	1	4	3	2025-12-25	441	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1599	1	4	4	2025-12-25	218	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1600	1	4	5	2025-12-25	861	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1601	1	4	1	2025-12-26	704	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1602	1	4	2	2025-12-26	689	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1603	1	4	3	2025-12-26	301	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1604	1	4	4	2025-12-26	415	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1605	1	4	5	2025-12-26	391	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1606	1	4	1	2025-12-27	348	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1607	1	4	2	2025-12-27	48	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1608	1	4	3	2025-12-27	710	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1609	1	4	4	2025-12-27	820	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1610	1	4	5	2025-12-27	69	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1611	1	4	1	2025-12-28	522	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1612	1	4	2	2025-12-28	934	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1613	1	4	3	2025-12-28	883	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1614	1	4	4	2025-12-28	645	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1615	1	4	5	2025-12-28	470	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1616	1	4	1	2025-12-29	860	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1617	1	4	2	2025-12-29	576	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1618	1	4	3	2025-12-29	683	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1619	1	4	4	2025-12-29	391	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1620	1	4	5	2025-12-29	993	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1621	1	4	1	2025-12-30	600	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1622	1	4	2	2025-12-30	915	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1623	1	4	3	2025-12-30	253	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1624	1	4	4	2025-12-30	117	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1625	1	4	5	2025-12-30	651	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1626	1	4	1	2025-12-31	319	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1627	1	4	2	2025-12-31	248	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1628	1	4	3	2025-12-31	422	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1629	1	4	4	2025-12-31	256	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1630	1	4	5	2025-12-31	696	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1631	1	4	1	2026-01-01	113	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1632	1	4	2	2026-01-01	59	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1633	1	4	3	2026-01-01	204	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1634	1	4	4	2026-01-01	974	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1635	1	4	5	2026-01-01	144	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1636	1	4	1	2026-01-02	513	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1637	1	4	2	2026-01-02	65	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1638	1	4	3	2026-01-02	267	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1639	1	4	4	2026-01-02	132	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1640	1	4	5	2026-01-02	533	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1641	1	4	1	2026-01-03	166	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1642	1	4	2	2026-01-03	592	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1643	1	4	3	2026-01-03	257	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1644	1	4	4	2026-01-03	684	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1645	1	4	5	2026-01-03	828	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1646	1	4	1	2026-01-04	347	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1647	1	4	2	2026-01-04	167	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1648	1	4	3	2026-01-04	71	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1649	1	4	4	2026-01-04	351	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1650	1	4	5	2026-01-04	853	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1651	1	4	1	2026-01-05	63	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1652	1	4	2	2026-01-05	840	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1653	1	4	3	2026-01-05	808	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1654	1	4	4	2026-01-05	994	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1655	1	4	5	2026-01-05	291	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1656	1	4	1	2026-01-06	188	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1657	1	4	2	2026-01-06	320	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1658	1	4	3	2026-01-06	798	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1659	1	4	4	2026-01-06	898	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1660	1	4	5	2026-01-06	392	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1661	1	4	1	2026-01-07	709	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1662	1	4	2	2026-01-07	732	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1663	1	4	3	2026-01-07	560	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1664	1	4	4	2026-01-07	769	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1665	1	4	5	2026-01-07	988	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1666	1	4	1	2026-01-08	284	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1667	1	4	2	2026-01-08	790	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1668	1	4	3	2026-01-08	323	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1669	1	4	4	2026-01-08	375	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1670	1	4	5	2026-01-08	540	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1671	1	4	1	2026-01-09	176	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1672	1	4	2	2026-01-09	301	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1673	1	4	3	2026-01-09	309	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1674	1	4	4	2026-01-09	712	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1675	1	4	5	2026-01-09	320	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1676	1	4	1	2026-01-10	872	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1677	1	4	2	2026-01-10	846	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1678	1	4	3	2026-01-10	430	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1679	1	4	4	2026-01-10	763	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1680	1	4	5	2026-01-10	482	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1681	3	5	1	2025-10-19	169	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1682	3	5	2	2025-10-19	670	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1683	3	5	3	2025-10-19	541	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1684	3	5	4	2025-10-19	373	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1685	3	5	5	2025-10-19	690	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1686	3	5	1	2025-10-20	531	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1687	3	5	2	2025-10-20	622	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1688	3	5	3	2025-10-20	57	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1689	3	5	4	2025-10-20	573	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1690	3	5	5	2025-10-20	333	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1691	3	5	1	2025-10-21	960	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1692	3	5	2	2025-10-21	393	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1693	3	5	3	2025-10-21	46	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1694	3	5	4	2025-10-21	838	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1695	3	5	5	2025-10-21	265	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1696	3	5	1	2025-10-22	533	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1697	3	5	2	2025-10-22	413	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1698	3	5	3	2025-10-22	383	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1699	3	5	4	2025-10-22	711	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1700	3	5	5	2025-10-22	613	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1701	3	5	1	2025-10-23	30	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1702	3	5	2	2025-10-23	782	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1703	3	5	3	2025-10-23	719	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1704	3	5	4	2025-10-23	295	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1705	3	5	5	2025-10-23	290	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1706	3	5	1	2025-10-24	537	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1707	3	5	2	2025-10-24	666	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1708	3	5	3	2025-10-24	508	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1709	3	5	4	2025-10-24	837	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1710	3	5	5	2025-10-24	603	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1711	3	5	1	2025-10-25	790	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1712	3	5	2	2025-10-25	312	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1713	3	5	3	2025-10-25	989	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1714	3	5	4	2025-10-25	584	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1715	3	5	5	2025-10-25	837	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1716	3	5	1	2025-10-26	67	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1717	3	5	2	2025-10-26	473	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1718	3	5	3	2025-10-26	947	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1719	3	5	4	2025-10-26	514	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1720	3	5	5	2025-10-26	435	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1721	3	5	1	2025-10-27	498	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1722	3	5	2	2025-10-27	276	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1723	3	5	3	2025-10-27	366	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1724	3	5	4	2025-10-27	848	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1725	3	5	5	2025-10-27	497	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1726	3	5	1	2025-10-28	677	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1727	3	5	2	2025-10-28	929	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1728	3	5	3	2025-10-28	642	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1729	3	5	4	2025-10-28	742	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1730	3	5	5	2025-10-28	183	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1731	3	5	1	2025-10-29	338	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1732	3	5	2	2025-10-29	193	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1733	3	5	3	2025-10-29	973	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1734	3	5	4	2025-10-29	107	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1735	3	5	5	2025-10-29	24	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1736	3	5	1	2025-10-30	354	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1737	3	5	2	2025-10-30	610	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1738	3	5	3	2025-10-30	579	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1739	3	5	4	2025-10-30	861	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1740	3	5	5	2025-10-30	432	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1741	3	5	1	2025-10-31	111	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1742	3	5	2	2025-10-31	594	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1743	3	5	3	2025-10-31	34	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1744	3	5	4	2025-10-31	331	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1745	3	5	5	2025-10-31	532	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1746	3	5	1	2025-11-01	790	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1747	3	5	2	2025-11-01	845	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1748	3	5	3	2025-11-01	403	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1749	3	5	4	2025-11-01	853	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1750	3	5	5	2025-11-01	987	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1751	3	5	1	2025-11-02	617	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1752	3	5	2	2025-11-02	482	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1753	3	5	3	2025-11-02	713	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1754	3	5	4	2025-11-02	140	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1755	3	5	5	2025-11-02	520	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1756	3	5	1	2025-11-03	25	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1757	3	5	2	2025-11-03	629	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1758	3	5	3	2025-11-03	246	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1759	3	5	4	2025-11-03	983	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1760	3	5	5	2025-11-03	74	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1761	3	5	1	2025-11-04	994	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1762	3	5	2	2025-11-04	196	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1763	3	5	3	2025-11-04	561	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1764	3	5	4	2025-11-04	12	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1765	3	5	5	2025-11-04	75	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1766	3	5	1	2025-11-05	987	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1767	3	5	2	2025-11-05	447	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1768	3	5	3	2025-11-05	617	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1769	3	5	4	2025-11-05	226	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1770	3	5	5	2025-11-05	630	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1771	3	5	1	2025-11-06	419	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1772	3	5	2	2025-11-06	78	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1773	3	5	3	2025-11-06	616	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1774	3	5	4	2025-11-06	326	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1775	3	5	5	2025-11-06	352	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1776	3	5	1	2025-11-07	894	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1777	3	5	2	2025-11-07	35	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1778	3	5	3	2025-11-07	591	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1779	3	5	4	2025-11-07	186	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1780	3	5	5	2025-11-07	901	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1781	3	5	1	2025-11-08	171	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1782	3	5	2	2025-11-08	348	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1783	3	5	3	2025-11-08	547	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1784	3	5	4	2025-11-08	984	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1785	3	5	5	2025-11-08	361	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1786	3	5	1	2025-11-09	889	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1787	3	5	2	2025-11-09	747	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1788	3	5	3	2025-11-09	821	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1789	3	5	4	2025-11-09	18	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1790	3	5	5	2025-11-09	132	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1791	3	5	1	2025-11-10	525	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1792	3	5	2	2025-11-10	686	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1793	3	5	3	2025-11-10	787	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1794	3	5	4	2025-11-10	806	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1795	3	5	5	2025-11-10	694	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1796	3	5	1	2025-11-11	381	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1797	3	5	2	2025-11-11	366	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1798	3	5	3	2025-11-11	827	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1799	3	5	4	2025-11-11	936	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1800	3	5	5	2025-11-11	483	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1801	3	5	1	2025-11-12	696	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1802	3	5	2	2025-11-12	197	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1803	3	5	3	2025-11-12	560	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1804	3	5	4	2025-11-12	613	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1805	3	5	5	2025-11-12	14	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1806	3	5	1	2025-11-13	860	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1807	3	5	2	2025-11-13	364	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1808	3	5	3	2025-11-13	672	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1809	3	5	4	2025-11-13	941	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1810	3	5	5	2025-11-13	372	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1811	3	5	1	2025-11-14	14	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1812	3	5	2	2025-11-14	335	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1813	3	5	3	2025-11-14	95	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1814	3	5	4	2025-11-14	695	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1815	3	5	5	2025-11-14	680	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1816	3	5	1	2025-11-15	12	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1817	3	5	2	2025-11-15	331	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1818	3	5	3	2025-11-15	834	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1819	3	5	4	2025-11-15	936	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1820	3	5	5	2025-11-15	288	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1821	3	5	1	2025-11-16	305	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1822	3	5	2	2025-11-16	943	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1823	3	5	3	2025-11-16	333	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1824	3	5	4	2025-11-16	181	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1825	3	5	5	2025-11-16	956	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1826	3	5	1	2025-11-17	974	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1827	3	5	2	2025-11-17	409	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1828	3	5	3	2025-11-17	500	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1829	3	5	4	2025-11-17	273	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1830	3	5	5	2025-11-17	356	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1831	3	5	1	2025-11-18	301	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1832	3	5	2	2025-11-18	828	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1833	3	5	3	2025-11-18	200	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1834	3	5	4	2025-11-18	49	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1835	3	5	5	2025-11-18	690	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1836	3	5	1	2025-11-19	34	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1837	3	5	2	2025-11-19	97	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1838	3	5	3	2025-11-19	898	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1839	3	5	4	2025-11-19	105	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1840	3	5	5	2025-11-19	151	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1841	3	5	1	2025-11-20	656	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1842	3	5	2	2025-11-20	253	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1843	3	5	3	2025-11-20	315	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1844	3	5	4	2025-11-20	686	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1845	3	5	5	2025-11-20	931	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1846	3	5	1	2025-11-21	821	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1847	3	5	2	2025-11-21	737	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1848	3	5	3	2025-11-21	895	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1849	3	5	4	2025-11-21	157	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1850	3	5	5	2025-11-21	331	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1851	3	5	1	2025-11-22	250	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1852	3	5	2	2025-11-22	609	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1853	3	5	3	2025-11-22	27	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1854	3	5	4	2025-11-22	191	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1855	3	5	5	2025-11-22	50	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1856	3	5	1	2025-11-23	986	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1857	3	5	2	2025-11-23	69	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1858	3	5	3	2025-11-23	658	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1859	3	5	4	2025-11-23	899	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1860	3	5	5	2025-11-23	962	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1861	3	5	1	2025-11-24	926	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1862	3	5	2	2025-11-24	889	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1863	3	5	3	2025-11-24	444	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1864	3	5	4	2025-11-24	740	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1865	3	5	5	2025-11-24	482	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1866	3	5	1	2025-11-25	869	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1867	3	5	2	2025-11-25	197	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1868	3	5	3	2025-11-25	31	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1869	3	5	4	2025-11-25	654	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1870	3	5	5	2025-11-25	445	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1871	3	5	1	2025-11-26	756	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1872	3	5	2	2025-11-26	295	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1873	3	5	3	2025-11-26	119	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1874	3	5	4	2025-11-26	993	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1875	3	5	5	2025-11-26	496	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1876	3	5	1	2025-11-27	913	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1877	3	5	2	2025-11-27	997	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1878	3	5	3	2025-11-27	471	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1879	3	5	4	2025-11-27	679	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1880	3	5	5	2025-11-27	870	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1881	3	5	1	2025-11-28	447	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1882	3	5	2	2025-11-28	690	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1883	3	5	3	2025-11-28	286	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1884	3	5	4	2025-11-28	229	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1885	3	5	5	2025-11-28	405	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1886	3	5	1	2025-11-29	357	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1887	3	5	2	2025-11-29	144	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1888	3	5	3	2025-11-29	524	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1889	3	5	4	2025-11-29	755	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1890	3	5	5	2025-11-29	880	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1891	3	5	1	2025-11-30	453	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1892	3	5	2	2025-11-30	950	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1893	3	5	3	2025-11-30	314	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1894	3	5	4	2025-11-30	709	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1895	3	5	5	2025-11-30	705	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1896	3	5	1	2025-12-01	873	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1897	3	5	2	2025-12-01	387	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1898	3	5	3	2025-12-01	581	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1899	3	5	4	2025-12-01	435	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1900	3	5	5	2025-12-01	227	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1901	3	5	1	2025-12-02	243	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1902	3	5	2	2025-12-02	453	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1903	3	5	3	2025-12-02	120	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1904	3	5	4	2025-12-02	192	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1905	3	5	5	2025-12-02	482	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1906	3	5	1	2025-12-03	492	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1907	3	5	2	2025-12-03	380	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1908	3	5	3	2025-12-03	169	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1909	3	5	4	2025-12-03	250	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1910	3	5	5	2025-12-03	815	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1911	3	5	1	2025-12-04	605	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1912	3	5	2	2025-12-04	104	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1913	3	5	3	2025-12-04	853	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1914	3	5	4	2025-12-04	576	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1915	3	5	5	2025-12-04	542	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1916	3	5	1	2025-12-05	619	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1917	3	5	2	2025-12-05	349	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1918	3	5	3	2025-12-05	693	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1919	3	5	4	2025-12-05	403	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1920	3	5	5	2025-12-05	48	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1921	3	5	1	2025-12-06	718	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1922	3	5	2	2025-12-06	873	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1923	3	5	3	2025-12-06	865	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1924	3	5	4	2025-12-06	998	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1925	3	5	5	2025-12-06	270	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1926	3	5	1	2025-12-07	823	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1927	3	5	2	2025-12-07	383	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1928	3	5	3	2025-12-07	83	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1929	3	5	4	2025-12-07	668	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1930	3	5	5	2025-12-07	942	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1931	3	5	1	2025-12-08	717	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1932	3	5	2	2025-12-08	876	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1933	3	5	3	2025-12-08	714	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1934	3	5	4	2025-12-08	657	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1935	3	5	5	2025-12-08	113	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1936	3	5	1	2025-12-09	781	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1937	3	5	2	2025-12-09	121	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1938	3	5	3	2025-12-09	789	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1939	3	5	4	2025-12-09	910	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1940	3	5	5	2025-12-09	983	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1941	3	5	1	2025-12-10	547	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1942	3	5	2	2025-12-10	345	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1943	3	5	3	2025-12-10	339	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1944	3	5	4	2025-12-10	278	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1945	3	5	5	2025-12-10	640	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1946	3	5	1	2025-12-11	877	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1947	3	5	2	2025-12-11	53	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1948	3	5	3	2025-12-11	651	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1949	3	5	4	2025-12-11	686	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1950	3	5	5	2025-12-11	584	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1951	3	5	1	2025-12-12	924	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1952	3	5	2	2025-12-12	47	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1953	3	5	3	2025-12-12	492	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1954	3	5	4	2025-12-12	865	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1955	3	5	5	2025-12-12	679	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1956	3	5	1	2025-12-13	935	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1957	3	5	2	2025-12-13	520	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1958	3	5	3	2025-12-13	601	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1959	3	5	4	2025-12-13	657	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1960	3	5	5	2025-12-13	54	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1961	3	5	1	2025-12-14	776	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1962	3	5	2	2025-12-14	327	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1963	3	5	3	2025-12-14	34	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1964	3	5	4	2025-12-14	203	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1965	3	5	5	2025-12-14	632	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1966	3	5	1	2025-12-15	49	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1967	3	5	2	2025-12-15	150	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1968	3	5	3	2025-12-15	799	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1969	3	5	4	2025-12-15	198	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1970	3	5	5	2025-12-15	340	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1971	3	5	1	2025-12-16	566	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1972	3	5	2	2025-12-16	298	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1973	3	5	3	2025-12-16	447	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1974	3	5	4	2025-12-16	97	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1975	3	5	5	2025-12-16	148	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1976	3	5	1	2025-12-17	368	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1977	3	5	2	2025-12-17	547	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1978	3	5	3	2025-12-17	141	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1979	3	5	4	2025-12-17	514	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1980	3	5	5	2025-12-17	511	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1981	3	5	1	2025-12-18	715	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1982	3	5	2	2025-12-18	630	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1983	3	5	3	2025-12-18	586	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1984	3	5	4	2025-12-18	570	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1985	3	5	5	2025-12-18	402	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1986	3	5	1	2025-12-19	349	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1987	3	5	2	2025-12-19	580	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1988	3	5	3	2025-12-19	504	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1989	3	5	4	2025-12-19	191	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1990	3	5	5	2025-12-19	11	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1991	3	5	1	2025-12-20	246	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1992	3	5	2	2025-12-20	425	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1993	3	5	3	2025-12-20	220	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1994	3	5	4	2025-12-20	325	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1995	3	5	5	2025-12-20	187	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1996	3	5	1	2025-12-21	104	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1997	3	5	2	2025-12-21	778	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1998	3	5	3	2025-12-21	582	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
1999	3	5	4	2025-12-21	977	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2000	3	5	5	2025-12-21	124	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2001	3	5	1	2025-12-22	687	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2002	3	5	2	2025-12-22	382	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2003	3	5	3	2025-12-22	453	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2004	3	5	4	2025-12-22	975	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2005	3	5	5	2025-12-22	894	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2006	3	5	1	2025-12-23	233	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2007	3	5	2	2025-12-23	978	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2008	3	5	3	2025-12-23	237	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2009	3	5	4	2025-12-23	310	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2010	3	5	5	2025-12-23	479	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2011	3	5	1	2025-12-24	889	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2012	3	5	2	2025-12-24	404	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2013	3	5	3	2025-12-24	500	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2014	3	5	4	2025-12-24	449	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2015	3	5	5	2025-12-24	321	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2016	3	5	1	2025-12-25	918	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2017	3	5	2	2025-12-25	973	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2018	3	5	3	2025-12-25	354	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2019	3	5	4	2025-12-25	679	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2020	3	5	5	2025-12-25	55	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2021	3	5	1	2025-12-26	887	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2022	3	5	2	2025-12-26	818	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2023	3	5	3	2025-12-26	915	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2024	3	5	4	2025-12-26	341	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2025	3	5	5	2025-12-26	64	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2026	3	5	1	2025-12-27	113	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2027	3	5	2	2025-12-27	629	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2028	3	5	3	2025-12-27	851	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2029	3	5	4	2025-12-27	664	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2030	3	5	5	2025-12-27	260	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2031	3	5	1	2025-12-28	222	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2032	3	5	2	2025-12-28	847	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2033	3	5	3	2025-12-28	292	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2034	3	5	4	2025-12-28	122	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2035	3	5	5	2025-12-28	458	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2036	3	5	1	2025-12-29	736	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2037	3	5	2	2025-12-29	286	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2038	3	5	3	2025-12-29	409	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2039	3	5	4	2025-12-29	883	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2040	3	5	5	2025-12-29	749	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2041	3	5	1	2025-12-30	458	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2042	3	5	2	2025-12-30	870	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2043	3	5	3	2025-12-30	550	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2044	3	5	4	2025-12-30	723	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2045	3	5	5	2025-12-30	948	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2046	3	5	1	2025-12-31	833	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2047	3	5	2	2025-12-31	983	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2048	3	5	3	2025-12-31	941	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2049	3	5	4	2025-12-31	863	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2050	3	5	5	2025-12-31	18	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2051	3	5	1	2026-01-01	414	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2052	3	5	2	2026-01-01	87	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2053	3	5	3	2026-01-01	777	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2054	3	5	4	2026-01-01	170	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2055	3	5	5	2026-01-01	813	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2056	3	5	1	2026-01-02	471	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2057	3	5	2	2026-01-02	58	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2058	3	5	3	2026-01-02	357	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2059	3	5	4	2026-01-02	770	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2060	3	5	5	2026-01-02	131	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2061	3	5	1	2026-01-03	652	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2062	3	5	2	2026-01-03	959	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2063	3	5	3	2026-01-03	942	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2064	3	5	4	2026-01-03	631	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2065	3	5	5	2026-01-03	107	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2066	3	5	1	2026-01-04	594	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2067	3	5	2	2026-01-04	845	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2068	3	5	3	2026-01-04	478	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2069	3	5	4	2026-01-04	45	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2070	3	5	5	2026-01-04	554	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2071	3	5	1	2026-01-05	525	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2072	3	5	2	2026-01-05	567	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2073	3	5	3	2026-01-05	439	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2074	3	5	4	2026-01-05	142	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2075	3	5	5	2026-01-05	221	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2076	3	5	1	2026-01-06	691	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2077	3	5	2	2026-01-06	105	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2078	3	5	3	2026-01-06	564	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2079	3	5	4	2026-01-06	472	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2080	3	5	5	2026-01-06	928	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2081	3	5	1	2026-01-07	964	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2082	3	5	2	2026-01-07	272	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2083	3	5	3	2026-01-07	825	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2084	3	5	4	2026-01-07	889	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2085	3	5	5	2026-01-07	617	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2086	3	5	1	2026-01-08	636	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2087	3	5	2	2026-01-08	925	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2088	3	5	3	2026-01-08	337	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2089	3	5	4	2026-01-08	578	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2090	3	5	5	2026-01-08	308	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2091	3	5	1	2026-01-09	701	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2092	3	5	2	2026-01-09	936	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2093	3	5	3	2026-01-09	370	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2094	3	5	4	2026-01-09	555	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2095	3	5	5	2026-01-09	617	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2096	3	5	1	2026-01-10	756	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2097	3	5	2	2026-01-10	360	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2098	3	5	3	2026-01-10	467	BOX	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2099	3	5	4	2026-01-10	864	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
2100	3	5	5	2026-01-10	993	SET	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229	2025-11-19 17:33:27.317229
\.


--
-- Data for Name: forecast_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.forecast_history (id, customer_id, delivery_place_id, product_id, forecast_date, forecast_quantity, unit, snapshot_at, archived_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inbound_plan_lines; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.inbound_plan_lines (id, inbound_plan_id, product_id, planned_quantity, unit, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inbound_plans; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.inbound_plans (id, plan_number, supplier_id, planned_arrival_date, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lots; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.lots (id, lot_number, product_id, warehouse_id, supplier_id, expected_lot_id, received_date, expiry_date, current_quantity, allocated_quantity, unit, status, created_at, updated_at) FROM stdin;
1	LOT-60742769	3	2	2	\N	2025-11-14	2026-07-25	325.000	0.000	BOX	active	2025-11-19 08:33:27.679418	2025-11-19 08:33:27.69899
2	LOT-88613665	2	2	2	\N	2025-11-17	2026-09-09	241.000	0.000	BOX	active	2025-11-19 08:33:27.679418	2025-11-19 08:33:27.71239
5	LOT-30537305	4	2	1	\N	2025-10-25	2025-12-22	380.000	0.000	SET	active	2025-11-19 08:33:27.679418	2025-11-19 08:33:27.738879
6	LOT-39007295	3	1	1	\N	2025-11-03	2026-02-20	96.000	0.000	BOX	active	2025-11-19 08:33:27.679418	2025-11-19 08:33:27.744918
7	LOT-93503286	4	2	2	\N	2025-10-23	2026-08-18	236.000	0.000	SET	active	2025-11-19 08:33:27.679418	2025-11-19 08:33:27.751334
8	LOT-01079156	3	2	1	\N	2025-11-08	2026-02-05	100.000	0.000	BOX	active	2025-11-19 08:33:27.679418	2025-11-19 08:33:27.757779
9	LOT-03137255	3	1	2	\N	2025-11-15	2026-04-18	46.000	0.000	BOX	active	2025-11-19 08:33:27.679418	2025-11-19 08:33:27.764499
3	LOT-33977087	2	1	1	\N	2025-10-22	2026-10-12	169.000	0.000	BOX	active	2025-11-19 08:33:27.679418	2025-11-19 08:33:27.840515
4	LOT-98532277	3	2	1	\N	2025-10-29	2026-03-29	109.000	0.000	BOX	active	2025-11-19 08:33:27.679418	2025-11-19 08:33:27.840768
10	LOT-13405268	1	1	1	\N	2025-10-28	2025-12-09	20.000	0.000	SET	active	2025-11-19 08:33:27.679418	2025-11-19 08:33:27.840343
\.


--
-- Data for Name: master_change_logs; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.master_change_logs (id, table_name, record_id, change_type, old_values, new_values, changed_by, changed_at) FROM stdin;
\.


--
-- Data for Name: operation_logs; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.operation_logs (id, user_id, operation_type, target_table, target_id, changes, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: order_lines; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.order_lines (id, order_id, product_id, delivery_date, order_quantity, unit, created_at, updated_at, delivery_place_id, status) FROM stdin;
1	1	2	2025-11-19	35.000	BOX	2025-11-19 08:33:27.799614	2025-11-19 08:33:27.799623	1	pending
2	2	3	2025-11-24	46.000	BOX	2025-11-19 08:33:27.80932	2025-11-19 08:33:27.809328	1	pending
3	3	3	2025-11-25	73.000	BOX	2025-11-19 08:33:27.815232	2025-11-19 08:33:27.815238	3	pending
4	4	1	2025-11-11	23.000	SET	2025-11-19 08:33:27.822322	2025-11-19 08:33:27.822327	1	pending
5	5	3	2025-11-08	98.000	BOX	2025-11-19 08:33:27.827663	2025-11-19 08:33:27.827669	2	pending
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.orders (id, order_number, customer_id, order_date, created_at, updated_at) FROM stdin;
1	SO-05066890	1	2025-11-18	2025-11-19 08:33:27.793013	2025-11-19 08:33:27.793015
2	SO-70950473	1	2025-11-17	2025-11-19 08:33:27.799958	2025-11-19 08:33:27.799962
3	SO-23359099	1	2025-11-18	2025-11-19 08:33:27.809633	2025-11-19 08:33:27.809636
4	SO-85357083	1	2025-11-06	2025-11-19 08:33:27.815401	2025-11-19 08:33:27.815402
5	SO-00816204	2	2025-11-06	2025-11-19 08:33:27.824309	2025-11-19 08:33:27.824311
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.products (id, maker_part_code, product_name, base_unit, consumption_limit_days, created_at, updated_at) FROM stdin;
1	P72595	Synergize Enterprise Channels	SET	81	2025-11-19 08:33:27.292203	2025-11-19 17:33:27.27247
2	P13947	Innovate Seamless Info-Mediaries	BOX	165	2025-11-19 08:33:27.292232	2025-11-19 17:33:27.27247
3	P65160	Expedite Customized Metrics	BOX	126	2025-11-19 08:33:27.292254	2025-11-19 17:33:27.27247
4	P28054	Incubate Cross-Media Systems	SET	106	2025-11-19 08:33:27.292274	2025-11-19 17:33:27.27247
5	P72963	Visualize B2B Synergies	SET	145	2025-11-19 08:33:27.292298	2025-11-19 17:33:27.27247
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.roles (id, role_code, role_name, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stock_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.stock_history (id, lot_id, transaction_type, quantity_change, quantity_after, reference_type, reference_id, transaction_date) FROM stdin;
1	1	inbound	325.000	325.000	seed_simulation	\N	2025-11-19 08:33:27.699004
2	2	inbound	241.000	241.000	seed_simulation	\N	2025-11-19 08:33:27.712409
3	3	inbound	204.000	204.000	seed_simulation	\N	2025-11-19 08:33:27.724856
4	4	inbound	261.000	261.000	seed_simulation	\N	2025-11-19 08:33:27.731236
5	5	inbound	380.000	380.000	seed_simulation	\N	2025-11-19 08:33:27.738887
6	6	inbound	96.000	96.000	seed_simulation	\N	2025-11-19 08:33:27.744931
7	7	inbound	236.000	236.000	seed_simulation	\N	2025-11-19 08:33:27.751349
8	8	inbound	100.000	100.000	seed_simulation	\N	2025-11-19 08:33:27.7578
9	9	inbound	46.000	46.000	seed_simulation	\N	2025-11-19 08:33:27.764511
10	10	inbound	43.000	43.000	seed_simulation	\N	2025-11-19 08:33:27.772315
11	10	shipment	-23.000	20.000	order_line	4	2025-11-19 08:33:27.840356
12	3	shipment	-35.000	169.000	order_line	1	2025-11-19 08:33:27.840523
13	4	shipment	-79.000	182.000	order_line	5	2025-11-19 08:33:27.840653
14	4	shipment	-73.000	109.000	order_line	3	2025-11-19 08:33:27.840774
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.suppliers (id, supplier_code, supplier_name, created_at, updated_at) FROM stdin;
1	S6633	髱呈惠騾壻ｿ｡蜷亥酔莨夂､ｾ蝠・ｺ・2025-11-19 08:33:27.280836	2025-11-19 17:33:27.27247
2	S1355	譬ｪ蠑丈ｼ夂､ｾ荳画ｵｦ蜊ｰ蛻ｷ蝠・ｺ・2025-11-19 08:33:27.28088	2025-11-19 17:33:27.27247
\.


--
-- Data for Name: system_configs; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.system_configs (id, config_key, config_value, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.user_roles (user_id, role_id, assigned_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.users (id, username, email, password_hash, display_name, is_active, last_login_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.warehouses (id, warehouse_code, warehouse_name, warehouse_type, created_at, updated_at) FROM stdin;
1	W99	縺・☆縺ｿ蟶ょ牙ｺｫ	supplier	2025-11-19 08:33:27.297605	2025-11-19 17:33:27.27247
2	W79	髟ｷ逕滄Γ髟ｷ譟・伴蛟牙ｺｫ	supplier	2025-11-19 08:33:27.297622	2025-11-19 17:33:27.27247
\.


--
-- Name: adjustments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.adjustments_id_seq', 1, false);


--
-- Name: allocation_suggestions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.allocation_suggestions_id_seq', 1, false);


--
-- Name: allocations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.allocations_id_seq', 4, true);


--
-- Name: batch_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.batch_jobs_id_seq', 1, false);


--
-- Name: business_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.business_rules_id_seq', 1, false);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.customers_id_seq', 3, true);


--
-- Name: delivery_places_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.delivery_places_id_seq', 5, true);


--
-- Name: expected_lots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.expected_lots_id_seq', 1, false);


--
-- Name: forecast_current_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.forecast_current_id_seq', 2100, true);


--
-- Name: forecast_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.forecast_history_id_seq', 1, false);


--
-- Name: inbound_plan_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.inbound_plan_lines_id_seq', 1, false);


--
-- Name: inbound_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.inbound_plans_id_seq', 1, false);


--
-- Name: lots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.lots_id_seq', 10, true);


--
-- Name: master_change_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.master_change_logs_id_seq', 1, false);


--
-- Name: operation_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.operation_logs_id_seq', 1, false);


--
-- Name: order_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.order_lines_id_seq', 5, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.orders_id_seq', 5, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.products_id_seq', 5, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.roles_id_seq', 1, false);


--
-- Name: stock_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.stock_history_id_seq', 14, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 2, true);


--
-- Name: system_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.system_configs_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- Name: warehouses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.warehouses_id_seq', 2, true);


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

\unrestrict 1NrhomP48Nj6GNb21vH0ETqVVWTWUPN8in9wa8gfGugn00KisgjxKuy3rDVbJIC

