# ER図 (Entity Relationship Diagram)

全エンティティ間のリレーションを示す総合ER図。

## 1. 総合ER図 (Comprehensive ER Diagram)

全50テーブルの関係性を可視化した総合図。

```mermaid
erDiagram
    %% ====================
    %% Core Masters
    %% ====================
    products ||--o{ product_uom_conversions : "has"
    customers ||--o{ delivery_places : "owns"
    products ||--o{ product_suppliers : "supplied_by"
    suppliers ||--o{ product_suppliers : "supplies"
    products ||--o{ product_warehouse : "stored_at"
    warehouses ||--o{ product_warehouse : "stores"

    %% ====================
    %% Product Mappings & Settings
    %% ====================
    customers ||--o{ customer_items : "defines"
    products ||--o{ customer_items : "referenced_by"
    suppliers ||--o{ customer_items : "default_supplier"
    customer_items ||--o{ customer_item_jiku_mappings : "has_jiku"
    customer_items ||--o{ customer_item_delivery_settings : "has_settings"
    delivery_places ||--o{ customer_item_jiku_mappings : "maps_to"
    delivery_places ||--o{ customer_item_delivery_settings : "maps_to"
    customers ||--o{ product_mappings : "buys"
    products ||--o{ product_mappings : "mapped"
    suppliers ||--o{ product_mappings : "supplies"

    %% ====================
    %% Order Management
    %% ====================
    customers ||--o{ orders : "places"
    orders ||--o{ order_lines : "contains"
    products ||--o{ order_lines : "ordered"
    delivery_places ||--o{ order_lines : "ships_to"
    order_groups ||--o{ order_lines : "groups"
    customers ||--o{ order_groups : "groups_by"
    products ||--o{ order_groups : "groups_by"

    %% ====================
    %% Inbound & Purchasing
    %% ====================
    suppliers ||--o{ inbound_plans : "supplies"
    inbound_plans ||--o{ inbound_plan_lines : "contains"
    products ||--o{ inbound_plan_lines : "item"
    inbound_plan_lines ||--o{ expected_lots : "details"

    %% ====================
    %% Inventory Management
    %% ====================
    products ||--o{ lot_master : "is_master_of"
    suppliers ||--o{ lot_master : "originates_from"
    lot_master ||--o{ lot_receipts : "aggregates"
    warehouses ||--o{ lot_receipts : "stores"
    products ||--o{ lot_receipts : "is_instance_of"
    suppliers ||--o{ lot_receipts : "originates_from"
    lot_receipts ||--o{ stock_history : "logs"
    lot_receipts ||--o{ adjustments : "adjusted_by"

    %% ====================
    %% Allocation & Reservation
    %% ====================
    lot_receipts ||--o{ lot_reservations : "reserved"
    order_lines ||..o{ lot_reservations : "source (if type=order)"
    forecast_current ||..o{ lot_reservations : "source (if type=forecast)"
    lot_reservations ||..o{ lot_reservation_history : "tracked"
    lot_receipts ||--o{ allocation_suggestions : "suggested_for"
    order_lines ||--o{ allocation_suggestions : "suggests_for"
    forecast_current ||--o{ allocation_suggestions : "suggests_for"
    order_lines ||--o{ allocation_traces : "traced_in"
    lot_receipts ||--o{ allocation_traces : "candidate_for"

    %% ====================
    %% Demand Forecasting
    %% ====================
    customers ||--o{ forecast_current : "forecasts"
    delivery_places ||--o{ forecast_current : "forecasts_for"
    products ||--o{ forecast_current : "forecasted"
    customers ||--o{ forecast_history : "forecasts_archived"
    delivery_places ||--o{ forecast_history : "forecasts_for_archived"
    products ||--o{ forecast_history : "forecasted_archived"

    %% ====================
    %% Withdrawal & Shipment
    %% ====================
    customers ||--o{ withdrawals : "ships_to"
    delivery_places ||--o{ withdrawals : "ships_to"
    users ||--o{ withdrawals : "withdraws"
    users ||--o{ withdrawals : "cancels"
    withdrawals ||--o{ withdrawal_lines : "contains"
    lot_receipts ||--o{ withdrawal_lines : "withdrawn_from"

    %% ====================
    %% System & Auth & RPA
    %% ====================
    users ||--o{ user_roles : "assigned"
    roles ||--o{ user_roles : "defined_in"
    users ||--o{ user_supplier_assignments : "manages"
    suppliers ||--o{ user_supplier_assignments : "managed_by"
    rpa_runs ||--o{ rpa_run_items : "contains"
    users ||--o{ rpa_runs : "starts"

    %% ====================
    %% Cloud Flow Integration
    %% ====================
    users ||--o{ cloud_flow_jobs : "requests"

    %% ====================
    %% Mappings & Master Change Tracking
    %% ====================
    users ||--o{ master_change_logs : "changes"
    warehouses ||--o{ warehouse_delivery_routes : "ships_from"
    delivery_places ||--o{ warehouse_delivery_routes : "ships_to"
    products ||--o{ warehouse_delivery_routes : "routed"

    %% ====================
    %% Error Tracking & Audit Logs
    %% ====================
    customers ||--o{ missing_mapping_events : "has_issues"
    products ||--o{ missing_mapping_events : "has_issues"
    suppliers ||--o{ missing_mapping_events : "has_issues"
    users ||--o{ missing_mapping_events : "creates"
    users ||--o{ missing_mapping_events : "resolves"
    users ||--o{ operation_logs : "performs"
    users ||--o{ system_client_logs : "generates"
```

