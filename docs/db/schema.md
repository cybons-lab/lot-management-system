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

## 8. システム・権限・RPA (System & Auth & RPA)

システム管理、認証、およびRPA連携ログ。

### 8.1 テーブル一覧

| テーブル名 | 和名 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **users** | ユーザー | システム利用者。 | Azure AD連携IDなど |
| **roles** | ロール | 権限ロール情報。 | |
| **user_roles** | ユーザーロール | ユーザーとロールの多対多関係。 | |
| **user_supplier_assignments**| 担当仕入先 | ユーザーごとの担当仕入先設定。 | 画面フィルタリングに使用 |
| **system_configs** | システム設定 | キーバリュー形式の全体設定。 | |
| **rpa_runs** | RPA実行 | 素材納品書RPAなどの実行ジョブヘッダ。 | |
| **rpa_run_items** | RPA実行詳細 | RPA処理対象の明細行（CSV行）。 | ステータス管理 |

### 8.2 ER図 (Mermaid)

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
