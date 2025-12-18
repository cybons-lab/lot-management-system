# 業務フロー図・システム構成図

> **最終更新:** 2025-12-04  
> **目的:** システム全体の業務フローとデータの流れを視覚的に理解する

---

## 📊 システム全体図

```mermaid
flowchart TB
    subgraph External["外部システム"]
        SAP["SAP"]
        OCR["OCR取込"]
    end
    
    subgraph Frontend["フロントエンド (React)"]
        UI["Web UI"]
    end
    
    subgraph Backend["バックエンド (FastAPI)"]
        API["REST API"]
        Services["ビジネスロジック"]
        Batch["バッチ処理"]
    end
    
    subgraph Database["データベース (PostgreSQL)"]
        Master["マスタデータ"]
        Transaction["トランザクションデータ"]
        Log["ログ・履歴"]
    end
    
    UI --> API
    API --> Services
    Services --> Transaction
    Services --> Master
    Batch --> Transaction
    OCR --> API
    Services --> SAP
    Services --> Log
```

---

## 🔄 主要業務フロー

### 1. 入荷フロー（仕入→在庫）

```mermaid
flowchart LR
    subgraph 入荷予定登録
        A1[仕入先から<br>入荷連絡] --> A2[入荷予定<br>登録]
        A2 --> A3[予定ロット<br>作成]
    end
    
    subgraph 入荷確定
        B1[現物到着] --> B2[入荷確定<br>処理]
        B2 --> B3[実ロット<br>作成]
        B3 --> B4[在庫履歴<br>記録]
    end
    
    A3 --> B1
```

**関連テーブル:**
| ステップ | テーブル | 操作 |
|---------|---------|------|
| 入荷予定登録 | `inbound_plans` | INSERT |
| 予定ロット作成 | `inbound_plan_lines`, `expected_lots` | INSERT |
| 入荷確定 | `inbound_plans` | UPDATE (status) |
| 実ロット作成 | `lots` | INSERT |
| 在庫履歴記録 | `stock_history` | INSERT (type=inbound) |

---

### 2. 受注フロー（受注→引当）

```mermaid
flowchart LR
    subgraph 受注登録
        C1[得意先から<br>受注] --> C2[受注ヘッダー<br>登録]
        C2 --> C3[受注明細<br>登録]
    end
    
    subgraph 引当処理
        D1[引当候補<br>検索] --> D2[FEFO順<br>ソート]
        D2 --> D3[引当<br>実行]
        D3 --> D4[ロット<br>数量更新]
    end
    
    C3 --> D1
```

**関連テーブル:**
| ステップ | テーブル | 操作 |
|---------|---------|------|
| 受注ヘッダー登録 | `orders` | INSERT |
| 受注明細登録 | `order_lines` | INSERT |
| 引当候補検索 | `lots` | SELECT (status=active) |
| 引当実行 | `allocations` | INSERT |
| ロット数量更新 | `lots` | UPDATE (allocated_quantity) |
| 引当トレース | `allocation_traces` | INSERT |

---

### 3. 出荷フロー（引当→出荷）

```mermaid
flowchart LR
    subgraph 出荷準備
        E1[出荷指示] --> E2[ピッキング<br>リスト作成]
        E2 --> E3[商品<br>ピッキング]
    end
    
    subgraph 出荷確定
        F1[出荷検品] --> F2[出荷確定<br>処理]
        F2 --> F3[在庫<br>減算]
        F3 --> F4[履歴<br>記録]
    end
    
    E3 --> F1
```

**関連テーブル:**
| ステップ | テーブル | 操作 |
|---------|---------|------|
| 出荷確定 | `allocations` | UPDATE (status=shipped) |
| 受注明細更新 | `order_lines` | UPDATE (status=shipped) |
| 在庫減算 | `lots` | UPDATE (current_quantity) |
| 履歴記録 | `stock_history` | INSERT (type=shipment) |

---

### 4. フォーキャスト（内示）フロー

```mermaid
flowchart LR
    subgraph 内示取込
        G1[得意先から<br>内示データ] --> G2[CSV/Excel<br>取込]
        G2 --> G3[フォーキャスト<br>登録]
    end
    
    subgraph 引当提案
        H1[在庫と<br>照合] --> H2[引当提案<br>生成]
        H2 --> H3[提案<br>レビュー]
        H3 --> H4[受注<br>確定]
    end
    
    G3 --> H1
```

**関連テーブル:**
| ステップ | テーブル | 操作 |
|---------|---------|------|
| フォーキャスト登録 | `forecast_current` | INSERT/UPDATE |
| 履歴保存 | `forecast_history` | INSERT |
| 引当提案生成 | `allocation_suggestions` | INSERT |
| 受注確定 | `orders`, `order_lines` | INSERT |

---

## 📈 在庫数量の状態遷移

```mermaid
stateDiagram-v2
    [*] --> 入荷予定: 入荷予定登録
    入荷予定 --> 実在庫: 入荷確定
    実在庫 --> 引当済: 引当実行
    引当済 --> 出荷済: 出荷確定
    出荷済 --> [*]
    
    実在庫 --> 調整済: 棚卸調整
    調整済 --> 実在庫: 再カウント
    
    実在庫 --> 期限切れ: 有効期限到達
    期限切れ --> 廃棄: 廃棄処理
    廃棄 --> [*]
```

---

## 🗃️ ER図（簡易版）

### マスタデータ関連

