# データベーススキーマ (Database Schema)

本ドキュメントでは、Lot Management Systemの全データベーステーブル定義と、ドメインごとのER図（実体関連図）を記載する。

## 1. 概要 (Overview)

- **データベース**: PostgreSQL
- **共通カラム**:
    - `id`: BIGSERIAL (Primary Key)
    - `created_at`: 作成日時 (Not Null, Default: Current Timestamp)
    - `updated_at`: 更新日時 (Not Null, Default: Current Timestamp)
- **論理削除**:
    - マスタ系テーブルは `valid_to` カラムを持つ（日次管理）。
    - `valid_to >= current_date` のレコードを有効とみなす。
- **業務キー**:
    - 内部ID (`id`) とは別に、業務上で一意性を識別するためのコード（例: `product_code`, `customer_order_no`）を持つテーブルが多い。

## 2. 基本マスタ (Core Masters)

システムの基盤となるマスタデータ群。

### 2.1 テーブル一覧

| テーブル名 | 和名 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **products** | 製品マスタ | 全製品の基本情報を管理。 | メーカー品番、基本単位、消費期限日数など |
| **customers** | 得意先マスタ | 販売先の基本情報を管理。 | |
| **suppliers** | 仕入先マスタ | 原材料の調達先情報を管理。 | |
| **warehouses** | 倉庫マスタ |在庫を保管する物理的・論理的場所。 | 社内/社外/仕入先倉庫の区分あり |
| **delivery_places** | 納入先マスタ | 得意先ごとの納品場所。 | 次区コード(Jiku Code)も管理 |
| **product_uom_conversions** | 単位換算マスタ | 製品ごとの単位変換係数を管理。 | 例: 1缶 = 20kg |

### 2.2 ER図 (Mermaid)

```mermaid
erDiagram
    products ||--o{ product_uom_conversions : "has"
    customers ||--o{ delivery_places : "owns"

    products {
        bigint id PK
        string maker_part_code "メーカー品番"
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
        string warehouse_type "internal/external/supplier"
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
```

## 3. 品番・納入設定 (Product Mappings & Settings)

得意先・製品・仕入先の3者間の関係定義や、納品時の個別ルール設定。

### 3.1 テーブル一覧

| テーブル名 | 和名 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **customer_items** | 得意先品目 | 得意先と製品の紐付け。 | 先方品番、梱包単位、出荷テンプレート |
| **product_mappings** | 商品マスタ | 得意先・製品・仕入先の3者マッピング。 | 商流の定義 |
| **customer_item_jiku_mappings** | 次区マッピング | 得意先品番と納入先(次区)の紐付け。 | デフォルト納入先の解決に使用 |
| **customer_item_delivery_settings** | 納入設定 | 納入先ごとの細かい出荷・梱包・LT設定。 | SAP連携用テキストなど |

### 3.2 ER図 (Mermaid)

```mermaid
erDiagram
    customers ||--o{ customer_items : "defines"
    products ||--o{ customer_items : "referenced_by"
    suppliers ||--o{ customer_items : "optional_default"

    customer_items ||--o{ customer_item_jiku_mappings : "has_jiku"
    customer_items ||--o{ customer_item_delivery_settings : "has_settings"
    delivery_places ||--o{ customer_item_jiku_mappings : "maps_to"
    delivery_places ||--o{ customer_item_delivery_settings : "maps_to"

    customer_items {
        bigint customer_id PK, FK
        string external_product_code PK "先方品番"
        bigint product_id FK
        bigint supplier_id FK
        string base_unit
        int pack_quantity
        text special_instructions
    }
    product_mappings {
        bigint id PK
        bigint customer_id FK
        string customer_part_code "先方品番"
        bigint supplier_id FK
        bigint product_id FK
    }
    customer_item_jiku_mappings {
        bigint id PK
        bigint customer_id FK
        string external_product_code
        string jiku_code
        bigint delivery_place_id FK
    }
    customer_item_delivery_settings {
        bigint id PK
        bigint customer_id FK
        string external_product_code
        bigint delivery_place_id FK
        string jiku_code
        int lead_time_days
        text shipping_text
    }
```

## 4. 受注管理 (Order Management)

顧客からの注文情報の管理。

### 4.1 テーブル一覧

| テーブル名 | 和名 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **order_groups** | 受注グループ | 「得意先×製品×受注日」をまとめる論理単位。 | 仮想的な受注番号の役割 |
| **orders** | 受注ヘッダ | 受注伝票のヘッダ情報。 | 受注日、ステータス |
| **order_lines** | 受注明細 | 受注の明細行。 | 数量、納期、納入先、業務キー(SAP番号等) |

### 4.2 ER図 (Mermaid)

