-- Table schemas related to v_lot_receipt_stock
-- Dumped from db-postgres:5432/lot_management

-- Table: lots
-- Table lots does not exist

-- Table: supplier_items
-- Record count: 48
CREATE TABLE supplier_items (
    id bigint(64,0) NOT NULL DEFAULT nextval('product_suppliers_id_seq'::regclass),
    supplier_id bigint(64,0) NOT NULL,
    lead_time_days integer(32,0),
    valid_to date NOT NULL DEFAULT '9999-12-31'::date,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    maker_part_no character varying(100) NOT NULL,
    display_name character varying(200) NOT NULL,
    notes text,
    base_unit character varying(20) NOT NULL,
    net_weight numeric(10,3),
    weight_unit character varying(20),
    internal_unit character varying(20),
    external_unit character varying(20),
    qty_per_internal_unit numeric(10,4),
    consumption_limit_days integer(32,0),
    requires_lot_number boolean NOT NULL DEFAULT true
);

-- Table: suppliers
-- Record count: 4
CREATE TABLE suppliers (
    id bigint(64,0) NOT NULL DEFAULT nextval('suppliers_id_seq'::regclass),
    supplier_code character varying(50) NOT NULL,
    supplier_name character varying(200) NOT NULL,
    valid_to date NOT NULL DEFAULT '9999-12-31'::date,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    short_name character varying(50)
);

-- Table: warehouses
-- Record count: 5
CREATE TABLE warehouses (
    id bigint(64,0) NOT NULL DEFAULT nextval('warehouses_id_seq'::regclass),
    warehouse_code character varying(50) NOT NULL,
    warehouse_name character varying(200) NOT NULL,
    warehouse_type character varying(20) NOT NULL,
    valid_to date NOT NULL DEFAULT '9999-12-31'::date,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    default_transport_lead_time_days integer(32,0),
    short_name character varying(50)
);

-- Table: lot_receipts
-- Record count: 63
CREATE TABLE lot_receipts (
    id bigint(64,0) NOT NULL DEFAULT nextval('lot_receipts_id_seq'::regclass),
    product_group_id bigint(64,0) NOT NULL,
    warehouse_id bigint(64,0) NOT NULL,
    supplier_id bigint(64,0),
    expected_lot_id bigint(64,0),
    received_date date NOT NULL,
    expiry_date date,
    received_quantity numeric(15,3) NOT NULL DEFAULT 0,
    unit character varying(20) NOT NULL,
    status character varying(20) NOT NULL DEFAULT 'active'::character varying,
    lock_reason text,
    locked_quantity numeric(15,3) NOT NULL DEFAULT 0,
    inspection_status character varying(20) NOT NULL DEFAULT 'not_required'::character varying,
    inspection_date date,
    inspection_cert_number character varying(100),
    version integer(32,0) NOT NULL DEFAULT 1,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    origin_type character varying(20) NOT NULL DEFAULT 'adhoc'::character varying,
    origin_reference character varying(255),
    temporary_lot_key uuid,
    lot_master_id bigint(64,0) NOT NULL,
    receipt_key uuid NOT NULL DEFAULT gen_random_uuid(),
    consumed_quantity numeric(15,3) NOT NULL,
    shipping_date date,
    cost_price numeric(10,2),
    sales_price numeric(10,2),
    tax_rate numeric(5,2),
    supplier_item_id bigint(64,0)
);

-- Table: stock_history
-- Record count: 55
CREATE TABLE stock_history (
    id bigint(64,0) NOT NULL DEFAULT nextval('stock_history_id_seq'::regclass),
    lot_id bigint(64,0) NOT NULL,
    transaction_type character varying(20) NOT NULL,
    quantity_change numeric(15,3) NOT NULL,
    quantity_after numeric(15,3) NOT NULL,
    reference_type character varying(50),
    reference_id bigint(64,0),
    transaction_date timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: product_groups
-- Table product_groups does not exist

