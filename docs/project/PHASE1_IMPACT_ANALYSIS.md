# Phase1 根本対策 - 影響範囲調査レポート (PHASE1_IMPACT_ANALYSIS.md)

## 1. 概要
Phase1の暫定対応（`product_group_id` と `supplier_item_id` の混在）を解消し、完全に `supplier_item_id` に統一するための影響範囲を調査した。

## 2. データベースの影響範囲

### 2.1. テーブルの修正
以下のテーブルで、`product_group_id` を削除し、`supplier_item_id` を NOT NULL に変更する必要がある。

| テーブル名 | 現在の状態 (product_group_id) | 現在の状態 (supplier_item_id) | アクション |
| :--- | :--- | :--- | :--- |
| `lot_receipts` | NOT NULL, FK to supplier_items | NULLABLE, FK to supplier_items | 1. 移行 2. 削除 3. NOT NULL化 |
| `order_lines` | NOT NULL, FK to supplier_items | NULLABLE, FK to supplier_items | 1. 移行 2. 削除 3. NOT NULL化 |
| `forecast_current` | NOT NULL, FK to supplier_items | NULLABLE, FK to supplier_items | 1. 移行 2. 削除 3. NOT NULL化 |
| `inbound_plan_lines` | NOT NULL, FK to supplier_items | NULLABLE, FK to supplier_items | 1. 移行 2. 削除 3. NOT NULL化 |
| `customer_items` | N/A (既に整理済み) | NOT NULL | 現状維持 |
| `product_warehouse` | NOT NULL, FK to supplier_items | N/A | カラム名変更 (product_group_id -> supplier_item_id) |
| `warehouse_delivery_routes` | NULLABLE, FK to supplier_items | N/A | カラム名変更 |
| `product_uom_conversions` | NOT NULL, FK to supplier_items | N/A | カラム名変更 |
| `lot_master` | NOT NULL, FK to supplier_items | NULLABLE, FK to supplier_items | 1. 移行 2. 削除 3. NOT NULL化 |

### 2.2. ビューの修正
以下のビュー定義を `product_group_id` への参照を排除し、`supplier_item_id` を使用するように書き換える。

- `v_lot_receipt_stock`
- `v_lot_details`
- `v_inventory_summary`
- `v_order_line_details`
- `v_candidate_lots_by_order_line`
- `v_lot_available_qty`
- `v_lot_current_stock`
- `v_forecast_order_pairs`
- `v_product_code_to_id` (既に supplier_items を見ているが、エイリアスを整理)
- `v_order_line_context`
- `v_customer_daily_products`

## 3. バックエンドの影響範囲

### 3.1. モデル定義 (`models/`)
- `LotReceipt`, `OrderLine`, `ForecastCurrent`, `InboundPlanLine`, `LotMaster` 等から `product_group_id` フィールドを削除。
- `supplier_item_id` を必須項目に変更。
- `ProductWarehouse`, `ProductUomConversion` 等の `product_group_id` を `supplier_item_id` にリネーム。

### 3.2. スキーマ定義 (`schemas/`)
以下のファイルから `validation_alias` / `serialization_alias` を削除し、フィールド名を `supplier_item_id` に統一する。

- `orders/orders_schema.py`
- `masters/customer_items_schema.py`
- `inventory/inventory_schema.py`
- `inventory/inbound_schema.py`
- `masters/uom_conversions_schema.py`
- `masters/warehouse_delivery_routes_schema.py`
- `allocations/allocations_schema.py`

### 3.3. サービス層 (`services/`)
`product_group_id` を引数や変数名として使っている箇所を `supplier_item_id` に置換。
特に `inventory_service.py`, `order_service.py`, `allocation_service.py` が主要な変更対象。

## 4. フロントエンドの影響範囲

### 4.1. 全般
`product_group_id` という単語をコードベース全体で `supplier_item_id` に置換する。

### 4.2. 特記事項
- 型定義の更新 (`npm run typegen`)
- 検索フィルタやフォームのフィールド名の変更
- APIクライアント (`api.ts`) のパラメータ名変更

## 5. リスク評価
- **データ移行の失敗**: `product_group_id` から `supplier_item_id` へのコピーが不完全な場合、リレーションが壊れる。
- **ビューの破損**: ビューを再作成する際、依存関係を正しく考慮しないと `DROP VIEW CASCADE` で他のビューも消える。
- **フロント・バックエンドの不一致**: APIのプロパティ名が変わるため、同時リリース（または互換性維持期間の設営）が必要。今回は「一発で完璧に」が求められているため、同時更新とする。

## 6. 結論
暫定対応によって `product_group_id` が `supplier_items.id` を指すように変更されているため、DBレベルでの変更は「不要な列の削除と名前の整理」が主となる。プログラムコード上では、エイリアスを排除して明示的に `supplier_item_id` を扱うようにすることで、Phase1の本来の設計通りの挙動となる。