```mermaid
erDiagram
    customers ||--o{ orders : "places"
    orders ||--o{ order_lines : "contains"
    products ||--o{ order_lines : "ordered"
    delivery_places ||--o{ order_lines : "ship_to"
    order_groups ||--o{ order_lines : "groups"

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
        string sap_order_no "SAP受注No"
        string customer_order_no "得意先注文No"
        string status
    }
```

## 5. 入荷・仕入 (Inbound & Purchasing)

原材料の入荷予定および実績管理。

### 5.1 テーブル一覧

| テーブル名 | 和名 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **inbound_plans** | 入荷予定ヘッダ | サプライヤーからの入荷予定。 | SAP購買発注番号(PO)とリンク |
| **inbound_plan_lines** | 入荷予定明細 | 入荷予定の品目・数量。 | |
| **expected_lots** | 入荷予定ロット | 明細に対する具体的なロット情報の紐付け（任意）。 | |

### 5.2 ER図 (Mermaid)

```mermaid
erDiagram
    suppliers ||--o{ inbound_plans : "supplies"
    inbound_plans ||--o{ inbound_plan_lines : "contains"
    products ||--o{ inbound_plan_lines : "item"
    inbound_plan_lines ||--o{ expected_lots : "details"

    inbound_plans {
        bigint id PK
        string plan_number
        string sap_po_number "SAP PO No"
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

## 6. 在庫管理 (Inventory Management)

物理在庫(ロット)の状態と履歴管理。現行設計では「ロット番号の名寄せ」と「入荷実体」を分離し、
`lot_master` と `lot_receipts` の2テーブルで表現する。

### 6.1 テーブル一覧

| テーブル名 | 和名 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **lot_master** | ロット番号名寄せ | 同一ロット番号の名寄せマスタ。 | `lot_number` + `product_id` で一意 |
| **lot_receipts** | 入荷実体 | 入荷1件を表す物理ロット。 | `lot_master` に紐づく |
| **stock_history** | 在庫履歴 | ロットに対する全ての数量変動ログ。 | 入出庫、調整、移動履歴 |
| **adjustments** | 在庫調整 | 棚卸やロスなどの数量調整記録。 | |

### 6.2 ER図 (Mermaid)

```mermaid
erDiagram
    products ||--o{ lot_master : "is_master_of"
    suppliers ||--o{ lot_master : "originates_from (optional)"

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
        string status "active/depleted/expired/..."
        string temporary_lot_key "UUID (仮入庫用)"
        string receipt_key "UUID (入荷識別)"
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

## 7. 引当・予約 (Allocation & Reservation)

需要（受注・フォーキャスト）と供給（在庫）のマッチング。

### 7.1 テーブル一覧

| テーブル名 | 和名 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **lot_reservations** | ロット予約 | ロットに対する数量予約の事実。 | Order/Forecast/Manualの区別あり |
| **allocation_suggestions** | 引当推奨 | システム計算による引当案（一時データ）。 | ユーザー承認待ちの提案 |
| **allocation_traces** | 引当トレース | 引当ロジック(FEFO等)の判断根拠ログ。 | なぜそのロットが選ばれたか/選ばれなかったか |

### 7.2 ER図 (Mermaid)

```mermaid
erDiagram
    lot_receipts ||--o{ lot_reservations : "reserved"
    
    %% 論理的な参照であり外部キー制約がない場合もあるが関係を示す
    order_lines ||..|| lot_reservations : "source (if type=order)"

    lot_reservations {
        bigint id PK
        bigint lot_id FK
        string source_type "order/forecast/manual"
        bigint source_id "Reference ID"
        decimal reserved_qty
        string status "temporary/active/confirmed/released"
        datetime expires_at
    }
    allocation_suggestions {
        bigint id PK
        bigint lot_id FK
        bigint order_line_id
        bigint forecast_id
        decimal quantity
        string allocation_type "soft/hard"
    }
    allocation_traces {
        bigint id PK
        bigint order_line_id FK
        bigint lot_id FK
        string decision "adopted/rejected"
        string reason
    }
```

## 8. 需要予測 (Demand Forecasting)

顧客需要予測データの管理。

### 8.1 テーブル一覧

| テーブル名 | 和名 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **forecast_current** | 現行予測 | 最新の需要予測データ。 | 引当対象となる予測 |
| **forecast_history** | 予測履歴 | 過去の予測データのアーカイブ。 | 予測精度分析用 |

### 8.2 ER図 (Mermaid)

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
        string forecast_period "YYYY-MM"
        datetime snapshot_at "取得日時"
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

## 9. 出荷・出庫 (Withdrawal & Shipment)

在庫からの出庫実績管理。

### 9.1 テーブル一覧

| テーブル名 | 和名 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **withdrawals** | 出庫ヘッダ | 出庫伝票のヘッダ情報。 | 受注手動、内部使用、廃棄など |
| **withdrawal_lines** | 出庫明細 | 出庫伝票の明細行。 | ロットごとの出庫数量 |

### 9.2 ER図 (Mermaid)

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
        string withdrawal_type "order_manual/internal_use/disposal/return/sample/other"
        bigint customer_id FK
        bigint delivery_place_id FK
        date ship_date
        date due_date "納期"
        date planned_ship_date "予定出荷日"
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

## 10. システム・権限・RPA (System & Auth & RPA)

システム管理、認証、およびRPA連携ログ。

### 10.1 テーブル一覧

| テーブル名 | 和名 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **users** | ユーザー | システム利用者。 | Azure AD連携IDなど |
| **roles** | ロール | 権限ロール情報。 | |
| **user_roles** | ユーザーロール | ユーザーとロールの多対多関係。 | |
| **user_supplier_assignments**| 担当仕入先 | ユーザーごとの担当仕入先設定。 | 画面フィルタリングに使用 |
| **system_configs** | システム設定 | キーバリュー形式の全体設定。 | |
| **rpa_runs** | RPA実行 | 素材納品書RPAなどの実行ジョブヘッダ。 | |
| **rpa_run_items** | RPA実行詳細 | RPA処理対象の明細行（CSV行）。 | ステータス管理 |

### 10.2 ER図 (Mermaid)

```mermaid
erDiagram
    users ||--o{ user_roles : "assigned"
    roles ||--o{ user_roles : "defined_in"
    users ||--o{ user_supplier_assignments : "manages"
    suppliers ||--o{ user_supplier_assignments : "managed_by"
    rpa_runs ||--o{ rpa_run_items : "contains"
    users ||--o{ rpa_runs : "starts"

    users {
        bigint id PK
        string username
        string email
        string azure_object_id
        bool is_active
    }
    roles {
        bigint id PK
        string role_code
        string role_name
    }
    user_supplier_assignments {
        bigint id PK
        bigint user_id FK
        bigint supplier_id FK
        bool is_primary
    }
    rpa_runs {
        bigint id PK
        string rpa_type
        string status
        datetime started_at
    }
    rpa_run_items {
        bigint id PK
        bigint run_id FK
        int row_no
        bool issue_flag
        bool complete_flag
    }
```

## 11. バッチ処理・業務ルール (Batch & Business Rules)

バッチジョブ管理と業務ルールエンジン。

### 11.1 テーブル一覧

| テーブル名 | 和名 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **batch_jobs** | バッチジョブ | バッチ処理の実行ジョブ管理。 | 引当推奨、在庫同期、レポート生成など |
| **business_rules** | 業務ルール | ビジネスルールの定義。 | 引当、期限警告、かんばん、在庫同期アラート |

### 11.2 ER図 (Mermaid)

```mermaid
erDiagram
    batch_jobs {
        bigint id PK
        string job_name
        string job_type "allocation_suggestion/allocation_finalize/inventory_sync/data_import/report_generation"
        string status "pending/running/completed/failed"
        jsonb parameters
        text result_message
        datetime started_at
        datetime completed_at
    }
    business_rules {
        bigint id PK
        string rule_code
        string rule_name
        string rule_type "allocation/expiry_warning/kanban/inventory_sync_alert/other"
        jsonb rule_parameters
        bool is_active
    }
```

## 12. Power Automate連携 (Cloud Flow Integration)

Microsoft Power Automate連携設定とジョブ管理。

### 12.1 テーブル一覧

| テーブル名 | 和名 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **cloud_flow_configs** | クラウドフロー設定 | Power Automate設定のキーバリューストア。 | エンドポイントURL、認証情報など |
| **cloud_flow_jobs** | クラウドフロージョブ | Power Automate実行ジョブ履歴。 | データエクスポートなどの実行管理 |

### 12.2 ER図 (Mermaid)

```mermaid
erDiagram
    users ||--o{ cloud_flow_jobs : "requests"

    cloud_flow_configs {
        bigint id PK
        string config_key "Unique"
        text config_value
        text description
    }
    cloud_flow_jobs {
        bigint id PK
        string job_type
        string status "pending/running/completed/failed"
        date start_date
        date end_date
        bigint requested_by_user_id FK
        datetime requested_at
        datetime started_at
        datetime completed_at
        text result_message
        text error_message
    }
```

## 13. マッピング・マスタ変更 (Mappings & Master Change Tracking)

レイヤーコードマッピング、製品-仕入先関係、倉庫-製品関係、マスタ変更ログ。

### 13.1 テーブル一覧

| テーブル名 | 和名 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **layer_code_mappings** | レイヤーコードマッピング | レイヤーコードとメーカー名の紐付け。 | |
| **product_suppliers** | 製品-仕入先関係 | 製品ごとの仕入先設定。 | 主仕入先フラグ、リードタイム |
| **product_warehouse** | 製品-倉庫関係 | 製品ごとの保管可能倉庫設定。 | |
| **master_change_logs** | マスタ変更ログ | マスタデータ変更の監査ログ。 | 変更前後の値をJSONで保存 |
| **warehouse_delivery_routes** | 倉庫-納入先経路 | 倉庫から納入先への輸送経路設定。 | 輸送リードタイム |

### 13.2 ER図 (Mermaid)

```mermaid
erDiagram
    products ||--o{ product_suppliers : "supplied_by"
    suppliers ||--o{ product_suppliers : "supplies"

    products ||--o{ product_warehouse : "stored_at"
    warehouses ||--o{ product_warehouse : "stores"

    users ||--o{ master_change_logs : "changes"

    warehouses ||--o{ warehouse_delivery_routes : "ships_from"
    delivery_places ||--o{ warehouse_delivery_routes : "ships_to"
    products ||--o{ warehouse_delivery_routes : "routed (optional)"

    layer_code_mappings {
        string layer_code PK
        string maker_name
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
    master_change_logs {
        bigint id PK
        string table_name
        bigint record_id
        string change_type "insert/update/delete"
        jsonb old_values
        jsonb new_values
        bigint changed_by FK
        datetime changed_at
    }
    warehouse_delivery_routes {
        bigint id PK
        bigint warehouse_id FK
        bigint delivery_place_id FK
        bigint product_id FK "Optional"
        int transport_lead_time_days
        bool is_active
        text notes
    }
```

## 14. エラー追跡・監査ログ (Error Tracking & Audit Logs)

マッピングエラー、操作ログ、引当履歴、クライアントログ。

### 14.1 テーブル一覧

| テーブル名 | 和名 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **missing_mapping_events** | マッピング欠損イベント | マッピングエラーのトラッキング。 | 納入先未設定、次区マッピング未設定など |
| **operation_logs** | 操作ログ | ユーザー操作の監査ログ。 | 作成、更新、削除、ログイン、エクスポート |
| **lot_reservation_history** | ロット予約履歴 | ロット予約の変更履歴。 | INSERT/UPDATE/DELETE操作の追跡 |
| **system_client_logs** | クライアントログ | フロントエンドからのエラーログ。 | ブラウザ側のエラー収集 |

### 14.2 ER図 (Mermaid)

```mermaid
erDiagram
    customers ||--o{ missing_mapping_events : "has_issues"
    products ||--o{ missing_mapping_events : "has_issues"
    suppliers ||--o{ missing_mapping_events : "has_issues"
    users ||--o{ missing_mapping_events : "creates"
    users ||--o{ missing_mapping_events : "resolves"

    users ||--o{ operation_logs : "performs"

    lot_reservations ||..o{ lot_reservation_history : "tracked"

    users ||--o{ system_client_logs : "generates"

    missing_mapping_events {
        bigint id PK
        bigint customer_id FK
        bigint product_id FK
        bigint supplier_id FK
        string event_type "delivery_place_not_found/jiku_mapping_not_found 等"
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
        string operation_type "create/update/delete/login/logout/export"
        string target_table
        bigint target_id
        jsonb changes
        string ip_address
    }
    lot_reservation_history {
        bigint id PK
        bigint reservation_id FK
        string operation "INSERT/UPDATE/DELETE"
        bigint lot_id
        string source_type
        bigint source_id
        decimal reserved_qty
        string status
        string sap_document_no
        bigint old_lot_id
        string old_source_type
        bigint old_source_id
        decimal old_reserved_qty
        string old_status
        string old_sap_document_no
        string changed_by
        datetime changed_at
        string change_reason
    }
    system_client_logs {
        bigint id PK
        bigint user_id FK
        string level "info/warn/error"
        text message
        string user_agent
    }
```

## 15. OCR・テストデータ (OCR & Test Data)

OCR設定とテストデータスナップショット管理。

### 15.1 テーブル一覧

| テーブル名 | 和名 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **smartread_configs** | SmartRead設定 | OCR (SmartRead) 連携設定。 | エンドポイント、APIキー、テンプレート |
| **seed_snapshots** | テストデータスナップショット | テストデータ生成のスナップショット管理。 | パラメータ、プロファイル、サマリ保存 |

### 15.2 ER図 (Mermaid)

```mermaid
erDiagram
    smartread_configs {
        bigint id PK
        text endpoint
        text api_key
        text template_ids
        string export_type "json/csv"
        string aggregation_type
        text watch_dir
        text export_dir
        string input_exts "pdf,png,jpg,jpeg"
        string name
        text description
        bool is_active
    }
    seed_snapshots {
        int id PK
        string name "スナップショット名"
        datetime created_at
        jsonb params_json "展開後の最終パラメータ"
        jsonb profile_json "使用したプロファイル設定"
        text csv_dir "CSVエクスポートディレクトリ"
        jsonb summary_json "生成結果のサマリ"
    }
```
