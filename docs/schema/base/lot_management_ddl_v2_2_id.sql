-- ============================================================
-- ロット管理システム DDL (v2.2)
-- Database: PostgreSQL 14+
-- Created: 2025-11-15
-- Author: 和也 + AI
-- ============================================================

-- データベース作成(必要に応じて)
-- CREATE DATABASE lot_management;

-- スキーマ作成(必要に応じて)
-- CREATE SCHEMA IF NOT EXISTS public;

-- ============================================================
-- 1. マスタ系テーブル
-- ============================================================

-- 1.1 得意先マスタ
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    customer_code VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE customers IS '得意先マスタ';
COMMENT ON COLUMN customers.id IS '得意先ID(主キー)';
COMMENT ON COLUMN customers.customer_code IS '得意先コード(一意)';
COMMENT ON COLUMN customers.customer_name IS '得意先名';

-- インデックス
CREATE INDEX idx_customers_code ON customers(customer_code);

-- 1.2 納入先マスタ
CREATE TABLE delivery_places (
    id BIGSERIAL PRIMARY KEY,
    jiku_code VARCHAR(50),
    delivery_place_code VARCHAR(50) NOT NULL UNIQUE,
    delivery_place_name VARCHAR(200) NOT NULL,
    customer_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_delivery_places_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(id) ON DELETE RESTRICT
);

COMMENT ON TABLE delivery_places IS '納入先マスタ';
COMMENT ON COLUMN delivery_places.id IS '納入先ID(主キー)';
COMMENT ON COLUMN delivery_places.jiku_code IS '次区コード(SAP連携用)';
COMMENT ON COLUMN delivery_places.delivery_place_code IS '納入先コード(表示用)';
COMMENT ON COLUMN delivery_places.delivery_place_name IS '納入先名';
COMMENT ON COLUMN delivery_places.customer_id IS '得意先ID(外部キー)';

-- インデックス
CREATE INDEX idx_delivery_places_customer ON delivery_places(customer_id);
CREATE INDEX idx_delivery_places_code ON delivery_places(delivery_place_code);

-- 1.3 倉庫マスタ
CREATE TABLE warehouses (
    id BIGSERIAL PRIMARY KEY,
    warehouse_code VARCHAR(50) NOT NULL UNIQUE,
    warehouse_name VARCHAR(200) NOT NULL,
    warehouse_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_warehouse_type CHECK (warehouse_type IN ('internal', 'external', 'supplier'))
);

COMMENT ON TABLE warehouses IS '倉庫マスタ';
COMMENT ON COLUMN warehouses.id IS '倉庫ID(主キー)';
COMMENT ON COLUMN warehouses.warehouse_code IS '倉庫コード(一意)';
COMMENT ON COLUMN warehouses.warehouse_name IS '倉庫名';
COMMENT ON COLUMN warehouses.warehouse_type IS '倉庫種別(internal/external/supplier)';

-- インデックス
CREATE INDEX idx_warehouses_code ON warehouses(warehouse_code);
CREATE INDEX idx_warehouses_type ON warehouses(warehouse_type);

-- 1.4 製品マスタ
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    maker_part_code VARCHAR(100) NOT NULL UNIQUE,
    product_name VARCHAR(200) NOT NULL,
    base_unit VARCHAR(20) NOT NULL,
    consumption_limit_days INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE products IS '製品マスタ';
COMMENT ON COLUMN products.id IS '製品ID(主キー)';
COMMENT ON COLUMN products.maker_part_code IS 'メーカー品番(一意)';
COMMENT ON COLUMN products.product_name IS '製品名';
COMMENT ON COLUMN products.base_unit IS '社内在庫単位(個/箱/kg等)';
COMMENT ON COLUMN products.consumption_limit_days IS '消費期限日数';

-- インデックス
CREATE INDEX idx_products_code ON products(maker_part_code);
CREATE INDEX idx_products_name ON products(product_name);

