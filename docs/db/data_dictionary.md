# データ辞書 (Data Dictionary)

主要なテーブルのカラム定義。

## 1. lots (ロット在庫)
| カラム名 | 型 | NULL | 説明 | 備考 |
| :--- | :--- | :--- | :--- | :--- |
| id | BigInteger | No | PK | |
| lot_number | String(100) | No | ロット番号 | 一意性構成要素 |
| product_id | BigInteger | No | FK (products) | 一意性構成要素 |
| warehouse_id | BigInteger | No | FK (warehouses) | 一意性構成要素 |
| supplier_id | BigInteger | Yes | FK (suppliers) | |
| expected_lot_id | BigInteger | Yes | FK (expected_lots) | 入荷予定ロットへの参照 |
| current_quantity | Decimal(15,3) | No | 現在在庫数 | 物理在庫 |
| valid_quantity | - | - | (計算値) | current - locked - reserved(confirmed) |
| locked_quantity | Decimal(15,3) | No | ロック済み数量 | Default: 0 |
| status | String(20) | No | ステータス | active, depleted, expired, quarantine, locked |
| received_date | Date | No | 入庫日 | FEFO計算基準候補 |
| expiry_date | Date | Yes | 有効期限 | FEFO計算基準 |
| origin_type | String(20) | No | 入庫区分 | order, forecast, sample, safety_stock, adhoc |
| temporary_lot_key| UUID | Yes | 仮ロットキー | 仮入庫時の一意識別子 |

## 2. lot_reservations (ロット予約)
| カラム名 | 型 | NULL | 説明 | 備考 |
| :--- | :--- | :--- | :--- | :--- |
| id | BigInteger | No | PK | |
| lot_id | BigInteger | No | FK (lots) | |
| source_type | String(20) | No | 予約元種別 | forecast, order, manual |
| source_id | BigInteger | Yes | 予約元ID | order_lines.id 等 (ポリモーフィック) |
| reserved_qty | Decimal(15,3) | No | 予約数量 | 必ず正の値 |
| status | String(20) | No | ステータス | temporary, active, confirmed, released |
| sap_document_no | String(20) | Yes | SAP伝票番号 | 確定(confirmed)時に設定 |

## 3. stock_history (在庫履歴)
| カラム名 | 型 | NULL | 説明 | 備考 |
| :--- | :--- | :--- | :--- | :--- |
| id | BigInteger | No | PK | |
| lot_id | BigInteger | No | FK (lots) | |
| transaction_type | String(20) | No | 取引種別 | inbound, allocation, shipment, adjustment 等 |
| quantity_change | Decimal(15,3) | No | 増減数 | 正負あり |
| quantity_after | Decimal(15,3) | No | 変更後在庫数 | スナップショット |
| reference_type | String(50) | Yes | 参照元種別 | inbound_plan, order 等 |
| reference_id | BigInteger | Yes | 参照元ID | |

## 4. order_lines (受注明細)
| カラム名 | 型 | NULL | 説明 | 備考 |
| :--- | :--- | :--- | :--- | :--- |
| id | BigInteger | No | PK | |
| order_id | BigInteger | No | FK (orders) | |
| product_id | BigInteger | No | FK (products) | |
| delivery_date | Date | No | 納期 | |
| order_quantity | Decimal(15,3) | No | 受注数 | |
| status | String(20) | No | ステータス | pending, allocated, shipped 等 |
| order_type | String(20) | No | 受注区分 | FORECAST_LINKED, KANBAN, SPOT, ORDER |