```mermaid
erDiagram
    customers ||--o{ delivery_places : "has"
    customers ||--o{ orders : "places"
    customers ||--o{ customer_items : "has"
    
    products ||--o{ customer_items : "mapped_to"
    products ||--o{ lots : "has"
    products ||--o{ order_lines : "ordered"
    products ||--o{ product_uom_conversions : "has"
    
    suppliers ||--o{ lots : "supplies"
    suppliers ||--o{ inbound_plans : "plans"
    suppliers ||--o{ customer_items : "supplied_by"
    
    warehouses ||--o{ lots : "stores"
    
    customers {
        bigint id PK
        varchar customer_code UK
        varchar customer_name
    }
    
    products {
        bigint id PK
        varchar maker_part_code UK
        varchar product_name
        varchar base_unit
        int consumption_limit_days
    }
    
    suppliers {
        bigint id PK
        varchar supplier_code UK
        varchar supplier_name
    }
    
    warehouses {
        bigint id PK
        varchar warehouse_code UK
        varchar warehouse_name
        varchar warehouse_type
    }
```

### 在庫・引当関連

```mermaid
erDiagram
    lots ||--o{ allocations : "allocated_from"
    lots ||--o{ stock_history : "tracks"
    lots ||--o{ adjustments : "adjusted"
    
    orders ||--o{ order_lines : "contains"
    order_lines ||--o{ allocations : "has"
    order_lines ||--o{ allocation_traces : "traced"
    
    inbound_plans ||--o{ inbound_plan_lines : "contains"
    inbound_plan_lines ||--o{ expected_lots : "expects"
    expected_lots ||--o| lots : "becomes"
    
    lots {
        bigint id PK
        varchar lot_number
        bigint product_id FK
        bigint warehouse_id FK
        date expiry_date
        numeric current_quantity
        numeric allocated_quantity
        varchar status
    }
    
    allocations {
        bigint id PK
        bigint order_line_id FK
        bigint lot_id FK
        numeric allocated_quantity
        varchar status
    }
    
    order_lines {
        bigint id PK
        bigint order_id FK
        bigint product_id FK
        date delivery_date
        numeric order_quantity
        varchar status
    }
```

---

## 🔐 ユーザー認証・権限

```mermaid
erDiagram
    users ||--o{ user_roles : "has"
    roles ||--o{ user_roles : "assigned_to"
    users ||--o{ operation_logs : "performs"
    
    users {
        bigint id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        boolean is_active
    }
    
    roles {
        bigint id PK
        varchar role_code UK
        varchar role_name
    }
    
    user_roles {
        bigint user_id PK_FK
        bigint role_id PK_FK
    }
```

---

## 📱 画面遷移図

```mermaid
flowchart TB
    subgraph Dashboard["ダッシュボード"]
        HOME[ホーム]
    end
    
    subgraph Masters["マスタ管理"]
        M1[製品マスタ]
        M2[得意先マスタ]
        M3[仕入先マスタ]
        M4[倉庫マスタ]
        M5[得意先品番<br>マッピング]
        M6[単位換算<br>マスタ]
    end
    
    subgraph Inventory["在庫管理"]
        I1[在庫一覧]
        I2[ロット詳細]
        I3[棚卸・調整]
    end
    
    subgraph Orders["受注管理"]
        O1[受注一覧]
        O2[受注詳細]
        O3[引当画面]
        O4[SAP登録]
    end
    
    subgraph Inbound["入荷管理"]
        IN1[入荷予定一覧]
        IN2[入荷予定詳細]
        IN3[入荷確定]
    end
    
    subgraph Forecast["フォーキャスト"]
        F1[フォーキャスト<br>一覧]
        F2[取込画面]
    end
    
    HOME --> Masters
    HOME --> Inventory
    HOME --> Orders
    HOME --> Inbound
    HOME --> Forecast
    
    I1 --> I2
    I2 --> I3
    
    O1 --> O2
    O2 --> O3
    O3 --> O4
    
    IN1 --> IN2
    IN2 --> IN3
```

---

## 📋 ステータス一覧

### ロット (lots.status)

| ステータス | 日本語 | 説明 |
|-----------|--------|------|
| `active` | 有効 | 引当可能な在庫 |
| `depleted` | 在庫なし | 現在数量がゼロ |
| `expired` | 期限切れ | 有効期限超過 |
| `quarantine` | 検疫中 | 品質確認中（引当不可） |
| `locked` | ロック中 | 管理者によりロック（引当不可） |

### 受注明細 (order_lines.status)

| ステータス | 日本語 | 説明 |
|-----------|--------|------|
| `pending` | 未引当 | 引当待ち |
| `allocated` | 引当完了 | ロット引当済み |
| `shipped` | 出荷済 | 出荷確定済み |
| `completed` | 完了 | 全工程完了 |
| `cancelled` | キャンセル | 受注取消 |

### 入荷予定 (inbound_plans.status)

| ステータス | 日本語 | 説明 |
|-----------|--------|------|
| `planned` | 予定 | 入荷待ち |
| `partially_received` | 一部入荷 | 一部のみ入荷 |
| `received` | 入荷完了 | 全数入荷 |
| `cancelled` | キャンセル | 入荷取消 |

---

## 🔗 関連ドキュメント

- [データモデルガイド](./data_model_guide.md) - テーブル詳細説明
- [スキーマドキュメント](./schema.adoc) - ER図、テーブル定義
- [アーキテクチャ](./architecture.adoc) - システム構成、API構造
- [API リファレンス](./api_reference.adoc) - APIエンドポイント一覧