-- 1.5 仕入先マスタ
CREATE TABLE suppliers (
    id BIGSERIAL PRIMARY KEY,
    supplier_code VARCHAR(50) NOT NULL UNIQUE,
    supplier_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE suppliers IS '仕入先マスタ';
COMMENT ON COLUMN suppliers.id IS '仕入先ID(主キー)';
COMMENT ON COLUMN suppliers.supplier_code IS '仕入先コード(一意)';
COMMENT ON COLUMN suppliers.supplier_name IS '仕入先名';

-- インデックス
CREATE INDEX idx_suppliers_code ON suppliers(supplier_code);

-- ============================================================
-- 2. 品番マッピング系テーブル
-- ============================================================

-- 2.1 得意先品番マッピング
CREATE TABLE customer_items (
    customer_id BIGINT NOT NULL,
    external_product_code VARCHAR(100) NOT NULL,
    product_id BIGINT NOT NULL,
    supplier_id BIGINT,
    base_unit VARCHAR(20) NOT NULL,
    pack_unit VARCHAR(20),
    pack_quantity INT,
    special_instructions TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id, external_product_code),
    CONSTRAINT fk_customer_items_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT fk_customer_items_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_customer_items_supplier FOREIGN KEY (supplier_id) 
        REFERENCES suppliers(id) ON DELETE SET NULL
);

COMMENT ON TABLE customer_items IS '得意先品番マッピング';
COMMENT ON COLUMN customer_items.customer_id IS '得意先ID(主キー, 外部キー)';
COMMENT ON COLUMN customer_items.external_product_code IS '先方品番(主キー)';
COMMENT ON COLUMN customer_items.product_id IS 'メーカー品番ID(外部キー)';
COMMENT ON COLUMN customer_items.supplier_id IS '仕入先ID(外部キー)';
COMMENT ON COLUMN customer_items.base_unit IS '社内在庫単位';
COMMENT ON COLUMN customer_items.pack_unit IS '荷姿単位';
COMMENT ON COLUMN customer_items.pack_quantity IS '荷姿数量';
COMMENT ON COLUMN customer_items.special_instructions IS '特記事項';

-- インデックス
CREATE INDEX idx_customer_items_product ON customer_items(product_id);
CREATE INDEX idx_customer_items_supplier ON customer_items(supplier_id);

-- ============================================================
-- 3. 入荷・在庫系テーブル
-- ============================================================

-- 3.1 入荷予定ヘッダ
CREATE TABLE inbound_plans (
    id BIGSERIAL PRIMARY KEY,
    plan_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id BIGINT NOT NULL,
    planned_arrival_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'planned',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inbound_plans_supplier FOREIGN KEY (supplier_id) 
        REFERENCES suppliers(id) ON DELETE RESTRICT,
    CONSTRAINT chk_inbound_plans_status CHECK (status IN ('planned', 'partially_received', 'received', 'cancelled'))
);

COMMENT ON TABLE inbound_plans IS '入荷予定ヘッダ';
COMMENT ON COLUMN inbound_plans.id IS '入荷予定ID(主キー)';
COMMENT ON COLUMN inbound_plans.plan_number IS '入荷予定番号(一意)';
COMMENT ON COLUMN inbound_plans.supplier_id IS '仕入先ID(外部キー)';
COMMENT ON COLUMN inbound_plans.planned_arrival_date IS '入荷予定日';
COMMENT ON COLUMN inbound_plans.status IS 'ステータス(planned/partially_received/received/cancelled)';
COMMENT ON COLUMN inbound_plans.notes IS '備考';

-- インデックス
CREATE INDEX idx_inbound_plans_supplier ON inbound_plans(supplier_id);
CREATE INDEX idx_inbound_plans_date ON inbound_plans(planned_arrival_date);
CREATE INDEX idx_inbound_plans_status ON inbound_plans(status);

-- 3.2 入荷予定明細
CREATE TABLE inbound_plan_lines (
    id BIGSERIAL PRIMARY KEY,
    inbound_plan_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    planned_quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inbound_plan_lines_plan FOREIGN KEY (inbound_plan_id) 
        REFERENCES inbound_plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_inbound_plan_lines_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE RESTRICT
);

COMMENT ON TABLE inbound_plan_lines IS '入荷予定明細';
COMMENT ON COLUMN inbound_plan_lines.id IS '入荷予定明細ID(主キー)';
COMMENT ON COLUMN inbound_plan_lines.inbound_plan_id IS '入荷予定ID(外部キー)';
COMMENT ON COLUMN inbound_plan_lines.product_id IS '製品ID(外部キー)';
COMMENT ON COLUMN inbound_plan_lines.planned_quantity IS '予定数量';
COMMENT ON COLUMN inbound_plan_lines.unit IS '単位';

-- インデックス
CREATE INDEX idx_inbound_plan_lines_plan ON inbound_plan_lines(inbound_plan_id);
CREATE INDEX idx_inbound_plan_lines_product ON inbound_plan_lines(product_id);

