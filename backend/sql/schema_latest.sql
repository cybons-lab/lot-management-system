-- ============================================================
-- schema_latest.sql - 現在のDBスキーマダンプ
-- ============================================================
-- このファイルは開発用DBから pg_dump で自動生成されたものです。
-- 手動編集禁止: 内容を更新する場合は以下のコマンドを実行してください。
--
-- docker exec lot-db-postgres pg_dump -U admin -d lot_management \
--   --schema-only --no-owner --no-privileges --clean --if-exists \
--   > backend/sql/schema_latest.sql
--
-- 最終更新: 2025-12-12
-- ============================================================
--
-- PostgreSQL database dump
--

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

ALTER TABLE IF EXISTS ONLY public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_withdrawn_by_fkey;
ALTER TABLE IF EXISTS ONLY public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_delivery_place_id_fkey;
ALTER TABLE IF EXISTS ONLY public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_supplier_assignments DROP CONSTRAINT IF EXISTS user_supplier_assignments_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_supplier_assignments DROP CONSTRAINT IF EXISTS user_supplier_assignments_supplier_id_fkey;
ALTER TABLE IF EXISTS ONLY public.system_client_logs DROP CONSTRAINT IF EXISTS system_client_logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_mappings DROP CONSTRAINT IF EXISTS product_mappings_supplier_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_mappings DROP CONSTRAINT IF EXISTS product_mappings_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_mappings DROP CONSTRAINT IF EXISTS product_mappings_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_locked_by_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_lines DROP CONSTRAINT IF EXISTS order_lines_order_group_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_groups DROP CONSTRAINT IF EXISTS order_groups_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_groups DROP CONSTRAINT IF EXISTS order_groups_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_roles DROP CONSTRAINT IF EXISTS fk_user_roles_user;
ALTER TABLE IF EXISTS ONLY public.user_roles DROP CONSTRAINT IF EXISTS fk_user_roles_role;
ALTER TABLE IF EXISTS ONLY public.product_uom_conversions DROP CONSTRAINT IF EXISTS fk_uom_conversions_product;
ALTER TABLE IF EXISTS ONLY public.stock_history DROP CONSTRAINT IF EXISTS fk_stock_history_lot;
ALTER TABLE IF EXISTS ONLY public.product_suppliers DROP CONSTRAINT IF EXISTS fk_product_suppliers_supplier;
ALTER TABLE IF EXISTS ONLY public.product_suppliers DROP CONSTRAINT IF EXISTS fk_product_suppliers_product;
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
ALTER TABLE IF EXISTS ONLY public.lot_reservations DROP CONSTRAINT IF EXISTS fk_lot_reservations_lot_id;
ALTER TABLE IF EXISTS ONLY public.inbound_plans DROP CONSTRAINT IF EXISTS fk_inbound_plans_supplier;
ALTER TABLE IF EXISTS ONLY public.inbound_plan_lines DROP CONSTRAINT IF EXISTS fk_inbound_plan_lines_product;
ALTER TABLE IF EXISTS ONLY public.inbound_plan_lines DROP CONSTRAINT IF EXISTS fk_inbound_plan_lines_plan;
ALTER TABLE IF EXISTS ONLY public.forecast_current DROP CONSTRAINT IF EXISTS fk_forecast_current_product;
ALTER TABLE IF EXISTS ONLY public.forecast_current DROP CONSTRAINT IF EXISTS fk_forecast_current_delivery_place;
ALTER TABLE IF EXISTS ONLY public.forecast_current DROP CONSTRAINT IF EXISTS fk_forecast_current_customer;
ALTER TABLE IF EXISTS ONLY public.expected_lots DROP CONSTRAINT IF EXISTS fk_expected_lots_line;
ALTER TABLE IF EXISTS ONLY public.delivery_places DROP CONSTRAINT IF EXISTS fk_delivery_places_customer;
ALTER TABLE IF EXISTS ONLY public.customer_items DROP CONSTRAINT IF EXISTS fk_customer_items_supplier;
ALTER TABLE IF EXISTS ONLY public.customer_items DROP CONSTRAINT IF EXISTS fk_customer_items_product;
ALTER TABLE IF EXISTS ONLY public.customer_items DROP CONSTRAINT IF EXISTS fk_customer_items_customer;
ALTER TABLE IF EXISTS ONLY public.customer_item_jiku_mappings DROP CONSTRAINT IF EXISTS fk_customer_item_jiku_delivery_place;
ALTER TABLE IF EXISTS ONLY public.customer_item_jiku_mappings DROP CONSTRAINT IF EXISTS fk_customer_item_jiku_customer_item;
ALTER TABLE IF EXISTS ONLY public.customer_item_delivery_settings DROP CONSTRAINT IF EXISTS fk_cids_delivery_place;
ALTER TABLE IF EXISTS ONLY public.customer_item_delivery_settings DROP CONSTRAINT IF EXISTS fk_cids_customer_item;
ALTER TABLE IF EXISTS ONLY public.allocations DROP CONSTRAINT IF EXISTS fk_allocations_order_line;
ALTER TABLE IF EXISTS ONLY public.allocations DROP CONSTRAINT IF EXISTS fk_allocations_inbound_plan_line;
ALTER TABLE IF EXISTS ONLY public.allocation_suggestions DROP CONSTRAINT IF EXISTS fk_allocation_suggestions_product;
ALTER TABLE IF EXISTS ONLY public.allocation_suggestions DROP CONSTRAINT IF EXISTS fk_allocation_suggestions_lot;
ALTER TABLE IF EXISTS ONLY public.allocation_suggestions DROP CONSTRAINT IF EXISTS fk_allocation_suggestions_delivery_place;
ALTER TABLE IF EXISTS ONLY public.allocation_suggestions DROP CONSTRAINT IF EXISTS fk_allocation_suggestions_customer;
ALTER TABLE IF EXISTS ONLY public.adjustments DROP CONSTRAINT IF EXISTS fk_adjustments_user;
ALTER TABLE IF EXISTS ONLY public.adjustments DROP CONSTRAINT IF EXISTS fk_adjustments_lot;
ALTER TABLE IF EXISTS ONLY public.allocation_traces DROP CONSTRAINT IF EXISTS allocation_traces_order_line_id_fkey;
ALTER TABLE IF EXISTS ONLY public.allocation_traces DROP CONSTRAINT IF EXISTS allocation_traces_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.allocation_suggestions DROP CONSTRAINT IF EXISTS allocation_suggestions_forecast_id_fkey;
DROP INDEX IF EXISTS public.ux_forecast_current_unique;
DROP INDEX IF EXISTS public.uq_user_supplier_primary_per_supplier;
DROP INDEX IF EXISTS public.uq_product_primary_supplier;
DROP INDEX IF EXISTS public.ix_forecast_history_key;
DROP INDEX IF EXISTS public.ix_forecast_current_key;
DROP INDEX IF EXISTS public.idx_withdrawals_type;
DROP INDEX IF EXISTS public.idx_withdrawals_lot;
DROP INDEX IF EXISTS public.idx_withdrawals_date;
DROP INDEX IF EXISTS public.idx_withdrawals_customer;
DROP INDEX IF EXISTS public.idx_warehouses_valid_to;
DROP INDEX IF EXISTS public.idx_warehouses_type;
DROP INDEX IF EXISTS public.idx_warehouses_code;
DROP INDEX IF EXISTS public.idx_users_username;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_users_azure_oid;
DROP INDEX IF EXISTS public.idx_users_auth_provider;
DROP INDEX IF EXISTS public.idx_users_active;
DROP INDEX IF EXISTS public.idx_user_supplier_assignments_user;
DROP INDEX IF EXISTS public.idx_user_supplier_assignments_supplier;
DROP INDEX IF EXISTS public.idx_user_supplier_assignments_primary;
DROP INDEX IF EXISTS public.idx_user_roles_user;
DROP INDEX IF EXISTS public.idx_user_roles_role;
DROP INDEX IF EXISTS public.idx_system_configs_key;
DROP INDEX IF EXISTS public.idx_system_client_logs_user_id;
DROP INDEX IF EXISTS public.idx_system_client_logs_created_at;
DROP INDEX IF EXISTS public.idx_suppliers_valid_to;
DROP INDEX IF EXISTS public.idx_suppliers_code;
DROP INDEX IF EXISTS public.idx_stock_history_type;
DROP INDEX IF EXISTS public.idx_stock_history_lot;
DROP INDEX IF EXISTS public.idx_stock_history_date;
DROP INDEX IF EXISTS public.idx_roles_code;
DROP INDEX IF EXISTS public.idx_products_valid_to;
DROP INDEX IF EXISTS public.idx_products_name;
DROP INDEX IF EXISTS public.idx_products_code;
DROP INDEX IF EXISTS public.idx_product_uom_conversions_valid_to;
DROP INDEX IF EXISTS public.idx_product_suppliers_valid_to;
DROP INDEX IF EXISTS public.idx_product_mappings_valid_to;
DROP INDEX IF EXISTS public.idx_product_mappings_supplier;
DROP INDEX IF EXISTS public.idx_product_mappings_product;
DROP INDEX IF EXISTS public.idx_product_mappings_customer;
DROP INDEX IF EXISTS public.idx_orders_locked_by;
DROP INDEX IF EXISTS public.idx_orders_lock_expires;
DROP INDEX IF EXISTS public.idx_orders_date;
DROP INDEX IF EXISTS public.idx_orders_customer;
DROP INDEX IF EXISTS public.idx_order_lines_status;
DROP INDEX IF EXISTS public.idx_order_lines_sap_order_no;
DROP INDEX IF EXISTS public.idx_order_lines_product;
DROP INDEX IF EXISTS public.idx_order_lines_order_type;
DROP INDEX IF EXISTS public.idx_order_lines_order_group;
DROP INDEX IF EXISTS public.idx_order_lines_order;
DROP INDEX IF EXISTS public.idx_order_lines_forecast_reference;
DROP INDEX IF EXISTS public.idx_order_lines_delivery_place;
DROP INDEX IF EXISTS public.idx_order_lines_date;
DROP INDEX IF EXISTS public.idx_order_lines_customer_order_no;
DROP INDEX IF EXISTS public.idx_order_groups_product;
DROP INDEX IF EXISTS public.idx_order_groups_date;
DROP INDEX IF EXISTS public.idx_order_groups_customer;
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
DROP INDEX IF EXISTS public.idx_lots_origin_type;
DROP INDEX IF EXISTS public.idx_lots_number;
DROP INDEX IF EXISTS public.idx_lots_expiry_date;
DROP INDEX IF EXISTS public.idx_lot_reservations_status;
DROP INDEX IF EXISTS public.idx_lot_reservations_source;
DROP INDEX IF EXISTS public.idx_lot_reservations_lot_status;
DROP INDEX IF EXISTS public.idx_lot_reservations_expires_at;
DROP INDEX IF EXISTS public.idx_inbound_plans_supplier;
DROP INDEX IF EXISTS public.idx_inbound_plans_status;
DROP INDEX IF EXISTS public.idx_inbound_plans_date;
DROP INDEX IF EXISTS public.idx_inbound_plan_lines_product;
DROP INDEX IF EXISTS public.idx_inbound_plan_lines_plan;
DROP INDEX IF EXISTS public.idx_expected_lots_number;
DROP INDEX IF EXISTS public.idx_expected_lots_line;
DROP INDEX IF EXISTS public.idx_delivery_places_valid_to;
DROP INDEX IF EXISTS public.idx_delivery_places_customer;
DROP INDEX IF EXISTS public.idx_delivery_places_code;
DROP INDEX IF EXISTS public.idx_customers_valid_to;
DROP INDEX IF EXISTS public.idx_customers_code;
DROP INDEX IF EXISTS public.idx_customer_items_valid_to;
DROP INDEX IF EXISTS public.idx_customer_items_supplier;
DROP INDEX IF EXISTS public.idx_customer_items_product;
DROP INDEX IF EXISTS public.idx_cids_jiku_code;
DROP INDEX IF EXISTS public.idx_cids_delivery_place;
DROP INDEX IF EXISTS public.idx_cids_customer_item;
DROP INDEX IF EXISTS public.idx_business_rules_type;
DROP INDEX IF EXISTS public.idx_business_rules_code;
DROP INDEX IF EXISTS public.idx_business_rules_active;
DROP INDEX IF EXISTS public.idx_batch_jobs_type;
DROP INDEX IF EXISTS public.idx_batch_jobs_status;
DROP INDEX IF EXISTS public.idx_batch_jobs_created;
DROP INDEX IF EXISTS public.idx_allocations_status;
DROP INDEX IF EXISTS public.idx_allocations_order_line;
DROP INDEX IF EXISTS public.idx_allocations_lot_reference;
DROP INDEX IF EXISTS public.idx_allocations_inbound_plan_line;
DROP INDEX IF EXISTS public.idx_allocations_allocation_type;
DROP INDEX IF EXISTS public.idx_allocation_traces_order_line;
DROP INDEX IF EXISTS public.idx_allocation_traces_lot;
DROP INDEX IF EXISTS public.idx_allocation_traces_created_at;
DROP INDEX IF EXISTS public.idx_allocation_suggestions_product;
DROP INDEX IF EXISTS public.idx_allocation_suggestions_period;
DROP INDEX IF EXISTS public.idx_allocation_suggestions_lot;
DROP INDEX IF EXISTS public.idx_allocation_suggestions_forecast;
DROP INDEX IF EXISTS public.idx_allocation_suggestions_customer;
DROP INDEX IF EXISTS public.idx_adjustments_lot;
DROP INDEX IF EXISTS public.idx_adjustments_date;
ALTER TABLE IF EXISTS ONLY public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_pkey;
ALTER TABLE IF EXISTS ONLY public.warehouses DROP CONSTRAINT IF EXISTS warehouses_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_azure_object_id_key;
ALTER TABLE IF EXISTS ONLY public.user_supplier_assignments DROP CONSTRAINT IF EXISTS user_supplier_assignments_pkey;
ALTER TABLE IF EXISTS ONLY public.user_roles DROP CONSTRAINT IF EXISTS user_roles_pkey;
ALTER TABLE IF EXISTS ONLY public.warehouses DROP CONSTRAINT IF EXISTS uq_warehouses_warehouse_code;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS uq_users_username;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS uq_users_email;
ALTER TABLE IF EXISTS ONLY public.user_supplier_assignments DROP CONSTRAINT IF EXISTS uq_user_supplier_assignments_user_supplier;
ALTER TABLE IF EXISTS ONLY public.product_uom_conversions DROP CONSTRAINT IF EXISTS uq_uom_conversions_product_unit;
ALTER TABLE IF EXISTS ONLY public.system_configs DROP CONSTRAINT IF EXISTS uq_system_configs_key;
ALTER TABLE IF EXISTS ONLY public.suppliers DROP CONSTRAINT IF EXISTS uq_suppliers_supplier_code;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS uq_roles_role_code;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS uq_products_maker_part_code;
ALTER TABLE IF EXISTS ONLY public.product_suppliers DROP CONSTRAINT IF EXISTS uq_product_supplier;
ALTER TABLE IF EXISTS ONLY public.product_mappings DROP CONSTRAINT IF EXISTS uq_product_mappings_cust_part_supp;
ALTER TABLE IF EXISTS ONLY public.order_lines DROP CONSTRAINT IF EXISTS uq_order_lines_customer_key;
ALTER TABLE IF EXISTS ONLY public.order_groups DROP CONSTRAINT IF EXISTS uq_order_groups_business_key;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS uq_lots_number_product_warehouse;
ALTER TABLE IF EXISTS ONLY public.delivery_places DROP CONSTRAINT IF EXISTS uq_delivery_places_code;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS uq_customers_customer_code;
ALTER TABLE IF EXISTS ONLY public.customer_item_jiku_mappings DROP CONSTRAINT IF EXISTS uq_customer_item_jiku;
ALTER TABLE IF EXISTS ONLY public.customer_item_delivery_settings DROP CONSTRAINT IF EXISTS uq_customer_item_delivery_settings;
ALTER TABLE IF EXISTS ONLY public.system_configs DROP CONSTRAINT IF EXISTS system_configs_pkey;
ALTER TABLE IF EXISTS ONLY public.system_client_logs DROP CONSTRAINT IF EXISTS system_client_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.suppliers DROP CONSTRAINT IF EXISTS suppliers_pkey;
ALTER TABLE IF EXISTS ONLY public.stock_history DROP CONSTRAINT IF EXISTS stock_history_pkey;
ALTER TABLE IF EXISTS ONLY public.seed_snapshots DROP CONSTRAINT IF EXISTS seed_snapshots_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.product_uom_conversions DROP CONSTRAINT IF EXISTS product_uom_conversions_pkey;
ALTER TABLE IF EXISTS ONLY public.product_suppliers DROP CONSTRAINT IF EXISTS product_suppliers_pkey;
ALTER TABLE IF EXISTS ONLY public.product_mappings DROP CONSTRAINT IF EXISTS product_mappings_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.order_lines DROP CONSTRAINT IF EXISTS order_lines_pkey;
ALTER TABLE IF EXISTS ONLY public.order_groups DROP CONSTRAINT IF EXISTS order_groups_pkey;
ALTER TABLE IF EXISTS ONLY public.operation_logs DROP CONSTRAINT IF EXISTS operation_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.master_change_logs DROP CONSTRAINT IF EXISTS master_change_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS lots_pkey;
ALTER TABLE IF EXISTS ONLY public.lot_reservations DROP CONSTRAINT IF EXISTS lot_reservations_pkey;
ALTER TABLE IF EXISTS ONLY public.inbound_plans DROP CONSTRAINT IF EXISTS inbound_plans_sap_po_number_key;
ALTER TABLE IF EXISTS ONLY public.inbound_plans DROP CONSTRAINT IF EXISTS inbound_plans_plan_number_key;
ALTER TABLE IF EXISTS ONLY public.inbound_plans DROP CONSTRAINT IF EXISTS inbound_plans_pkey;
ALTER TABLE IF EXISTS ONLY public.inbound_plan_lines DROP CONSTRAINT IF EXISTS inbound_plan_lines_pkey;
ALTER TABLE IF EXISTS ONLY public.forecast_history DROP CONSTRAINT IF EXISTS forecast_history_pkey;
ALTER TABLE IF EXISTS ONLY public.forecast_current DROP CONSTRAINT IF EXISTS forecast_current_pkey;
ALTER TABLE IF EXISTS ONLY public.expected_lots DROP CONSTRAINT IF EXISTS expected_lots_pkey;
ALTER TABLE IF EXISTS ONLY public.delivery_places DROP CONSTRAINT IF EXISTS delivery_places_pkey;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_pkey;
ALTER TABLE IF EXISTS ONLY public.customer_items DROP CONSTRAINT IF EXISTS customer_items_pkey;
ALTER TABLE IF EXISTS ONLY public.customer_item_jiku_mappings DROP CONSTRAINT IF EXISTS customer_item_jiku_mappings_pkey;
ALTER TABLE IF EXISTS ONLY public.customer_item_delivery_settings DROP CONSTRAINT IF EXISTS customer_item_delivery_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.business_rules DROP CONSTRAINT IF EXISTS business_rules_rule_code_key;
ALTER TABLE IF EXISTS ONLY public.business_rules DROP CONSTRAINT IF EXISTS business_rules_pkey;
ALTER TABLE IF EXISTS ONLY public.batch_jobs DROP CONSTRAINT IF EXISTS batch_jobs_pkey;
ALTER TABLE IF EXISTS ONLY public.allocations DROP CONSTRAINT IF EXISTS allocations_pkey;
ALTER TABLE IF EXISTS ONLY public.allocation_traces DROP CONSTRAINT IF EXISTS allocation_traces_pkey;
ALTER TABLE IF EXISTS ONLY public.allocation_suggestions DROP CONSTRAINT IF EXISTS allocation_suggestions_pkey;
ALTER TABLE IF EXISTS ONLY public.alembic_version DROP CONSTRAINT IF EXISTS alembic_version_pkc;
ALTER TABLE IF EXISTS ONLY public.adjustments DROP CONSTRAINT IF EXISTS adjustments_pkey;
ALTER TABLE IF EXISTS public.withdrawals ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.warehouses ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.user_supplier_assignments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_configs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_client_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.suppliers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.stock_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.seed_snapshots ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.products ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.product_uom_conversions ALTER COLUMN conversion_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.product_suppliers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.product_mappings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.orders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.order_lines ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.order_groups ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.operation_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.master_change_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lots ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lot_reservations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.inbound_plans ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.inbound_plan_lines ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.forecast_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.forecast_current ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.expected_lots ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.delivery_places ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.customers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.customer_item_jiku_mappings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.customer_item_delivery_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.business_rules ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.batch_jobs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.allocations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.allocation_traces ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.allocation_suggestions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.adjustments ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.withdrawals_id_seq;
DROP TABLE IF EXISTS public.withdrawals;
DROP SEQUENCE IF EXISTS public.warehouses_id_seq;
DROP VIEW IF EXISTS public.v_warehouse_code_to_id;
DROP VIEW IF EXISTS public.v_user_supplier_assignments;
DROP VIEW IF EXISTS public.v_supplier_code_to_id;
DROP VIEW IF EXISTS public.v_product_code_to_id;
DROP VIEW IF EXISTS public.v_order_line_details;
DROP VIEW IF EXISTS public.v_lot_details;
DROP TABLE IF EXISTS public.warehouses;
DROP VIEW IF EXISTS public.v_lot_current_stock;
DROP VIEW IF EXISTS public.v_inventory_summary;
DROP VIEW IF EXISTS public.v_forecast_order_pairs;
DROP VIEW IF EXISTS public.v_delivery_place_code_to_id;
DROP VIEW IF EXISTS public.v_customer_item_jiku_mappings;
DROP VIEW IF EXISTS public.v_customer_code_to_id;
DROP VIEW IF EXISTS public.v_candidate_lots_by_order_line;
DROP VIEW IF EXISTS public.v_order_line_context;
DROP VIEW IF EXISTS public.v_lot_available_qty;
DROP VIEW IF EXISTS public.v_lot_allocations;
DROP VIEW IF EXISTS public.v_customer_daily_products;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.user_supplier_assignments_id_seq;
DROP TABLE IF EXISTS public.user_supplier_assignments;
DROP TABLE IF EXISTS public.user_roles;
DROP SEQUENCE IF EXISTS public.system_configs_id_seq;
DROP TABLE IF EXISTS public.system_configs;
DROP SEQUENCE IF EXISTS public.system_client_logs_id_seq;
DROP TABLE IF EXISTS public.system_client_logs;
DROP SEQUENCE IF EXISTS public.suppliers_id_seq;
DROP TABLE IF EXISTS public.suppliers;
DROP SEQUENCE IF EXISTS public.stock_history_id_seq;
DROP TABLE IF EXISTS public.stock_history;
DROP SEQUENCE IF EXISTS public.seed_snapshots_id_seq;
DROP TABLE IF EXISTS public.seed_snapshots;
DROP SEQUENCE IF EXISTS public.roles_id_seq;
DROP TABLE IF EXISTS public.roles;
DROP SEQUENCE IF EXISTS public.products_id_seq;
DROP TABLE IF EXISTS public.products;
DROP SEQUENCE IF EXISTS public.product_uom_conversions_conversion_id_seq;
DROP TABLE IF EXISTS public.product_uom_conversions;
DROP SEQUENCE IF EXISTS public.product_suppliers_id_seq;
DROP TABLE IF EXISTS public.product_suppliers;
DROP SEQUENCE IF EXISTS public.product_mappings_id_seq;
DROP TABLE IF EXISTS public.product_mappings;
DROP SEQUENCE IF EXISTS public.orders_id_seq;
DROP TABLE IF EXISTS public.orders;
DROP SEQUENCE IF EXISTS public.order_lines_id_seq;
DROP TABLE IF EXISTS public.order_lines;
DROP SEQUENCE IF EXISTS public.order_groups_id_seq;
DROP TABLE IF EXISTS public.order_groups;
DROP SEQUENCE IF EXISTS public.operation_logs_id_seq;
DROP TABLE IF EXISTS public.operation_logs;
DROP SEQUENCE IF EXISTS public.master_change_logs_id_seq;
DROP TABLE IF EXISTS public.master_change_logs;
DROP SEQUENCE IF EXISTS public.lots_id_seq;
DROP TABLE IF EXISTS public.lots;
DROP SEQUENCE IF EXISTS public.lot_reservations_id_seq;
DROP TABLE IF EXISTS public.lot_reservations;
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
DROP SEQUENCE IF EXISTS public.customer_item_jiku_mappings_id_seq;
DROP TABLE IF EXISTS public.customer_item_jiku_mappings;
DROP SEQUENCE IF EXISTS public.customer_item_delivery_settings_id_seq;
DROP TABLE IF EXISTS public.customer_item_delivery_settings;
DROP SEQUENCE IF EXISTS public.business_rules_id_seq;
DROP TABLE IF EXISTS public.business_rules;
DROP SEQUENCE IF EXISTS public.batch_jobs_id_seq;
DROP TABLE IF EXISTS public.batch_jobs;
DROP SEQUENCE IF EXISTS public.allocations_id_seq;
DROP TABLE IF EXISTS public.allocations;
DROP SEQUENCE IF EXISTS public.allocation_traces_id_seq;
DROP TABLE IF EXISTS public.allocation_traces;
DROP SEQUENCE IF EXISTS public.allocation_suggestions_id_seq;
DROP TABLE IF EXISTS public.allocation_suggestions;
DROP TABLE IF EXISTS public.alembic_version;
DROP SEQUENCE IF EXISTS public.adjustments_id_seq;
DROP TABLE IF EXISTS public.adjustments;
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
    CONSTRAINT chk_adjustments_type CHECK (((adjustment_type)::text = ANY (ARRAY[('physical_count'::character varying)::text, ('damage'::character varying)::text, ('loss'::character varying)::text, ('found'::character varying)::text, ('other'::character varying)::text])))
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
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: allocation_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allocation_suggestions (
    id bigint NOT NULL,
    order_line_id bigint,
    forecast_period character varying(7) NOT NULL,
    customer_id bigint NOT NULL,
    delivery_place_id bigint NOT NULL,
    product_id bigint NOT NULL,
    lot_id bigint NOT NULL,
    quantity numeric(15,3) NOT NULL,
    allocation_type character varying(10) NOT NULL,
    source character varying(32) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    forecast_id bigint,
    priority integer DEFAULT 0 NOT NULL
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
-- Name: allocation_traces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allocation_traces (
    id bigint NOT NULL,
    order_line_id bigint NOT NULL,
    lot_id bigint,
    score numeric(15,6),
    decision character varying(20) NOT NULL,
    reason character varying(255) NOT NULL,
    allocated_qty numeric(15,3),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_allocation_traces_decision CHECK (((decision)::text = ANY ((ARRAY['adopted'::character varying, 'rejected'::character varying, 'partial'::character varying])::text[])))
);


--
-- Name: allocation_traces_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.allocation_traces_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: allocation_traces_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.allocation_traces_id_seq OWNED BY public.allocation_traces.id;


--
-- Name: allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allocations (
    id bigint NOT NULL,
    order_line_id bigint NOT NULL,
    allocated_quantity numeric(15,3) NOT NULL,
    status character varying(20) DEFAULT 'allocated'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    inbound_plan_line_id bigint,
    allocation_type character varying(10) DEFAULT 'soft'::character varying NOT NULL,
    confirmed_at timestamp without time zone,
    confirmed_by character varying(100),
    lot_reference character varying(100),
    CONSTRAINT chk_allocation_type CHECK (((allocation_type)::text = ANY ((ARRAY['soft'::character varying, 'hard'::character varying])::text[]))),
    CONSTRAINT chk_allocations_status CHECK (((status)::text = ANY ((ARRAY['allocated'::character varying, 'provisional'::character varying, 'shipped'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: COLUMN allocations.allocation_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocations.allocation_type IS 'Allocation type: soft (provisional) or hard (confirmed)';


--
-- Name: COLUMN allocations.confirmed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocations.confirmed_at IS 'Hard allocation confirmation timestamp';


--
-- Name: COLUMN allocations.confirmed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocations.confirmed_by IS 'User who confirmed the allocation';


--
-- Name: COLUMN allocations.lot_reference; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocations.lot_reference IS 'Lot number (business key reference, replaces lot_id FK)';


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
    CONSTRAINT chk_batch_jobs_status CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('running'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text]))),
    CONSTRAINT chk_batch_jobs_type CHECK (((job_type)::text = ANY (ARRAY[('allocation_suggestion'::character varying)::text, ('allocation_finalize'::character varying)::text, ('inventory_sync'::character varying)::text, ('data_import'::character varying)::text, ('report_generation'::character varying)::text])))
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
    CONSTRAINT chk_business_rules_type CHECK (((rule_type)::text = ANY ((ARRAY['allocation'::character varying, 'expiry_warning'::character varying, 'kanban'::character varying, 'inventory_sync_alert'::character varying, 'other'::character varying])::text[])))
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
-- Name: customer_item_delivery_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_item_delivery_settings (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    external_product_code character varying(100) NOT NULL,
    delivery_place_id bigint,
    jiku_code character varying(50),
    shipment_text text,
    packing_note text,
    lead_time_days integer,
    is_default boolean DEFAULT false NOT NULL,
    valid_from date,
    valid_to date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN customer_item_delivery_settings.delivery_place_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.delivery_place_id IS '納入先（NULLの場合はデフォルト設定）';


--
-- Name: COLUMN customer_item_delivery_settings.jiku_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.jiku_code IS '次区コード（NULLの場合は全次区共通）';


--
-- Name: COLUMN customer_item_delivery_settings.shipment_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.shipment_text IS '出荷表テキスト（SAP連携用）';


--
-- Name: COLUMN customer_item_delivery_settings.packing_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.packing_note IS '梱包・注意書き';


--
-- Name: COLUMN customer_item_delivery_settings.lead_time_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.lead_time_days IS 'リードタイム（日）';


--
-- Name: COLUMN customer_item_delivery_settings.is_default; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.is_default IS 'デフォルト設定フラグ';


--
-- Name: COLUMN customer_item_delivery_settings.valid_from; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.valid_from IS '有効開始日';


--
-- Name: COLUMN customer_item_delivery_settings.valid_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.valid_to IS '有効終了日';


--
-- Name: customer_item_delivery_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_item_delivery_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_item_delivery_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_item_delivery_settings_id_seq OWNED BY public.customer_item_delivery_settings.id;


--
-- Name: customer_item_jiku_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_item_jiku_mappings (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    external_product_code character varying(100) NOT NULL,
    jiku_code character varying(50) NOT NULL,
    delivery_place_id bigint NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_item_jiku_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_item_jiku_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_item_jiku_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_item_jiku_mappings_id_seq OWNED BY public.customer_item_jiku_mappings.id;


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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    shipping_document_template text,
    sap_notes text,
    valid_to date DEFAULT '9999-12-31'::date NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id bigint NOT NULL,
    customer_code character varying(50) NOT NULL,
    customer_name character varying(200) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    address character varying(500),
    contact_name character varying(100),
    phone character varying(50),
    email character varying(200),
    valid_to date DEFAULT '9999-12-31'::date NOT NULL
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
    jiku_code character varying(50) DEFAULT ''::character varying NOT NULL,
    delivery_place_code character varying(50) NOT NULL,
    delivery_place_name character varying(200) NOT NULL,
    customer_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    valid_to date DEFAULT '9999-12-31'::date NOT NULL
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
-- Name: forecast_current; Type: TABLE; Schema: public; Owner: -
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
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    forecast_period character varying(7) NOT NULL
);


--
-- Name: forecast_current_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forecast_current_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forecast_current_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forecast_current_id_seq OWNED BY public.forecast_current.id;


--
-- Name: forecast_history; Type: TABLE; Schema: public; Owner: -
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
    updated_at timestamp without time zone NOT NULL,
    forecast_period character varying(7) NOT NULL
);


--
-- Name: forecast_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forecast_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forecast_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forecast_history_id_seq OWNED BY public.forecast_history.id;


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
    sap_po_number character varying(20),
    CONSTRAINT chk_inbound_plans_status CHECK (((status)::text = ANY (ARRAY[('planned'::character varying)::text, ('partially_received'::character varying)::text, ('received'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: COLUMN inbound_plans.sap_po_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inbound_plans.sap_po_number IS 'SAP購買発注番号（業務キー）';


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
-- Name: lot_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_reservations (
    id bigint NOT NULL,
    lot_id bigint NOT NULL,
    source_type character varying(20) NOT NULL,
    source_id bigint,
    reserved_qty numeric(15,3) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp without time zone,
    confirmed_at timestamp without time zone,
    released_at timestamp without time zone,
    updated_at timestamp without time zone,
    CONSTRAINT chk_lot_reservations_qty_positive CHECK ((reserved_qty > (0)::numeric)),
    CONSTRAINT chk_lot_reservations_source_type CHECK (((source_type)::text = ANY ((ARRAY['forecast'::character varying, 'order'::character varying, 'manual'::character varying])::text[]))),
    CONSTRAINT chk_lot_reservations_status CHECK (((status)::text = ANY ((ARRAY['temporary'::character varying, 'active'::character varying, 'confirmed'::character varying, 'released'::character varying])::text[])))
);


--
-- Name: COLUMN lot_reservations.source_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.source_type IS 'Reservation source: ''forecast'' | ''order'' | ''manual''';


--
-- Name: COLUMN lot_reservations.source_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.source_id IS 'ID of the source entity (order_line_id, forecast_group_id, etc.)';


--
-- Name: COLUMN lot_reservations.reserved_qty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.reserved_qty IS 'Reserved quantity (must be positive)';


--
-- Name: COLUMN lot_reservations.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.status IS 'Reservation status: ''temporary'' | ''active'' | ''confirmed'' | ''released''';


--
-- Name: COLUMN lot_reservations.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.expires_at IS 'Expiration time for temporary reservations';


--
-- Name: COLUMN lot_reservations.confirmed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.confirmed_at IS 'Timestamp when reservation was confirmed';


--
-- Name: COLUMN lot_reservations.released_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.released_at IS 'Timestamp when reservation was released';


--
-- Name: COLUMN lot_reservations.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.updated_at IS 'Timestamp of last update';


--
-- Name: lot_reservations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lot_reservations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lot_reservations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lot_reservations_id_seq OWNED BY public.lot_reservations.id;


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
    unit character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    lock_reason text,
    inspection_status character varying(20) DEFAULT 'not_required'::character varying NOT NULL,
    inspection_date date,
    inspection_cert_number character varying(100),
    locked_quantity numeric(15,3) DEFAULT '0'::numeric NOT NULL,
    origin_type character varying(20) DEFAULT 'adhoc'::character varying NOT NULL,
    origin_reference character varying(255),
    CONSTRAINT chk_lots_current_quantity CHECK ((current_quantity >= (0)::numeric)),
    CONSTRAINT chk_lots_inspection_status CHECK (((inspection_status)::text = ANY ((ARRAY['not_required'::character varying, 'pending'::character varying, 'passed'::character varying, 'failed'::character varying])::text[]))),
    CONSTRAINT chk_lots_locked_quantity CHECK ((locked_quantity >= (0)::numeric)),
    CONSTRAINT chk_lots_origin_type CHECK (((origin_type)::text = ANY ((ARRAY['order'::character varying, 'forecast'::character varying, 'sample'::character varying, 'safety_stock'::character varying, 'adhoc'::character varying])::text[]))),
    CONSTRAINT chk_lots_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'depleted'::character varying, 'expired'::character varying, 'quarantine'::character varying, 'locked'::character varying])::text[])))
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
    CONSTRAINT chk_master_change_logs_type CHECK (((change_type)::text = ANY (ARRAY[('insert'::character varying)::text, ('update'::character varying)::text, ('delete'::character varying)::text])))
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
    CONSTRAINT chk_operation_logs_type CHECK (((operation_type)::text = ANY (ARRAY[('create'::character varying)::text, ('update'::character varying)::text, ('delete'::character varying)::text, ('login'::character varying)::text, ('logout'::character varying)::text, ('export'::character varying)::text])))
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
-- Name: order_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_groups (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    product_id bigint NOT NULL,
    order_date date NOT NULL,
    source_file_name character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN order_groups.source_file_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_groups.source_file_name IS '取り込み元ファイル名';


--
-- Name: order_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_groups_id_seq OWNED BY public.order_groups.id;


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
    version integer DEFAULT 1 NOT NULL,
    converted_quantity numeric(15,3),
    sap_order_no character varying(20),
    shipping_document_text text,
    order_type character varying(20) DEFAULT 'ORDER'::character varying NOT NULL,
    order_group_id bigint,
    customer_order_no character varying(6),
    customer_order_line_no character varying(10),
    sap_order_item_no character varying(6),
    forecast_reference character varying(100),
    CONSTRAINT chk_order_lines_order_type CHECK (((order_type)::text = ANY ((ARRAY['FORECAST_LINKED'::character varying, 'KANBAN'::character varying, 'SPOT'::character varying, 'ORDER'::character varying])::text[]))),
    CONSTRAINT chk_order_lines_status CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('allocated'::character varying)::text, ('shipped'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: COLUMN order_lines.sap_order_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.sap_order_no IS 'SAP受注番号（業務キー）';


--
-- Name: COLUMN order_lines.shipping_document_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.shipping_document_text IS '出荷表テキスト';


--
-- Name: COLUMN order_lines.order_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.order_type IS '需要種別: FORECAST_LINKED / KANBAN / SPOT / ORDER';


--
-- Name: COLUMN order_lines.order_group_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.order_group_id IS '受注グループへの参照（得意先×製品×受注日）';


--
-- Name: COLUMN order_lines.customer_order_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.customer_order_no IS '得意先6桁受注番号（業務キー）';


--
-- Name: COLUMN order_lines.customer_order_line_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.customer_order_line_no IS '得意先側行番号';


--
-- Name: COLUMN order_lines.sap_order_item_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.sap_order_item_no IS 'SAP明細番号（業務キー）';


--
-- Name: COLUMN order_lines.forecast_reference; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.forecast_reference IS 'Forecast business key reference (replaces forecast_id FK)';


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
    customer_id bigint NOT NULL,
    order_date date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    locked_by_user_id integer,
    locked_at timestamp without time zone,
    lock_expires_at timestamp without time zone
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
-- Name: product_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_mappings (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    customer_part_code character varying(100) NOT NULL,
    supplier_id bigint NOT NULL,
    product_id bigint NOT NULL,
    base_unit character varying(20) NOT NULL,
    pack_unit character varying(20),
    pack_quantity integer,
    special_instructions text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    valid_to date DEFAULT '9999-12-31'::date NOT NULL
);


--
-- Name: product_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_mappings_id_seq OWNED BY public.product_mappings.id;


--
-- Name: product_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_suppliers (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    supplier_id bigint NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    lead_time_days integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    valid_to date DEFAULT '9999-12-31'::date NOT NULL
);


--
-- Name: product_suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_suppliers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_suppliers_id_seq OWNED BY public.product_suppliers.id;


--
-- Name: product_uom_conversions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_uom_conversions (
    conversion_id bigint NOT NULL,
    product_id bigint NOT NULL,
    external_unit character varying(20) NOT NULL,
    factor numeric(15,3) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    valid_to date DEFAULT '9999-12-31'::date NOT NULL
);


--
-- Name: product_uom_conversions_conversion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_uom_conversions_conversion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_uom_conversions_conversion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_uom_conversions_conversion_id_seq OWNED BY public.product_uom_conversions.conversion_id;


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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    internal_unit character varying(20) DEFAULT 'CAN'::character varying NOT NULL,
    external_unit character varying(20) DEFAULT 'KG'::character varying NOT NULL,
    qty_per_internal_unit numeric(10,4) DEFAULT 1.0 NOT NULL,
    valid_to date DEFAULT '9999-12-31'::date NOT NULL
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
-- Name: seed_snapshots; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: COLUMN seed_snapshots.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seed_snapshots.name IS 'スナップショット名';


--
-- Name: COLUMN seed_snapshots.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seed_snapshots.created_at IS '作成日時';


--
-- Name: COLUMN seed_snapshots.params_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seed_snapshots.params_json IS '展開後の最終パラメータ（profile解決後）';


--
-- Name: COLUMN seed_snapshots.profile_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seed_snapshots.profile_json IS '使用したプロファイル設定';


--
-- Name: COLUMN seed_snapshots.csv_dir; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seed_snapshots.csv_dir IS 'CSVエクスポートディレクトリ（オプション）';


--
-- Name: COLUMN seed_snapshots.summary_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seed_snapshots.summary_json IS '生成結果のサマリ（件数、検証結果など）';


--
-- Name: seed_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seed_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seed_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.seed_snapshots_id_seq OWNED BY public.seed_snapshots.id;


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
    CONSTRAINT chk_stock_history_type CHECK (((transaction_type)::text = ANY ((ARRAY['inbound'::character varying, 'allocation'::character varying, 'shipment'::character varying, 'adjustment'::character varying, 'return'::character varying, 'withdrawal'::character varying])::text[])))
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    valid_to date DEFAULT '9999-12-31'::date NOT NULL
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
-- Name: system_client_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_client_logs (
    id bigint NOT NULL,
    user_id bigint,
    level character varying(20) DEFAULT 'info'::character varying NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_agent character varying(255)
);


--
-- Name: system_client_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_client_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_client_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_client_logs_id_seq OWNED BY public.system_client_logs.id;


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
-- Name: user_supplier_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_supplier_assignments (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    supplier_id bigint NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_supplier_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_supplier_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_supplier_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_supplier_assignments_id_seq OWNED BY public.user_supplier_assignments.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    display_name character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    auth_provider character varying(50) DEFAULT 'local'::character varying NOT NULL,
    azure_object_id character varying(100)
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
-- Name: v_customer_daily_products; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_customer_daily_products AS
 SELECT DISTINCT f.customer_id,
    f.product_id
   FROM public.forecast_current f
  WHERE (f.forecast_period IS NOT NULL);


--
-- Name: v_lot_allocations; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lot_allocations AS
 SELECT lot_reservations.lot_id,
    sum(lot_reservations.reserved_qty) AS allocated_quantity
   FROM public.lot_reservations
  WHERE ((lot_reservations.status)::text = 'active'::text)
  GROUP BY lot_reservations.lot_id;


--
-- Name: v_lot_available_qty; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lot_available_qty AS
 SELECT l.id AS lot_id,
    l.product_id,
    l.warehouse_id,
    GREATEST(((l.current_quantity - COALESCE(la.allocated_quantity, (0)::numeric)) - l.locked_quantity), (0)::numeric) AS available_qty,
    l.received_date AS receipt_date,
    l.expiry_date,
    l.status AS lot_status
   FROM (public.lots l
     LEFT JOIN public.v_lot_allocations la ON ((l.id = la.lot_id)))
  WHERE (((l.status)::text = 'active'::text) AND ((l.expiry_date IS NULL) OR (l.expiry_date >= CURRENT_DATE)) AND (((l.current_quantity - COALESCE(la.allocated_quantity, (0)::numeric)) - l.locked_quantity) > (0)::numeric));


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
-- Name: v_candidate_lots_by_order_line; Type: VIEW; Schema: public; Owner: -
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
-- Name: v_inventory_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_inventory_summary AS
 SELECT l.product_id,
    l.warehouse_id,
    sum(l.current_quantity) AS total_quantity,
    sum(COALESCE(la.allocated_quantity, (0)::numeric)) AS allocated_quantity,
    sum(l.locked_quantity) AS locked_quantity,
    GREATEST(((sum(l.current_quantity) - sum(COALESCE(la.allocated_quantity, (0)::numeric))) - sum(l.locked_quantity)), (0)::numeric) AS available_quantity,
    COALESCE(sum(ipl.planned_quantity), (0)::numeric) AS provisional_stock,
    GREATEST((((sum(l.current_quantity) - sum(COALESCE(la.allocated_quantity, (0)::numeric))) - sum(l.locked_quantity)) + COALESCE(sum(ipl.planned_quantity), (0)::numeric)), (0)::numeric) AS available_with_provisional,
    max(l.updated_at) AS last_updated
   FROM (((public.lots l
     LEFT JOIN public.v_lot_allocations la ON ((l.id = la.lot_id)))
     LEFT JOIN public.inbound_plan_lines ipl ON ((l.product_id = ipl.product_id)))
     LEFT JOIN public.inbound_plans ip ON (((ipl.inbound_plan_id = ip.id) AND ((ip.status)::text = 'planned'::text))))
  WHERE ((l.status)::text = 'active'::text)
  GROUP BY l.product_id, l.warehouse_id;


--
-- Name: VIEW v_inventory_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_inventory_summary IS '在庫集計ビュー（仮在庫含む）';


--
-- Name: v_lot_current_stock; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lot_current_stock AS
 SELECT l.id AS lot_id,
    l.product_id,
    l.warehouse_id,
    l.current_quantity,
    l.updated_at AS last_updated
   FROM public.lots l
  WHERE (l.current_quantity > (0)::numeric);


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
    valid_to date DEFAULT '9999-12-31'::date NOT NULL,
    CONSTRAINT chk_warehouse_type CHECK (((warehouse_type)::text = ANY (ARRAY[('internal'::character varying)::text, ('external'::character varying)::text, ('supplier'::character varying)::text])))
);


--
-- Name: v_lot_details; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lot_details AS
 SELECT l.id AS lot_id,
    l.lot_number,
    l.product_id,
    COALESCE(p.maker_part_code, ''::character varying) AS maker_part_code,
    COALESCE(p.product_name, '[削除済み製品]'::character varying) AS product_name,
    l.warehouse_id,
    COALESCE(w.warehouse_code, ''::character varying) AS warehouse_code,
    COALESCE(w.warehouse_name, '[削除済み倉庫]'::character varying) AS warehouse_name,
    l.supplier_id,
    COALESCE(s.supplier_code, ''::character varying) AS supplier_code,
    COALESCE(s.supplier_name, '[削除済み仕入先]'::character varying) AS supplier_name,
    l.received_date,
    l.expiry_date,
    l.current_quantity,
    COALESCE(la.allocated_quantity, (0)::numeric) AS allocated_quantity,
    l.locked_quantity,
    GREATEST(((l.current_quantity - COALESCE(la.allocated_quantity, (0)::numeric)) - l.locked_quantity), (0)::numeric) AS available_quantity,
    l.unit,
    l.status,
    l.lock_reason,
        CASE
            WHEN (l.expiry_date IS NOT NULL) THEN (l.expiry_date - CURRENT_DATE)
            ELSE NULL::integer
        END AS days_to_expiry,
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
    l.created_at,
    l.updated_at
   FROM ((((((public.lots l
     LEFT JOIN public.v_lot_allocations la ON ((l.id = la.lot_id)))
     LEFT JOIN public.products p ON ((l.product_id = p.id)))
     LEFT JOIN public.warehouses w ON ((l.warehouse_id = w.id)))
     LEFT JOIN public.suppliers s ON ((l.supplier_id = s.id)))
     LEFT JOIN public.user_supplier_assignments usa_primary ON (((usa_primary.supplier_id = l.supplier_id) AND (usa_primary.is_primary = true))))
     LEFT JOIN public.users u_primary ON ((u_primary.id = usa_primary.user_id)));


--
-- Name: VIEW v_lot_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_lot_details IS 'ロット詳細ビュー（担当者情報含む、soft-delete対応）';


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
    COALESCE(alloc_sum.allocated_qty, (0)::numeric) AS allocated_quantity,
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
     LEFT JOIN ( SELECT allocations.order_line_id,
            sum(allocations.allocated_quantity) AS allocated_qty
           FROM public.allocations
          GROUP BY allocations.order_line_id) alloc_sum ON ((alloc_sum.order_line_id = ol.id)));


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
-- Name: withdrawals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawals (
    id bigint NOT NULL,
    lot_id bigint NOT NULL,
    quantity numeric(15,3) NOT NULL,
    withdrawal_type character varying(20) NOT NULL,
    customer_id bigint,
    delivery_place_id bigint,
    ship_date date NOT NULL,
    reason text,
    reference_number character varying(100),
    withdrawn_by bigint,
    withdrawn_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_withdrawals_quantity CHECK ((quantity > (0)::numeric)),
    CONSTRAINT chk_withdrawals_type CHECK (((withdrawal_type)::text = ANY ((ARRAY['order_manual'::character varying, 'internal_use'::character varying, 'disposal'::character varying, 'return'::character varying, 'sample'::character varying, 'other'::character varying])::text[])))
);


--
-- Name: withdrawals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.withdrawals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: withdrawals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.withdrawals_id_seq OWNED BY public.withdrawals.id;


--
-- Name: adjustments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adjustments ALTER COLUMN id SET DEFAULT nextval('public.adjustments_id_seq'::regclass);


--
-- Name: allocation_suggestions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions ALTER COLUMN id SET DEFAULT nextval('public.allocation_suggestions_id_seq'::regclass);


--
-- Name: allocation_traces id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_traces ALTER COLUMN id SET DEFAULT nextval('public.allocation_traces_id_seq'::regclass);


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
-- Name: customer_item_delivery_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_delivery_settings ALTER COLUMN id SET DEFAULT nextval('public.customer_item_delivery_settings_id_seq'::regclass);


--
-- Name: customer_item_jiku_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_jiku_mappings ALTER COLUMN id SET DEFAULT nextval('public.customer_item_jiku_mappings_id_seq'::regclass);


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
-- Name: forecast_current id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_current ALTER COLUMN id SET DEFAULT nextval('public.forecast_current_id_seq'::regclass);


--
-- Name: forecast_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_history ALTER COLUMN id SET DEFAULT nextval('public.forecast_history_id_seq'::regclass);


--
-- Name: inbound_plan_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plan_lines ALTER COLUMN id SET DEFAULT nextval('public.inbound_plan_lines_id_seq'::regclass);


--
-- Name: inbound_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plans ALTER COLUMN id SET DEFAULT nextval('public.inbound_plans_id_seq'::regclass);


--
-- Name: lot_reservations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_reservations ALTER COLUMN id SET DEFAULT nextval('public.lot_reservations_id_seq'::regclass);


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
-- Name: order_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_groups ALTER COLUMN id SET DEFAULT nextval('public.order_groups_id_seq'::regclass);


--
-- Name: order_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines ALTER COLUMN id SET DEFAULT nextval('public.order_lines_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: product_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_mappings ALTER COLUMN id SET DEFAULT nextval('public.product_mappings_id_seq'::regclass);


--
-- Name: product_suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suppliers ALTER COLUMN id SET DEFAULT nextval('public.product_suppliers_id_seq'::regclass);


--
-- Name: product_uom_conversions conversion_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_uom_conversions ALTER COLUMN conversion_id SET DEFAULT nextval('public.product_uom_conversions_conversion_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: seed_snapshots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seed_snapshots ALTER COLUMN id SET DEFAULT nextval('public.seed_snapshots_id_seq'::regclass);


--
-- Name: stock_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_history ALTER COLUMN id SET DEFAULT nextval('public.stock_history_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: system_client_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_client_logs ALTER COLUMN id SET DEFAULT nextval('public.system_client_logs_id_seq'::regclass);


--
-- Name: system_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs ALTER COLUMN id SET DEFAULT nextval('public.system_configs_id_seq'::regclass);


--
-- Name: user_supplier_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_supplier_assignments ALTER COLUMN id SET DEFAULT nextval('public.user_supplier_assignments_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Name: withdrawals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals ALTER COLUMN id SET DEFAULT nextval('public.withdrawals_id_seq'::regclass);


--
-- Name: adjustments adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adjustments
    ADD CONSTRAINT adjustments_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: allocation_suggestions allocation_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT allocation_suggestions_pkey PRIMARY KEY (id);


--
-- Name: allocation_traces allocation_traces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_traces
    ADD CONSTRAINT allocation_traces_pkey PRIMARY KEY (id);


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
-- Name: customer_item_delivery_settings customer_item_delivery_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_delivery_settings
    ADD CONSTRAINT customer_item_delivery_settings_pkey PRIMARY KEY (id);


--
-- Name: customer_item_jiku_mappings customer_item_jiku_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_jiku_mappings
    ADD CONSTRAINT customer_item_jiku_mappings_pkey PRIMARY KEY (id);


--
-- Name: customer_items customer_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_items
    ADD CONSTRAINT customer_items_pkey PRIMARY KEY (customer_id, external_product_code);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


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
-- Name: forecast_current forecast_current_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_current
    ADD CONSTRAINT forecast_current_pkey PRIMARY KEY (id);


--
-- Name: forecast_history forecast_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_history
    ADD CONSTRAINT forecast_history_pkey PRIMARY KEY (id);


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
-- Name: inbound_plans inbound_plans_sap_po_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plans
    ADD CONSTRAINT inbound_plans_sap_po_number_key UNIQUE (sap_po_number);


--
-- Name: lot_reservations lot_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_reservations
    ADD CONSTRAINT lot_reservations_pkey PRIMARY KEY (id);


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
-- Name: order_groups order_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_groups
    ADD CONSTRAINT order_groups_pkey PRIMARY KEY (id);


--
-- Name: order_lines order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_mappings product_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_mappings
    ADD CONSTRAINT product_mappings_pkey PRIMARY KEY (id);


--
-- Name: product_suppliers product_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suppliers
    ADD CONSTRAINT product_suppliers_pkey PRIMARY KEY (id);


--
-- Name: product_uom_conversions product_uom_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_uom_conversions
    ADD CONSTRAINT product_uom_conversions_pkey PRIMARY KEY (conversion_id);


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
-- Name: seed_snapshots seed_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seed_snapshots
    ADD CONSTRAINT seed_snapshots_pkey PRIMARY KEY (id);


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
-- Name: system_client_logs system_client_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_client_logs
    ADD CONSTRAINT system_client_logs_pkey PRIMARY KEY (id);


--
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- Name: customer_item_delivery_settings uq_customer_item_delivery_settings; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_delivery_settings
    ADD CONSTRAINT uq_customer_item_delivery_settings UNIQUE (customer_id, external_product_code, delivery_place_id, jiku_code);


--
-- Name: customer_item_jiku_mappings uq_customer_item_jiku; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_jiku_mappings
    ADD CONSTRAINT uq_customer_item_jiku UNIQUE (customer_id, external_product_code, jiku_code);


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
-- Name: lots uq_lots_number_product_warehouse; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT uq_lots_number_product_warehouse UNIQUE (lot_number, product_id, warehouse_id);


--
-- Name: order_groups uq_order_groups_business_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_groups
    ADD CONSTRAINT uq_order_groups_business_key UNIQUE (customer_id, product_id, order_date);


--
-- Name: order_lines uq_order_lines_customer_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT uq_order_lines_customer_key UNIQUE (order_group_id, customer_order_no);


--
-- Name: product_mappings uq_product_mappings_cust_part_supp; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_mappings
    ADD CONSTRAINT uq_product_mappings_cust_part_supp UNIQUE (customer_id, customer_part_code, supplier_id);


--
-- Name: product_suppliers uq_product_supplier; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suppliers
    ADD CONSTRAINT uq_product_supplier UNIQUE (product_id, supplier_id);


--
-- Name: products uq_products_maker_part_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT uq_products_maker_part_code UNIQUE (maker_part_code);


--
-- Name: roles uq_roles_role_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT uq_roles_role_code UNIQUE (role_code);


--
-- Name: suppliers uq_suppliers_supplier_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT uq_suppliers_supplier_code UNIQUE (supplier_code);


--
-- Name: system_configs uq_system_configs_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT uq_system_configs_key UNIQUE (config_key);


--
-- Name: product_uom_conversions uq_uom_conversions_product_unit; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_uom_conversions
    ADD CONSTRAINT uq_uom_conversions_product_unit UNIQUE (product_id, external_unit);


--
-- Name: user_supplier_assignments uq_user_supplier_assignments_user_supplier; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_supplier_assignments
    ADD CONSTRAINT uq_user_supplier_assignments_user_supplier UNIQUE (user_id, supplier_id);


--
-- Name: users uq_users_email; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_email UNIQUE (email);


--
-- Name: users uq_users_username; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_username UNIQUE (username);


--
-- Name: warehouses uq_warehouses_warehouse_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT uq_warehouses_warehouse_code UNIQUE (warehouse_code);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: user_supplier_assignments user_supplier_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_supplier_assignments
    ADD CONSTRAINT user_supplier_assignments_pkey PRIMARY KEY (id);


--
-- Name: users users_azure_object_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_azure_object_id_key UNIQUE (azure_object_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: withdrawals withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_pkey PRIMARY KEY (id);


--
-- Name: idx_adjustments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adjustments_date ON public.adjustments USING btree (adjusted_at);


--
-- Name: idx_adjustments_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adjustments_lot ON public.adjustments USING btree (lot_id);


--
-- Name: idx_allocation_suggestions_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_suggestions_customer ON public.allocation_suggestions USING btree (customer_id);


--
-- Name: idx_allocation_suggestions_forecast; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_suggestions_forecast ON public.allocation_suggestions USING btree (forecast_id);


--
-- Name: idx_allocation_suggestions_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_suggestions_lot ON public.allocation_suggestions USING btree (lot_id);


--
-- Name: idx_allocation_suggestions_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_suggestions_period ON public.allocation_suggestions USING btree (forecast_period);


--
-- Name: idx_allocation_suggestions_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_suggestions_product ON public.allocation_suggestions USING btree (product_id);


--
-- Name: idx_allocation_traces_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_traces_created_at ON public.allocation_traces USING btree (created_at);


--
-- Name: idx_allocation_traces_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_traces_lot ON public.allocation_traces USING btree (lot_id);


--
-- Name: idx_allocation_traces_order_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_traces_order_line ON public.allocation_traces USING btree (order_line_id);


--
-- Name: idx_allocations_allocation_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocations_allocation_type ON public.allocations USING btree (allocation_type);


--
-- Name: idx_allocations_inbound_plan_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocations_inbound_plan_line ON public.allocations USING btree (inbound_plan_line_id);


--
-- Name: idx_allocations_lot_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocations_lot_reference ON public.allocations USING btree (lot_reference);


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
-- Name: idx_cids_customer_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cids_customer_item ON public.customer_item_delivery_settings USING btree (customer_id, external_product_code);


--
-- Name: idx_cids_delivery_place; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cids_delivery_place ON public.customer_item_delivery_settings USING btree (delivery_place_id);


--
-- Name: idx_cids_jiku_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cids_jiku_code ON public.customer_item_delivery_settings USING btree (jiku_code);


--
-- Name: idx_customer_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_items_product ON public.customer_items USING btree (product_id);


--
-- Name: idx_customer_items_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_items_supplier ON public.customer_items USING btree (supplier_id);


--
-- Name: idx_customer_items_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_items_valid_to ON public.customer_items USING btree (valid_to);


--
-- Name: idx_customers_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_code ON public.customers USING btree (customer_code);


--
-- Name: idx_customers_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_valid_to ON public.customers USING btree (valid_to);


--
-- Name: idx_delivery_places_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_places_code ON public.delivery_places USING btree (delivery_place_code);


--
-- Name: idx_delivery_places_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_places_customer ON public.delivery_places USING btree (customer_id);


--
-- Name: idx_delivery_places_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_places_valid_to ON public.delivery_places USING btree (valid_to);


--
-- Name: idx_expected_lots_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expected_lots_line ON public.expected_lots USING btree (inbound_plan_line_id);


--
-- Name: idx_expected_lots_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expected_lots_number ON public.expected_lots USING btree (expected_lot_number);


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
-- Name: idx_lot_reservations_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_reservations_expires_at ON public.lot_reservations USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_lot_reservations_lot_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_reservations_lot_status ON public.lot_reservations USING btree (lot_id, status);


--
-- Name: idx_lot_reservations_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_reservations_source ON public.lot_reservations USING btree (source_type, source_id);


--
-- Name: idx_lot_reservations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_reservations_status ON public.lot_reservations USING btree (status);


--
-- Name: idx_lots_expiry_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_expiry_date ON public.lots USING btree (expiry_date) WHERE (expiry_date IS NOT NULL);


--
-- Name: idx_lots_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_number ON public.lots USING btree (lot_number);


--
-- Name: idx_lots_origin_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_origin_type ON public.lots USING btree (origin_type);


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
-- Name: idx_order_groups_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_groups_customer ON public.order_groups USING btree (customer_id);


--
-- Name: idx_order_groups_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_groups_date ON public.order_groups USING btree (order_date);


--
-- Name: idx_order_groups_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_groups_product ON public.order_groups USING btree (product_id);


--
-- Name: idx_order_lines_customer_order_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_customer_order_no ON public.order_lines USING btree (customer_order_no) WHERE (customer_order_no IS NOT NULL);


--
-- Name: idx_order_lines_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_date ON public.order_lines USING btree (delivery_date);


--
-- Name: idx_order_lines_delivery_place; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_delivery_place ON public.order_lines USING btree (delivery_place_id);


--
-- Name: idx_order_lines_forecast_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_forecast_reference ON public.order_lines USING btree (forecast_reference) WHERE (forecast_reference IS NOT NULL);


--
-- Name: idx_order_lines_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_order ON public.order_lines USING btree (order_id);


--
-- Name: idx_order_lines_order_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_order_group ON public.order_lines USING btree (order_group_id);


--
-- Name: idx_order_lines_order_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_order_type ON public.order_lines USING btree (order_type);


--
-- Name: idx_order_lines_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_product ON public.order_lines USING btree (product_id);


--
-- Name: idx_order_lines_sap_order_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_sap_order_no ON public.order_lines USING btree (sap_order_no) WHERE (sap_order_no IS NOT NULL);


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
-- Name: idx_orders_lock_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_lock_expires ON public.orders USING btree (lock_expires_at) WHERE (lock_expires_at IS NOT NULL);


--
-- Name: idx_orders_locked_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_locked_by ON public.orders USING btree (locked_by_user_id);


--
-- Name: idx_product_mappings_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_mappings_customer ON public.product_mappings USING btree (customer_id);


--
-- Name: idx_product_mappings_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_mappings_product ON public.product_mappings USING btree (product_id);


--
-- Name: idx_product_mappings_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_mappings_supplier ON public.product_mappings USING btree (supplier_id);


--
-- Name: idx_product_mappings_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_mappings_valid_to ON public.product_mappings USING btree (valid_to);


--
-- Name: idx_product_suppliers_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_suppliers_valid_to ON public.product_suppliers USING btree (valid_to);


--
-- Name: idx_product_uom_conversions_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_uom_conversions_valid_to ON public.product_uom_conversions USING btree (valid_to);


--
-- Name: idx_products_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_code ON public.products USING btree (maker_part_code);


--
-- Name: idx_products_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_name ON public.products USING btree (product_name);


--
-- Name: idx_products_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_valid_to ON public.products USING btree (valid_to);


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
-- Name: idx_suppliers_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_valid_to ON public.suppliers USING btree (valid_to);


--
-- Name: idx_system_client_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_client_logs_created_at ON public.system_client_logs USING btree (created_at);


--
-- Name: idx_system_client_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_client_logs_user_id ON public.system_client_logs USING btree (user_id);


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
-- Name: idx_user_supplier_assignments_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_supplier_assignments_primary ON public.user_supplier_assignments USING btree (is_primary) WHERE (is_primary = true);


--
-- Name: idx_user_supplier_assignments_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_supplier_assignments_supplier ON public.user_supplier_assignments USING btree (supplier_id);


--
-- Name: idx_user_supplier_assignments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_supplier_assignments_user ON public.user_supplier_assignments USING btree (user_id);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_active ON public.users USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_users_auth_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_auth_provider ON public.users USING btree (auth_provider);


--
-- Name: idx_users_azure_oid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_azure_oid ON public.users USING btree (azure_object_id);


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
-- Name: idx_warehouses_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouses_valid_to ON public.warehouses USING btree (valid_to);


--
-- Name: idx_withdrawals_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_customer ON public.withdrawals USING btree (customer_id);


--
-- Name: idx_withdrawals_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_date ON public.withdrawals USING btree (ship_date);


--
-- Name: idx_withdrawals_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_lot ON public.withdrawals USING btree (lot_id);


--
-- Name: idx_withdrawals_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_type ON public.withdrawals USING btree (withdrawal_type);


--
-- Name: ix_forecast_current_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_forecast_current_key ON public.forecast_current USING btree (customer_id, delivery_place_id, product_id);


--
-- Name: ix_forecast_history_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_forecast_history_key ON public.forecast_history USING btree (customer_id, delivery_place_id, product_id);


--
-- Name: uq_product_primary_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_product_primary_supplier ON public.product_suppliers USING btree (product_id) WHERE (is_primary = true);


--
-- Name: uq_user_supplier_primary_per_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_user_supplier_primary_per_supplier ON public.user_supplier_assignments USING btree (supplier_id) WHERE (is_primary = true);


--
-- Name: ux_forecast_current_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_forecast_current_unique ON public.forecast_current USING btree (customer_id, delivery_place_id, product_id, forecast_date, forecast_period);


--
-- Name: allocation_suggestions allocation_suggestions_forecast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT allocation_suggestions_forecast_id_fkey FOREIGN KEY (forecast_id) REFERENCES public.forecast_current(id) ON DELETE CASCADE;


--
-- Name: allocation_traces allocation_traces_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_traces
    ADD CONSTRAINT allocation_traces_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: allocation_traces allocation_traces_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_traces
    ADD CONSTRAINT allocation_traces_order_line_id_fkey FOREIGN KEY (order_line_id) REFERENCES public.order_lines(id) ON DELETE CASCADE;


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
-- Name: allocation_suggestions fk_allocation_suggestions_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT fk_allocation_suggestions_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: allocation_suggestions fk_allocation_suggestions_delivery_place; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT fk_allocation_suggestions_delivery_place FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE CASCADE;


--
-- Name: allocation_suggestions fk_allocation_suggestions_lot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT fk_allocation_suggestions_lot FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: allocation_suggestions fk_allocation_suggestions_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT fk_allocation_suggestions_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: allocations fk_allocations_inbound_plan_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT fk_allocations_inbound_plan_line FOREIGN KEY (inbound_plan_line_id) REFERENCES public.inbound_plan_lines(id) ON DELETE CASCADE;


--
-- Name: allocations fk_allocations_order_line; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocations
    ADD CONSTRAINT fk_allocations_order_line FOREIGN KEY (order_line_id) REFERENCES public.order_lines(id) ON DELETE CASCADE;


--
-- Name: customer_item_delivery_settings fk_cids_customer_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_delivery_settings
    ADD CONSTRAINT fk_cids_customer_item FOREIGN KEY (customer_id, external_product_code) REFERENCES public.customer_items(customer_id, external_product_code) ON DELETE CASCADE;


--
-- Name: customer_item_delivery_settings fk_cids_delivery_place; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_delivery_settings
    ADD CONSTRAINT fk_cids_delivery_place FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE SET NULL;


--
-- Name: customer_item_jiku_mappings fk_customer_item_jiku_customer_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_jiku_mappings
    ADD CONSTRAINT fk_customer_item_jiku_customer_item FOREIGN KEY (customer_id, external_product_code) REFERENCES public.customer_items(customer_id, external_product_code) ON DELETE CASCADE;


--
-- Name: customer_item_jiku_mappings fk_customer_item_jiku_delivery_place; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_jiku_mappings
    ADD CONSTRAINT fk_customer_item_jiku_delivery_place FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE CASCADE;


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
-- Name: forecast_current fk_forecast_current_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_current
    ADD CONSTRAINT fk_forecast_current_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: forecast_current fk_forecast_current_delivery_place; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_current
    ADD CONSTRAINT fk_forecast_current_delivery_place FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE RESTRICT;


--
-- Name: forecast_current fk_forecast_current_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_current
    ADD CONSTRAINT fk_forecast_current_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


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
-- Name: lot_reservations fk_lot_reservations_lot_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_reservations
    ADD CONSTRAINT fk_lot_reservations_lot_id FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE RESTRICT;


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
-- Name: product_suppliers fk_product_suppliers_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suppliers
    ADD CONSTRAINT fk_product_suppliers_product FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: product_suppliers fk_product_suppliers_supplier; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suppliers
    ADD CONSTRAINT fk_product_suppliers_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: stock_history fk_stock_history_lot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_history
    ADD CONSTRAINT fk_stock_history_lot FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: product_uom_conversions fk_uom_conversions_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_uom_conversions
    ADD CONSTRAINT fk_uom_conversions_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


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
-- Name: order_groups order_groups_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_groups
    ADD CONSTRAINT order_groups_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: order_groups order_groups_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_groups
    ADD CONSTRAINT order_groups_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: order_lines order_lines_order_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_order_group_id_fkey FOREIGN KEY (order_group_id) REFERENCES public.order_groups(id) ON DELETE SET NULL;


--
-- Name: orders orders_locked_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_locked_by_user_id_fkey FOREIGN KEY (locked_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: product_mappings product_mappings_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_mappings
    ADD CONSTRAINT product_mappings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: product_mappings product_mappings_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_mappings
    ADD CONSTRAINT product_mappings_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: product_mappings product_mappings_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_mappings
    ADD CONSTRAINT product_mappings_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: system_client_logs system_client_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_client_logs
    ADD CONSTRAINT system_client_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_supplier_assignments user_supplier_assignments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_supplier_assignments
    ADD CONSTRAINT user_supplier_assignments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: user_supplier_assignments user_supplier_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_supplier_assignments
    ADD CONSTRAINT user_supplier_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: withdrawals withdrawals_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: withdrawals withdrawals_delivery_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_delivery_place_id_fkey FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE RESTRICT;


--
-- Name: withdrawals withdrawals_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE RESTRICT;


--
-- Name: withdrawals withdrawals_withdrawn_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_withdrawn_by_fkey FOREIGN KEY (withdrawn_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict 1dAhq8oFRSz3E0J38brLnyzGW09zmj3VCemCG6N4z783Fqhg6zQ2iSb6kaOaQht

