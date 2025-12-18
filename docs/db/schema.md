# データベーススキーマ (Database Schema)

## 1. 概要 (Overview)
PostgreSQLを使用。
マスタデータ、受注、在庫、引当の4つの主要ドメインで構成される。
多くのテーブルで `created_at`, `updated_at` を持ち、マスタ系テーブルは `valid_to` による論理削除（履歴管理）をサポートしている。

## 2. テーブル一覧 (Table List)

### 2.1. マスタ (Masters)
根拠: `backend/app/infrastructure/persistence/models/masters_models.py`

| テーブル名 | 説明 | 備考 |
| :--- | :--- | :--- |
| **products** | 製品マスタ | メーカー品番、製品名、基本単位(base_unit)。論理削除あり。 |
| **customers** | 得意先マスタ | 得意先情報。論理削除あり。 |
| **suppliers** | 仕入先マスタ | 仕入先情報。論理削除あり。 |
| **warehouses** | 倉庫マスタ | 倉庫コード、種別（internal/external/supplier）。論理削除あり。 |
| **delivery_places** | 納入先マスタ | 得意先配下の納品場所。 |
| **customer_items** | 得意先品目 | 得意先ごとの製品コード変換、梱包設定など。 |
| **product_mappings** | 製品マッピング | 顧客・製品・仕入先の3社間マッピング。 |
| **product_uom_conversions** | 単位換算 | 製品ごとの入数・単位変換係数。 |

### 2.2. 在庫管理 (Inventory)
根拠: `backend/app/infrastructure/persistence/models/inventory_models.py`

| テーブル名 | 説明 | 備考 |
| :--- | :--- | :--- |
| **lots** | ロット在庫 | 製品・倉庫・ロット番号単位の実在庫。 |
| **stock_history** | 在庫履歴 | 入出庫、引当、移動などの全トランザクションログ。 |
| **adjustments** | 在庫調整 | 棚卸差異や破損報告による数量変更記録。 |

### 2.3. 受注・入庫 (Orders & Inbound)
根拠: `backend/app/infrastructure/persistence/models/orders_models.py`, `inbound_models.py`

| テーブル名 | 説明 | 備考 |
| :--- | :--- | :--- |
| **orders** | 受注ヘッダ | 受注日、得意先、ステータス。 |
| **order_lines** | 受注明細 | 製品、数量、納期、納入先。引当元データ。 |
| **inbound_plans** | 入荷予定 | 入庫予定のヘッダ。 |
| **inbound_plan_lines** | 入荷明細 | 入庫予定の詳細。 |

### 2.4. 引当・予約 (Allocation & Reservation)
根拠: `backend/app/infrastructure/persistence/models/lot_reservations_model.py`

| テーブル名 | 説明 | 備考 |
| :--- | :--- | :--- |
| **lot_reservations** | ロット予約 | ロットに対する引当（予約）情報。Forecast/Order/Manualが混在。 |
| **allocation_suggestions**| 引当推奨 | システムが計算した引当案（一時保存）。 |
| **allocation_traces** | 引当トレース | FEFOなどの引当判断ロジックの結果ログ。 |