-- 3.3 期待ロット
CREATE TABLE expected_lots (
    id BIGSERIAL PRIMARY KEY,
    inbound_plan_line_id BIGINT NOT NULL,
    expected_lot_number VARCHAR(100),
    expected_quantity DECIMAL(15,3) NOT NULL,
    expected_expiry_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expected_lots_line FOREIGN KEY (inbound_plan_line_id) 
        REFERENCES inbound_plan_lines(id) ON DELETE CASCADE
);

COMMENT ON TABLE expected_lots IS '期待ロット(入荷予定時点でロット番号が判明している場合)';
COMMENT ON COLUMN expected_lots.id IS '期待ロットID(主キー)';
COMMENT ON COLUMN expected_lots.inbound_plan_line_id IS '入荷予定明細ID(外部キー)';
COMMENT ON COLUMN expected_lots.expected_lot_number IS '期待ロット番号';
COMMENT ON COLUMN expected_lots.expected_quantity IS '期待数量';
COMMENT ON COLUMN expected_lots.expected_expiry_date IS '期待消費期限';

-- インデックス
CREATE INDEX idx_expected_lots_line ON expected_lots(inbound_plan_line_id);
CREATE INDEX idx_expected_lots_number ON expected_lots(expected_lot_number);

-- 3.4 ロット在庫(コアテーブル)
CREATE TABLE lots (
    id BIGSERIAL PRIMARY KEY,
    lot_number VARCHAR(100) NOT NULL,
    product_id BIGINT NOT NULL,
    warehouse_id BIGINT NOT NULL,
    supplier_id BIGINT,
    expected_lot_id BIGINT,
    received_date DATE NOT NULL,
    expiry_date DATE,
    current_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    allocated_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lots_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_lots_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_lots_supplier FOREIGN KEY (supplier_id) 
        REFERENCES suppliers(id) ON DELETE SET NULL,
    CONSTRAINT fk_lots_expected FOREIGN KEY (expected_lot_id) 
        REFERENCES expected_lots(id) ON DELETE SET NULL,
    CONSTRAINT uq_lots_number_product_warehouse UNIQUE (lot_number, product_id, warehouse_id),
    CONSTRAINT chk_lots_status CHECK (status IN ('active', 'depleted', 'expired', 'quarantine')),
    CONSTRAINT chk_lots_current_quantity CHECK (current_quantity >= 0),
    CONSTRAINT chk_lots_allocated_quantity CHECK (allocated_quantity >= 0),
    CONSTRAINT chk_lots_allocation_limit CHECK (allocated_quantity <= current_quantity)
);

COMMENT ON TABLE lots IS 'ロット在庫(実在庫)';
COMMENT ON COLUMN lots.id IS 'ロットID(主キー)';
COMMENT ON COLUMN lots.lot_number IS 'ロット番号';
COMMENT ON COLUMN lots.product_id IS '製品ID(外部キー)';
COMMENT ON COLUMN lots.warehouse_id IS '倉庫ID(外部キー)';
COMMENT ON COLUMN lots.supplier_id IS '仕入先ID(外部キー)';
COMMENT ON COLUMN lots.expected_lot_id IS '期待ロットID(外部キー)';
COMMENT ON COLUMN lots.received_date IS '入荷日';
COMMENT ON COLUMN lots.expiry_date IS '消費期限';
COMMENT ON COLUMN lots.current_quantity IS '現在庫数';
COMMENT ON COLUMN lots.allocated_quantity IS '引当済数量';
COMMENT ON COLUMN lots.unit IS '単位';
COMMENT ON COLUMN lots.status IS 'ステータス(active/depleted/expired/quarantine)';