## 2. ドメイン別ER図 (Domain-specific ER Diagrams)

### 2.1 コアマスタドメイン (Core Masters Domain)

```mermaid
erDiagram
    products ||--o{ product_uom_conversions : "has"
    customers ||--o{ delivery_places : "owns"
    products ||--o{ product_suppliers : "supplied_by"
    suppliers ||--o{ product_suppliers : "supplies"
    products ||--o{ product_warehouse : "stored_at"
    warehouses ||--o{ product_warehouse : "stores"

    products {
        bigint id PK
        string maker_part_code
        string product_name
        string base_unit
        int consumption_limit_days
        date valid_to
    }
    customers {
        bigint id PK
        string customer_code
        string customer_name
        date valid_to
    }
    suppliers {
        bigint id PK
        string supplier_code
        string supplier_name
        date valid_to
    }
    warehouses {
        bigint id PK
        string warehouse_code
        string warehouse_name
        string warehouse_type
        date valid_to
    }
    delivery_places {
        bigint id PK
        bigint customer_id FK
        string delivery_place_code
        string jiku_code
        date valid_to
    }
    product_uom_conversions {
        bigint conversion_id PK
        bigint product_id FK
        string external_unit
        decimal factor
        date valid_to
    }
    product_suppliers {
        bigint id PK
        bigint product_id FK
        bigint supplier_id FK
        bool is_primary
        int lead_time_days
        date valid_to
    }
    product_warehouse {
        bigint product_id PK,FK
        bigint warehouse_id PK,FK
        bool is_active
    }
```

### 2.2 受注管理ドメイン (Order Management Domain)

```mermaid
erDiagram
    customers ||--o{ orders : "places"
    orders ||--o{ order_lines : "contains"
    products ||--o{ order_lines : "ordered"
    delivery_places ||--o{ order_lines : "ships_to"
    order_groups ||--o{ order_lines : "groups"
    customers ||--o{ order_groups : "groups_by"
    products ||--o{ order_groups : "groups_by"

    order_groups {
        bigint id PK
        bigint customer_id FK
        bigint product_id FK
        date order_date
    }
    orders {
        bigint id PK
        bigint customer_id FK
        date order_date
        string status
        int locked_by_user_id
    }
    order_lines {
        bigint id PK
        bigint order_id FK
        bigint order_group_id FK
        bigint product_id FK
        bigint delivery_place_id FK
        date delivery_date
        decimal order_quantity
        string sap_order_no
        string customer_order_no
        string status
    }
```

### 2.3 在庫管理ドメイン (Inventory Management Domain)

