-- lot_management_schema_v2.sql
-- ロット管理システム v2.0 データベーススキーマ(PostgreSQL)
-- このファイルは参考用です。実際のテーブルはSQLAlchemyモデルから自動生成されます。

-- PostgreSQL用の設定

-- ===== マスタテーブル =====

-- 倉庫マスタ
CREATE TABLE warehouses (
    warehouse_code TEXT PRIMARY KEY,
    warehouse_name TEXT NOT NULL,
    address TEXT,
    is_active INTEGER DEFAULT 1
);

-- 仕入先マスタ
CREATE TABLE suppliers (
    supplier_code TEXT PRIMARY KEY,
    supplier_name TEXT NOT NULL,
    address TEXT
);

-- 得意先マスタ
CREATE TABLE customers (
    customer_code TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    address TEXT
);

-- 製品マスタ
CREATE TABLE products (
    product_code TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    customer_part_no TEXT,
    maker_part_no TEXT,
    internal_unit TEXT NOT NULL DEFAULT 'EA',
    packaging TEXT,
    assemble_div TEXT,
    next_div TEXT,
    shelf_life_days INTEGER,
    requires_lot_number INTEGER DEFAULT 1
);

-- 製品単位換算テーブル(新規)
CREATE TABLE product_uom_conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT NOT NULL,
    source_unit TEXT NOT NULL,
    source_value REAL NOT NULL DEFAULT 1.0,
    internal_unit_value REAL NOT NULL,
    FOREIGN KEY (product_code) REFERENCES products(product_code),
    UNIQUE(product_code, source_unit)
);

-- ===== 在庫関連テーブル =====

-- ロットマスタ
CREATE TABLE lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_code TEXT NOT NULL,
    product_code TEXT NOT NULL,
    lot_number TEXT NOT NULL,
    receipt_date DATE NOT NULL,
    mfg_date DATE,
    expiry_date DATE,
    warehouse_code TEXT,
    kanban_class TEXT,
    sales_unit TEXT,
    inventory_unit TEXT,
    received_by TEXT,
    source_doc TEXT,
    qc_certificate_status TEXT,
    qc_certificate_file TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_code) REFERENCES suppliers(supplier_code),
    FOREIGN KEY (product_code) REFERENCES products(product_code),
    FOREIGN KEY (warehouse_code) REFERENCES warehouses(warehouse_code),
    UNIQUE(supplier_code, product_code, lot_number)
);

-- 在庫変動履歴(イベントソーシング)
CREATE TABLE stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_id INTEGER NOT NULL,
    movement_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    related_id TEXT,
    occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lot_id) REFERENCES lots(id) ON DELETE CASCADE
);
CREATE INDEX ix_stock_movements_lot ON stock_movements(lot_id);

-- 現在在庫(パフォーマンス最適化用サマリテーブル)
CREATE TABLE lot_current_stock (
    lot_id INTEGER PRIMARY KEY,
    current_quantity REAL NOT NULL DEFAULT 0.0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lot_id) REFERENCES lots(id) ON DELETE CASCADE
);

-- 入荷伝票ヘッダ
CREATE TABLE receipt_headers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_no TEXT UNIQUE,
    supplier_code TEXT NOT NULL,
    warehouse_code TEXT NOT NULL,
    receipt_date DATE NOT NULL,
    created_by TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_code) REFERENCES suppliers(supplier_code),
    FOREIGN KEY (warehouse_code) REFERENCES warehouses(warehouse_code)
);

-- 入荷伝票明細
CREATE TABLE receipt_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    header_id INTEGER NOT NULL,
    line_no INTEGER NOT NULL,
    product_code TEXT NOT NULL,
    lot_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (header_id) REFERENCES receipt_headers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_code) REFERENCES products(product_code),
    FOREIGN KEY (lot_id) REFERENCES lots(id),
    UNIQUE(header_id, line_no)
);

-- 有効期限計算ルール
CREATE TABLE expiry_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT,
    supplier_code TEXT,
    rule_type TEXT NOT NULL,
    days INTEGER,
    fixed_date DATE,
    is_active INTEGER DEFAULT 1,
    priority INTEGER NOT NULL,
    FOREIGN KEY (product_code) REFERENCES products(product_code),
    FOREIGN KEY (supplier_code) REFERENCES suppliers(supplier_code)
);

-- ===== 販売関連テーブル =====

-- 受注ヘッダ
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    customer_code TEXT NOT NULL,
    order_date DATE,
    status TEXT DEFAULT 'open',
    sap_order_id TEXT,
    sap_status TEXT,
    sap_sent_at DATETIME,
    sap_error_msg TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_code) REFERENCES customers(customer_code)
);

-- 受注明細
CREATE TABLE order_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    line_no INTEGER NOT NULL,
    product_code TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT,
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_code) REFERENCES products(product_code),
    UNIQUE(order_id, line_no)
);

-- 引当(受注明細とロットの紐付け)
CREATE TABLE allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_line_id INTEGER NOT NULL,
    lot_id INTEGER NOT NULL,
    allocated_qty REAL NOT NULL,
    allocated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_line_id) REFERENCES order_lines(id) ON DELETE CASCADE,
    FOREIGN KEY (lot_id) REFERENCES lots(id) ON DELETE CASCADE
);
CREATE INDEX ix_alloc_ol ON allocations(order_line_id);
CREATE INDEX ix_alloc_lot ON allocations(lot_id);

-- 出荷記録
CREATE TABLE shipping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_id INTEGER NOT NULL,
    order_line_id INTEGER,
    shipped_quantity REAL NOT NULL,
    shipping_date DATE NOT NULL,
    destination_code TEXT,
    destination_name TEXT,
    destination_address TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    delivery_time_slot TEXT,
    tracking_number TEXT,
    carrier TEXT,
    carrier_service TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lot_id) REFERENCES lots(id),
    FOREIGN KEY (order_line_id) REFERENCES order_lines(id)
);

-- 仮発注(在庫不足時)
CREATE TABLE purchase_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT NOT NULL,
    supplier_code TEXT NOT NULL,
    requested_qty REAL NOT NULL,
    unit TEXT,
    reason_code TEXT NOT NULL,
    src_order_line_id INTEGER,
    requested_date DATE DEFAULT (DATE('now')),
    desired_receipt_date DATE,
    status TEXT DEFAULT 'draft',
    sap_po_id TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_code) REFERENCES products(product_code),
    FOREIGN KEY (supplier_code) REFERENCES suppliers(supplier_code),
    FOREIGN KEY (src_order_line_id) REFERENCES order_lines(id)
);

-- ===== ログテーブル =====

-- OCR取込ログ
CREATE TABLE ocr_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT UNIQUE,
    source_file TEXT,
    source TEXT,
    operator TEXT,
    schema_version TEXT,
    target_type TEXT DEFAULT 'order',
    submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT,
    total_records INTEGER,
    processed_records INTEGER,
    failed_records INTEGER,
    skipped_records INTEGER,
    error_details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SAP連携ログ
CREATE TABLE sap_sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    payload TEXT,
    result TEXT,
    status TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- ===== ビュー =====
-- ※ SQLAlchemyでは動的にクエリするため、ビューは作成しません