-- インデックス
CREATE INDEX idx_lots_product_warehouse ON lots(product_id, warehouse_id);
CREATE INDEX idx_lots_warehouse ON lots(warehouse_id);
CREATE INDEX idx_lots_supplier ON lots(supplier_id);
CREATE INDEX idx_lots_expiry_date ON lots(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_lots_status ON lots(status);
CREATE INDEX idx_lots_number ON lots(lot_number);

-- ============================================================
-- 4. フォーキャスト系テーブル
-- ============================================================

-- 4.1 フォーキャストヘッダ
CREATE TABLE forecast_headers (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    delivery_place_id BIGINT NOT NULL,
    forecast_number VARCHAR(50) NOT NULL UNIQUE,
    forecast_start_date DATE NOT NULL,
    forecast_end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_forecast_headers_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_forecast_headers_delivery_place FOREIGN KEY (delivery_place_id) 
        REFERENCES delivery_places(id) ON DELETE RESTRICT,
    CONSTRAINT chk_forecast_headers_status CHECK (status IN ('active', 'completed', 'cancelled'))
);

COMMENT ON TABLE forecast_headers IS 'フォーキャストヘッダ';
COMMENT ON COLUMN forecast_headers.id IS 'フォーキャストID(主キー)';
COMMENT ON COLUMN forecast_headers.customer_id IS '得意先ID(外部キー)';
COMMENT ON COLUMN forecast_headers.delivery_place_id IS '納入先ID(外部キー)';
COMMENT ON COLUMN forecast_headers.forecast_number IS 'フォーキャスト番号(一意)';
COMMENT ON COLUMN forecast_headers.forecast_start_date IS 'フォーキャスト開始日';
COMMENT ON COLUMN forecast_headers.forecast_end_date IS 'フォーキャスト終了日';
COMMENT ON COLUMN forecast_headers.status IS 'ステータス(active/completed/cancelled)';

-- インデックス
CREATE INDEX idx_forecast_headers_customer ON forecast_headers(customer_id);
CREATE INDEX idx_forecast_headers_delivery_place ON forecast_headers(delivery_place_id);
CREATE INDEX idx_forecast_headers_dates ON forecast_headers(forecast_start_date, forecast_end_date);

-- 4.2 フォーキャスト明細
CREATE TABLE forecast_lines (
    id BIGSERIAL PRIMARY KEY,
    forecast_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    delivery_date DATE NOT NULL,
    forecast_quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_forecast_lines_header FOREIGN KEY (forecast_id) 
        REFERENCES forecast_headers(id) ON DELETE CASCADE,
    CONSTRAINT fk_forecast_lines_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE RESTRICT
);

COMMENT ON TABLE forecast_lines IS 'フォーキャスト明細(日次予測データ)';
COMMENT ON COLUMN forecast_lines.id IS 'フォーキャスト明細ID(主キー)';
COMMENT ON COLUMN forecast_lines.forecast_id IS 'フォーキャストID(外部キー)';
COMMENT ON COLUMN forecast_lines.product_id IS '製品ID(外部キー)';
COMMENT ON COLUMN forecast_lines.delivery_date IS '納入日';
COMMENT ON COLUMN forecast_lines.forecast_quantity IS 'フォーキャスト数量';
COMMENT ON COLUMN forecast_lines.unit IS '単位';

-- インデックス
CREATE INDEX idx_forecast_lines_header ON forecast_lines(forecast_id);
CREATE INDEX idx_forecast_lines_product ON forecast_lines(product_id);
CREATE INDEX idx_forecast_lines_date ON forecast_lines(delivery_date);

-- ============================================================
-- 5. 受注・引当系テーブル
-- ============================================================

-- 5.1 受注ヘッダ
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL,
    delivery_place_id BIGINT NOT NULL,
    order_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_orders_delivery_place FOREIGN KEY (delivery_place_id) 
        REFERENCES delivery_places(id) ON DELETE RESTRICT,
    CONSTRAINT chk_orders_status CHECK (status IN ('pending', 'allocated', 'shipped', 'completed', 'cancelled'))
);

COMMENT ON TABLE orders IS '受注ヘッダ';
COMMENT ON COLUMN orders.id IS '受注ID(主キー)';
COMMENT ON COLUMN orders.order_number IS '受注番号(一意)';
COMMENT ON COLUMN orders.customer_id IS '得意先ID(外部キー)';
COMMENT ON COLUMN orders.delivery_place_id IS '納入先ID(外部キー)';
COMMENT ON COLUMN orders.order_date IS '受注日';
COMMENT ON COLUMN orders.status IS 'ステータス(pending/allocated/shipped/completed/cancelled)';

-- インデックス
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_delivery_place ON orders(delivery_place_id);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_status ON orders(status);

-- 5.2 受注明細
CREATE TABLE order_lines (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    delivery_date DATE NOT NULL,
    order_quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_lines_order FOREIGN KEY (order_id) 
        REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_lines_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE RESTRICT
);

COMMENT ON TABLE order_lines IS '受注明細';
COMMENT ON COLUMN order_lines.id IS '受注明細ID(主キー)';
COMMENT ON COLUMN order_lines.order_id IS '受注ID(外部キー)';
COMMENT ON COLUMN order_lines.product_id IS '製品ID(外部キー)';
COMMENT ON COLUMN order_lines.delivery_date IS '納入日';
COMMENT ON COLUMN order_lines.order_quantity IS '受注数量';
COMMENT ON COLUMN order_lines.unit IS '単位';