```mermaid
erDiagram
    products ||--o{ lot_master : "is_master_of"
    suppliers ||--o{ lot_master : "originates_from"
    lot_master ||--o{ lot_receipts : "aggregates"
    warehouses ||--o{ lot_receipts : "stores"
    products ||--o{ lot_receipts : "is_instance_of"
    suppliers ||--o{ lot_receipts : "originates_from"
    lot_receipts ||--o{ stock_history : "logs"
    lot_receipts ||--o{ adjustments : "adjusted_by"

    lot_master {
        bigint id PK
        string lot_number
        bigint product_id FK
        bigint supplier_id FK
        decimal total_quantity
        date first_receipt_date
        date latest_expiry_date
    }
    lot_receipts {
        bigint id PK
        bigint lot_master_id FK
        bigint product_id FK
        bigint warehouse_id FK
        bigint supplier_id FK
        decimal received_quantity
        decimal consumed_quantity
        date received_date
        date expiry_date
        string status
        string temporary_lot_key
        string receipt_key
    }
    stock_history {
        bigint id PK
        bigint lot_id FK
        string transaction_type
        decimal quantity_change
        decimal quantity_after
        datetime transaction_date
    }
    adjustments {
        bigint id PK
        bigint lot_id FK
        string adjustment_type
        decimal adjusted_quantity
        text reason
    }
```

### 2.4 引当・予約ドメイン (Allocation & Reservation Domain)

```mermaid
erDiagram
    lot_receipts ||--o{ lot_reservations : "reserved"
    order_lines ||..o{ lot_reservations : "source (if type=order)"
    forecast_current ||..o{ lot_reservations : "source (if type=forecast)"
    lot_reservations ||..o{ lot_reservation_history : "tracked"
    lot_receipts ||--o{ allocation_suggestions : "suggested_for"
    order_lines ||--o{ allocation_suggestions : "suggests_for"
    forecast_current ||--o{ allocation_suggestions : "suggests_for"
    order_lines ||--o{ allocation_traces : "traced_in"
    lot_receipts ||--o{ allocation_traces : "candidate_for"

    lot_reservations {
        bigint id PK
        bigint lot_id FK
        string source_type
        bigint source_id
        decimal reserved_qty
        string status
        string sap_document_no
        datetime expires_at
    }
    allocation_suggestions {
        bigint id PK
        bigint lot_id FK
        bigint order_line_id FK
        bigint forecast_id FK
        decimal quantity
        string allocation_type
    }
    allocation_traces {
        bigint id PK
        bigint order_line_id FK
        bigint lot_id FK
        string decision
        string reason
    }
    lot_reservation_history {
        bigint id PK
        bigint reservation_id FK
        string operation
        bigint lot_id
        string source_type
        bigint source_id
        decimal reserved_qty
        string status
        string sap_document_no
        string changed_by
        datetime changed_at
        string change_reason
    }
```

### 2.5 需要予測ドメイン (Demand Forecasting Domain)

```mermaid
erDiagram
    customers ||--o{ forecast_current : "forecasts"
    delivery_places ||--o{ forecast_current : "forecasts_for"
    products ||--o{ forecast_current : "forecasted"
    forecast_current ||..o{ allocation_suggestions : "allocated_by"
    customers ||--o{ forecast_history : "forecasts_archived"
    delivery_places ||--o{ forecast_history : "forecasts_for_archived"
    products ||--o{ forecast_history : "forecasted_archived"

    forecast_current {
        bigint id PK
        bigint customer_id FK
        bigint delivery_place_id FK
        bigint product_id FK
        date forecast_date
        decimal forecast_quantity
        string unit
        string forecast_period
        datetime snapshot_at
    }
    forecast_history {
        bigint id PK
        bigint customer_id FK
        bigint delivery_place_id FK
        bigint product_id FK
        date forecast_date
        decimal forecast_quantity
        string unit
        string forecast_period
        datetime snapshot_at
        datetime archived_at
    }
```

### 2.6 出荷・出庫ドメイン (Withdrawal & Shipment Domain)

```mermaid
erDiagram
    customers ||--o{ withdrawals : "ships_to"
    delivery_places ||--o{ withdrawals : "ships_to"
    users ||--o{ withdrawals : "withdraws"
    users ||--o{ withdrawals : "cancels"
    withdrawals ||--o{ withdrawal_lines : "contains"
    lot_receipts ||--o{ withdrawal_lines : "withdrawn_from"

    withdrawals {
        bigint id PK
        string withdrawal_type
        bigint customer_id FK
        bigint delivery_place_id FK
        date ship_date
        date due_date
        date planned_ship_date
        text reason
        string reference_number
        bigint withdrawn_by FK
        datetime withdrawn_at
        datetime cancelled_at
        bigint cancelled_by FK
        string cancel_reason
        text cancel_note
    }
    withdrawal_lines {
        bigint id PK
        bigint withdrawal_id FK
        bigint lot_receipt_id FK
        decimal quantity
    }
```