-- インデックス
CREATE INDEX idx_order_lines_order ON order_lines(order_id);
CREATE INDEX idx_order_lines_product ON order_lines(product_id);
CREATE INDEX idx_order_lines_date ON order_lines(delivery_date);

-- 5.3 引当推奨
CREATE TABLE allocation_suggestions (
    id BIGSERIAL PRIMARY KEY,
    forecast_line_id BIGINT NOT NULL,
    lot_id BIGINT NOT NULL,
    suggested_quantity DECIMAL(15,3) NOT NULL,
    allocation_logic VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_allocation_suggestions_forecast FOREIGN KEY (forecast_line_id) 
        REFERENCES forecast_lines(id) ON DELETE CASCADE,
    CONSTRAINT fk_allocation_suggestions_lot FOREIGN KEY (lot_id) 
        REFERENCES lots(id) ON DELETE CASCADE
);

COMMENT ON TABLE allocation_suggestions IS '引当推奨(システムが提案する引当案)';
COMMENT ON COLUMN allocation_suggestions.id IS '推奨ID(主キー)';
COMMENT ON COLUMN allocation_suggestions.forecast_line_id IS 'フォーキャスト明細ID(外部キー)';
COMMENT ON COLUMN allocation_suggestions.lot_id IS 'ロットID(外部キー)';
COMMENT ON COLUMN allocation_suggestions.suggested_quantity IS '推奨数量';
COMMENT ON COLUMN allocation_suggestions.allocation_logic IS '引当ロジック(FEFO/FIFO/MANUAL等)';

-- インデックス
CREATE INDEX idx_allocation_suggestions_forecast ON allocation_suggestions(forecast_line_id);
CREATE INDEX idx_allocation_suggestions_lot ON allocation_suggestions(lot_id);

-- 5.4 引当実績
CREATE TABLE allocations (
    id BIGSERIAL PRIMARY KEY,
    order_line_id BIGINT NOT NULL,
    lot_id BIGINT NOT NULL,
    allocated_quantity DECIMAL(15,3) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'allocated',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_allocations_order_line FOREIGN KEY (order_line_id) 
        REFERENCES order_lines(id) ON DELETE CASCADE,
    CONSTRAINT fk_allocations_lot FOREIGN KEY (lot_id) 
        REFERENCES lots(id) ON DELETE RESTRICT,
    CONSTRAINT chk_allocations_status CHECK (status IN ('allocated', 'shipped', 'cancelled'))
);

COMMENT ON TABLE allocations IS '引当実績(確定した引当)';
COMMENT ON COLUMN allocations.id IS '引当ID(主キー)';
COMMENT ON COLUMN allocations.order_line_id IS '受注明細ID(外部キー)';
COMMENT ON COLUMN allocations.lot_id IS 'ロットID(外部キー)';
COMMENT ON COLUMN allocations.allocated_quantity IS '引当数量';
COMMENT ON COLUMN allocations.status IS 'ステータス(allocated/shipped/cancelled)';

-- インデックス
CREATE INDEX idx_allocations_order_line ON allocations(order_line_id);
CREATE INDEX idx_allocations_lot ON allocations(lot_id);
CREATE INDEX idx_allocations_status ON allocations(status);

-- ============================================================
-- 6. 在庫抽象化・履歴系テーブル
-- ============================================================

-- 6.1 在庫サマリ (REMOVED - リアルタイム集計に変更)
-- DEPRECATED: inventory_items テーブルは廃止されました
-- 在庫サマリは lots テーブルから GROUP BY 集計で取得します
-- API エンドポイント: GET /api/inventory-items は維持されますが、
-- バックエンドでは lots テーブルから集計して返却します。
--
-- 理由:
-- - 単一の真実の源(lots テーブル)を維持
-- - トリガー・同期の複雑さを排除
-- - 常に最新のデータを保証
--
-- 集計クエリ例:
-- SELECT
--   product_id,
--   warehouse_id,
--   SUM(current_quantity) AS total_quantity,
--   SUM(allocated_quantity) AS allocated_quantity,
--   SUM(GREATEST(current_quantity - allocated_quantity, 0)) AS available_quantity,
--   MAX(updated_at) AS last_updated
-- FROM lots
-- WHERE status = 'active'
-- GROUP BY product_id, warehouse_id;
--
-- 既存のテーブルを削除する場合:
-- DROP TABLE IF EXISTS inventory_items CASCADE;

-- 6.2 在庫履歴
CREATE TABLE stock_history (
    id BIGSERIAL PRIMARY KEY,
    lot_id BIGINT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    quantity_change DECIMAL(15,3) NOT NULL,
    quantity_after DECIMAL(15,3) NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT,
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_history_lot FOREIGN KEY (lot_id) 
        REFERENCES lots(id) ON DELETE CASCADE,
    CONSTRAINT chk_stock_history_type CHECK (transaction_type IN ('inbound', 'allocation', 'shipment', 'adjustment', 'return'))
);

COMMENT ON TABLE stock_history IS '在庫履歴(すべての在庫変動を記録)';
COMMENT ON COLUMN stock_history.id IS '履歴ID(主キー)';
COMMENT ON COLUMN stock_history.lot_id IS 'ロットID(外部キー)';
COMMENT ON COLUMN stock_history.transaction_type IS 'トランザクション種別(inbound/allocation/shipment/adjustment/return)';
COMMENT ON COLUMN stock_history.quantity_change IS '数量変動(+/-)';
COMMENT ON COLUMN stock_history.quantity_after IS '変動後数量';
COMMENT ON COLUMN stock_history.reference_type IS '参照元種別(inbound_plan/order/allocation等)';
COMMENT ON COLUMN stock_history.reference_id IS '参照元ID';
COMMENT ON COLUMN stock_history.transaction_date IS 'トランザクション日時';

-- インデックス
CREATE INDEX idx_stock_history_lot ON stock_history(lot_id);
CREATE INDEX idx_stock_history_date ON stock_history(transaction_date);
CREATE INDEX idx_stock_history_type ON stock_history(transaction_type);

-- 6.3 在庫調整
CREATE TABLE adjustments (
    id BIGSERIAL PRIMARY KEY,
    lot_id BIGINT NOT NULL,
    adjustment_type VARCHAR(20) NOT NULL,
    adjusted_quantity DECIMAL(15,3) NOT NULL,
    reason TEXT NOT NULL,
    adjusted_by BIGINT NOT NULL,
    adjusted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_adjustments_lot FOREIGN KEY (lot_id) 
        REFERENCES lots(id) ON DELETE RESTRICT,
    CONSTRAINT chk_adjustments_type CHECK (adjustment_type IN ('physical_count', 'damage', 'loss', 'found', 'other'))
);

COMMENT ON TABLE adjustments IS '在庫調整(棚卸差異等)';
COMMENT ON COLUMN adjustments.id IS '調整ID(主キー)';
COMMENT ON COLUMN adjustments.lot_id IS 'ロットID(外部キー)';
COMMENT ON COLUMN adjustments.adjustment_type IS '調整種別(physical_count/damage/loss/found/other)';
COMMENT ON COLUMN adjustments.adjusted_quantity IS '調整数量(+/-)';
COMMENT ON COLUMN adjustments.reason IS '調整理由';
COMMENT ON COLUMN adjustments.adjusted_by IS '調整者(ユーザーID)';
COMMENT ON COLUMN adjustments.adjusted_at IS '調整日時';

-- インデックス
CREATE INDEX idx_adjustments_lot ON adjustments(lot_id);
CREATE INDEX idx_adjustments_date ON adjustments(adjusted_at);

-- ============================================================
-- 7. ユーザー・認証系テーブル (v2.2追加)
-- ============================================================

-- 7.1 ユーザー
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE users IS 'ユーザーマスタ';
COMMENT ON COLUMN users.id IS 'ユーザーID(主キー)';
COMMENT ON COLUMN users.username IS 'ユーザー名(一意)';
COMMENT ON COLUMN users.email IS 'メールアドレス(一意)';
COMMENT ON COLUMN users.password_hash IS 'パスワードハッシュ';
COMMENT ON COLUMN users.display_name IS '表示名';
COMMENT ON COLUMN users.is_active IS '有効フラグ';
COMMENT ON COLUMN users.last_login_at IS '最終ログイン日時';

-- インデックス
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- 7.2 ロール
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    role_code VARCHAR(50) NOT NULL UNIQUE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE roles IS 'ロールマスタ';
COMMENT ON COLUMN roles.id IS 'ロールID(主キー)';
COMMENT ON COLUMN roles.role_code IS 'ロールコード(一意)';
COMMENT ON COLUMN roles.role_name IS 'ロール名';
COMMENT ON COLUMN roles.description IS '説明';