### 2.7 入荷・仕入ドメイン (Inbound & Purchasing Domain)

```mermaid
erDiagram
    suppliers ||--o{ inbound_plans : "supplies"
    inbound_plans ||--o{ inbound_plan_lines : "contains"
    products ||--o{ inbound_plan_lines : "item"
    inbound_plan_lines ||--o{ expected_lots : "details"

    inbound_plans {
        bigint id PK
        string plan_number
        string sap_po_number
        bigint supplier_id FK
        date planned_arrival_date
        string status
    }
    inbound_plan_lines {
        bigint id PK
        bigint inbound_plan_id FK
        bigint product_id FK
        decimal planned_quantity
    }
    expected_lots {
        bigint id PK
        bigint inbound_plan_line_id FK
        string expected_lot_number
        decimal expected_quantity
    }
```

### 2.8 監査・ログドメイン (Audit & Logging Domain)

```mermaid
erDiagram
    customers ||--o{ missing_mapping_events : "has_issues"
    products ||--o{ missing_mapping_events : "has_issues"
    suppliers ||--o{ missing_mapping_events : "has_issues"
    users ||--o{ missing_mapping_events : "creates"
    users ||--o{ missing_mapping_events : "resolves"
    users ||--o{ operation_logs : "performs"
    users ||--o{ system_client_logs : "generates"
    users ||--o{ master_change_logs : "changes"

    missing_mapping_events {
        bigint id PK
        bigint customer_id FK
        bigint product_id FK
        bigint supplier_id FK
        string event_type
        datetime occurred_at
        jsonb context_json
        bigint created_by FK
        datetime resolved_at
        bigint resolved_by FK
        text resolution_note
    }
    operation_logs {
        bigint id PK
        bigint user_id FK
        string operation_type
        string target_table
        bigint target_id
        jsonb changes
        string ip_address
    }
    system_client_logs {
        bigint id PK
        bigint user_id FK
        string level
        text message
        string user_agent
    }
    master_change_logs {
        bigint id PK
        string table_name
        bigint record_id
        string change_type
        jsonb old_values
        jsonb new_values
        bigint changed_by FK
        datetime changed_at
    }
```

## 3. テーブル一覧 (Table List)

システム全体で50テーブルを管理:

### 3.1 コアマスタ (8テーブル)
- products, customers, suppliers, warehouses, delivery_places
- product_uom_conversions, product_suppliers, product_warehouse

### 3.2 品番・納入設定 (4テーブル)
- customer_items, product_mappings, customer_item_jiku_mappings, customer_item_delivery_settings

### 3.3 受注管理 (3テーブル)
- order_groups, orders, order_lines

### 3.4 入荷・仕入 (3テーブル)
- inbound_plans, inbound_plan_lines, expected_lots

### 3.5 在庫管理 (4テーブル)
- lot_master, lot_receipts, stock_history, adjustments

### 3.6 引当・予約 (4テーブル)
- lot_reservations, allocation_suggestions, allocation_traces, lot_reservation_history

### 3.7 需要予測 (2テーブル)
- forecast_current, forecast_history

### 3.8 出荷・出庫 (2テーブル)
- withdrawals, withdrawal_lines

### 3.9 システム・権限・RPA (7テーブル)
- users, roles, user_roles, user_supplier_assignments, system_configs, rpa_runs, rpa_run_items

### 3.10 バッチ処理・業務ルール (2テーブル)
- batch_jobs, business_rules

### 3.11 Power Automate連携 (2テーブル)
- cloud_flow_configs, cloud_flow_jobs

### 3.12 マッピング・マスタ変更 (3テーブル)
- layer_code_mappings, master_change_logs, warehouse_delivery_routes

### 3.13 エラー追跡・監査ログ (3テーブル)
- missing_mapping_events, operation_logs, system_client_logs

### 3.14 OCR・テストデータ (2テーブル)
- smartread_configs, seed_snapshots

### 3.15 システムテーブル (1テーブル)
- alembic_version (migration管理)