-- インデックス
CREATE INDEX idx_roles_code ON roles(role_code);

-- 7.3 ユーザーロール
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) 
        REFERENCES roles(id) ON DELETE CASCADE
);

COMMENT ON TABLE user_roles IS 'ユーザーロール関連';
COMMENT ON COLUMN user_roles.user_id IS 'ユーザーID(主キー, 外部キー)';
COMMENT ON COLUMN user_roles.role_id IS 'ロールID(主キー, 外部キー)';
COMMENT ON COLUMN user_roles.assigned_at IS '割当日時';

-- インデックス
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- adjustmentsテーブルに外部キー制約を追加
ALTER TABLE adjustments
    ADD CONSTRAINT fk_adjustments_user FOREIGN KEY (adjusted_by) 
        REFERENCES users(id) ON DELETE RESTRICT;

-- ============================================================
-- 8. 運用系テーブル (v2.2追加)
-- ============================================================

-- 8.1 バッチジョブ
CREATE TABLE batch_jobs (
    id BIGSERIAL PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    parameters JSONB,
    result_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_batch_jobs_status CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    CONSTRAINT chk_batch_jobs_type CHECK (
        job_type IN (
            'allocation_suggestion',   -- フォーキャストからの引当案生成
            'allocation_finalize',     -- 仮引当確定・再計算
            'inventory_sync',          -- 在庫サマリ同期
            'data_import',             -- CSV/Excel等の取込
            'report_generation'        -- 各種集計レポート
        )
    )
);

COMMENT ON TABLE batch_jobs IS 'バッチジョブ管理';
COMMENT ON COLUMN batch_jobs.id IS 'ジョブID(主キー)';
COMMENT ON COLUMN batch_jobs.job_name IS 'ジョブ名';
COMMENT ON COLUMN batch_jobs.job_type IS 'ジョブ種別';
COMMENT ON COLUMN batch_jobs.status IS 'ステータス(pending/running/completed/failed)';
COMMENT ON COLUMN batch_jobs.parameters IS 'ジョブパラメータ(JSON)';
COMMENT ON COLUMN batch_jobs.result_message IS '実行結果メッセージ';
COMMENT ON COLUMN batch_jobs.started_at IS '開始日時';
COMMENT ON COLUMN batch_jobs.completed_at IS '完了日時';

-- インデックス
CREATE INDEX idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX idx_batch_jobs_type ON batch_jobs(job_type);
CREATE INDEX idx_batch_jobs_created ON batch_jobs(created_at);

-- 8.2 操作ログ
CREATE TABLE operation_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    operation_type VARCHAR(50) NOT NULL,
    target_table VARCHAR(50) NOT NULL,
    target_id BIGINT,
    changes JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_operation_logs_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_operation_logs_type CHECK (operation_type IN ('create', 'update', 'delete', 'login', 'logout', 'export'))
);

COMMENT ON TABLE operation_logs IS '操作ログ(監査証跡)';
COMMENT ON COLUMN operation_logs.id IS 'ログID(主キー)';
COMMENT ON COLUMN operation_logs.user_id IS 'ユーザーID(外部キー)';
COMMENT ON COLUMN operation_logs.operation_type IS '操作種別(create/update/delete/login/logout/export)';
COMMENT ON COLUMN operation_logs.target_table IS '対象テーブル名';
COMMENT ON COLUMN operation_logs.target_id IS '対象レコードID';
COMMENT ON COLUMN operation_logs.changes IS '変更内容(JSON)';
COMMENT ON COLUMN operation_logs.ip_address IS 'IPアドレス';

-- インデックス
CREATE INDEX idx_operation_logs_user ON operation_logs(user_id);
CREATE INDEX idx_operation_logs_type ON operation_logs(operation_type);
CREATE INDEX idx_operation_logs_table ON operation_logs(target_table);
CREATE INDEX idx_operation_logs_created ON operation_logs(created_at);

-- 8.3 業務ルール
CREATE TABLE business_rules (
    id BIGSERIAL PRIMARY KEY,
    rule_code VARCHAR(50) NOT NULL UNIQUE,
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    rule_parameters JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_business_rules_type CHECK (rule_type IN ('allocation', 'expiry_warning', 'kanban', 'other'))
);

COMMENT ON TABLE business_rules IS '業務ルール設定';
COMMENT ON COLUMN business_rules.id IS 'ルールID(主キー)';
COMMENT ON COLUMN business_rules.rule_code IS 'ルールコード(一意)';
COMMENT ON COLUMN business_rules.rule_name IS 'ルール名';
COMMENT ON COLUMN business_rules.rule_type IS 'ルール種別(allocation/expiry_warning/kanban/other)';
COMMENT ON COLUMN business_rules.rule_parameters IS 'ルールパラメータ(JSON)';
COMMENT ON COLUMN business_rules.is_active IS '有効フラグ';

-- インデックス
CREATE INDEX idx_business_rules_code ON business_rules(rule_code);
CREATE INDEX idx_business_rules_type ON business_rules(rule_type);
CREATE INDEX idx_business_rules_active ON business_rules(is_active) WHERE is_active = TRUE;

-- 8.4 システム設定
CREATE TABLE system_configs (
    id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE system_configs IS 'システム設定';
COMMENT ON COLUMN system_configs.id IS '設定ID(主キー)';
COMMENT ON COLUMN system_configs.config_key IS '設定キー(一意)';
COMMENT ON COLUMN system_configs.config_value IS '設定値';
COMMENT ON COLUMN system_configs.description IS '説明';

-- インデックス
CREATE INDEX idx_system_configs_key ON system_configs(config_key);

-- 8.5 マスタ変更履歴
CREATE TABLE master_change_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id BIGINT NOT NULL,
    change_type VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by BIGINT NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_master_change_logs_user FOREIGN KEY (changed_by) 
        REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_master_change_logs_type CHECK (change_type IN ('insert', 'update', 'delete'))
);

COMMENT ON TABLE master_change_logs IS 'マスタ変更履歴';
COMMENT ON COLUMN master_change_logs.id IS '変更ログID(主キー)';
COMMENT ON COLUMN master_change_logs.table_name IS 'テーブル名';
COMMENT ON COLUMN master_change_logs.record_id IS 'レコードID';
COMMENT ON COLUMN master_change_logs.change_type IS '変更種別(insert/update/delete)';
COMMENT ON COLUMN master_change_logs.old_values IS '変更前の値(JSON)';
COMMENT ON COLUMN master_change_logs.new_values IS '変更後の値(JSON)';
COMMENT ON COLUMN master_change_logs.changed_by IS '変更者(ユーザーID)';
COMMENT ON COLUMN master_change_logs.changed_at IS '変更日時';

-- インデックス
CREATE INDEX idx_master_change_logs_table ON master_change_logs(table_name);
CREATE INDEX idx_master_change_logs_record ON master_change_logs(record_id);
CREATE INDEX idx_master_change_logs_user ON master_change_logs(changed_by);
CREATE INDEX idx_master_change_logs_changed ON master_change_logs(changed_at);

-- ============================================================
-- 9. 初期データ投入(オプション)
-- ============================================================

-- ロールの初期データ
INSERT INTO roles (role_code, role_name, description) VALUES
    ('admin', '管理者', 'システム全体の管理を行うユーザー'),
    ('planner', '計画担当者', 'ロット引当・フォーキャストを扱うユーザー'),
    ('warehouse', '倉庫担当者', '入出荷実績を記録するユーザー'),
    ('viewer', '閲覧専用', '参照専用ユーザー')
ON CONFLICT (role_code) DO NOTHING;

-- システム設定の初期データ
INSERT INTO system_configs (config_key, config_value, description) VALUES
    ('expiry_warning_days', '7', '消費期限警告日数'),
    ('default_allocation_logic', 'FEFO', 'デフォルト引当ロジック(FEFO/FIFO)'),
    ('inventory_sync_interval_minutes', '60', '在庫同期間隔(分)')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- 10. ビュー(参考)
-- ============================================================
-- 注: ビューは別途設計書で詳細化予定

-- 在庫一覧ビュー(例)
CREATE OR REPLACE VIEW v_inventory_summary AS
SELECT 
    p.id AS product_id,
    p.maker_part_code,
    p.product_name,
    w.id AS warehouse_id,
    w.warehouse_name,
    ii.total_quantity,
    ii.allocated_quantity,
    ii.available_quantity,
    ii.last_updated
FROM inventory_items ii
JOIN products p ON ii.product_id = p.id
JOIN warehouses w ON ii.warehouse_id = w.id
WHERE ii.total_quantity > 0
ORDER BY p.maker_part_code, w.warehouse_name;

COMMENT ON VIEW v_inventory_summary IS '在庫サマリビュー';

-- ============================================================
-- END OF DDL
-- ============================================================