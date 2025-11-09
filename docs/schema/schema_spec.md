# ロット管理システム DB スキーマ仕様（最新版）

最終更新: 2025-11-09

本ドキュメントは `public` スキーマの**現在の仕様**を記述する。  
正本: `03_db_schema_current.sql`（UTF-8）。ER 図は `er_diagram.mmd / er_diagram.svg`。

---

## 共通仕様

- 監査系カラム（全表ほぼ共通）
  - `created_at` `updated_at` `created_by` `updated_by` `deleted_at` `revision`
  - `revision` は楽観ロック用の整数（初期値 1）
- 履歴テーブル（`*_history`）
  - カラム: `id`(bigint), `op`(char(1): I/U/D), `changed_at`(timestamptz), `changed_by`(text), `row_data`(jsonb)
  - 元表の INSERT/UPDATE/DELETE を JSON で保全する監査ログ

---

## マスタ類（抜粋）

### customers

- 顧客マスタ。`customer_code`, `customer_name`, 住所系など。
- 監査系カラム・論理削除対応。
- 紐づく先: `orders`, `forecasts` 等の外部参照あり。

### products

- 製品マスタ。`product_code`, `product_name`, 単位等。
- `expiry_rules` により有効期限の自動算出対象となることがある。

### warehouses

- 倉庫マスタ。拠点・ロケーション管理の単位。

### suppliers

- 仕入先マスタ。`supplier_code`, `supplier_name` ほか。
- `expiry_rules` と連携して期限算出に用いることがある。

---

## トランザクション・業務テーブル

### orders / order_lines

- 受注ヘッダ/明細。
- 引当や出庫処理と連動。

### lots

- ロット（入庫単位）。`lot_number`, `receipt_date`, `mfg_date`, `expiry_date` など。
- `product_id`, `warehouse_id`, `supplier_id` を保持。
- ロットロック（`is_locked`/`lock_reason`）により出庫制御可。

### stock_movements

- 在庫移動明細（**入庫/出庫/移動/調整/廃棄**などの増減差分を積む）。
- 主なカラム:
  - `id`(pk), `lot_id`(nullable), `product_id`(not null), `warehouse_id`(not null)
  - `reason`(text, not null), `quantity_delta`(numeric(15,4), not null), `occurred_at`(timestamp)
  - 監査系: `created_at`/`updated_at`/`created_by`/`updated_by`/`deleted_at`/`revision`
  - 追跡: `source_table`(varchar(50)), `source_id`(int), `batch_id`(varchar(100))
- 備考:
  - ロット未確定の増減も許容（`lot_id` は null 可）
  - 現在庫ビュー `lot_current_stock` の集計元
  - 参考: COMMENT に移動理由の例（inbound/outbound/transfer/adjustment/scrap）

### lot_current_stock（VIEW）

- **ロット × 製品 × 倉庫**の現在数量を `stock_movements` から集計するビュー。
- 列:
  - `lot_id`(int), `product_id`(int), `warehouse_id`(int)
  - `current_quantity`(numeric(15,4)) = `quantity_delta` の合計
  - `last_updated`(timestamp) = `occurred_at` もしくは `created_at` の最大
- 集計条件:
  - `deleted_at IS NULL` かつ `lot_id IS NOT NULL`
  - 合計が 0 の行は除外（HAVING）
- 運用付帯:
  - バックアップ表 `lot_current_stock_backup` と履歴 `lot_current_stock_history_backup` を保持（緊急時の復旧/比較用）

### inbound_submissions

- 外部入力の取込単位（**OCR/手動/EDI** 等）の受付・処理状況。
- 主なカラム:
  - `id`(pk), `submission_id`(text), `source_uri`(text),  
    `source`(varchar(20) DEFAULT 'ocr' NOT NULL) … `ocr|manual|edi`  
    `operator`(text), `submission_date`(timestamp), `status`(text)  
    `total_records`/`processed_records`/`failed_records`/`skipped_records`(int), `error_details`(text)
  - 監査系一式
- 制約:
  - `ck_inbound_submissions_source`（`source` 列挙制約）

### sap_sync_logs

- SAP 連携ログ。送信ペイロード(`payload`)、応答(`result`)、`status`、`executed_at` を保持。
- `order_id` などの参照を持ち、監査系一式を備える。

---

## 需要予測

### forecasts

- 粒度別（`daily|dekad|monthly`）の**需要予測スナップショット**。
- 主なカラム:
  - キー: `id`(pk), `forecast_id`(uuid 想定テキスト)
  - 粒度・期間: `granularity`(varchar(16) NOT NULL), `date_day`(date), `date_dekad_start`(date), `year_month`(varchar(7))
  - 数量: `qty_forecast`(integer NOT NULL, 0 以上)
  - バージョン: `version_no`(int NOT NULL), `version_issued_at`(timestamptz NOT NULL), `is_active`(boolean NOT NULL)
  - 参照: `product_id`(int NOT NULL), `customer_id`(int NOT NULL), `source_system`(varchar(32) NOT NULL)
  - 監査系一式
- CHECK 制約（代表）:
  - `ck_forecast_granularity`（`daily|dekad|monthly`）
  - `ck_forecast_period_key_exclusivity`（粒度に応じた期間キーの排他整合）
  - `ck_forecast_qty_nonneg`（数量 0 以上）

---

## 期限・単位系

### expiry_rules

- **有効/消費期限の自動算出ルール**。
- カラム:
  - `id`(pk), `rule_type`(text NOT NULL: 例 `days`/`fixed_date`)
  - `days`(int), `fixed_date`(date), `is_active`(boolean DEFAULT true NOT NULL), `priority`(int NOT NULL)
  - 監査系一式, 参照: `product_id`(int nullable), `supplier_id`(int nullable)
- 備考: `product_id`/`supplier_id` が NULL の場合は汎用ルールとして扱う設計。

### unit_conversions

- **単位換算マスタ**（例: `from_unit` → `to_unit`, 係数 `factor`）。
- カラム: `id`(pk), `from_unit`(varchar(10) NOT NULL), `to_unit`(varchar(10) NOT NULL), `factor`(numeric(10,4) NOT NULL) ほか監査系。
- `product_id` を持ち、製品別の換算を許容。

---

## 運用付帯テーブル

### lot_current_stock_backup

- `lot_current_stock` の**スナップショット保存用の実表**。
- カラム: `lot_id`, `current_quantity`(double), `last_updated`, 監査系一式。

### lot_current_stock_history_backup

- `lot_current_stock_backup` の監査履歴（`*_history` 標準形式）。

### alembic_version

- Alembic の現在リビジョン番号（`version_num`）。

---

## 参照関係（概要）

- `order_lines` → `orders`, `products`, `warehouses`（外部参照）
- `lots` → `products`, `warehouses`, `suppliers`
- `stock_movements` → `lots?`（nullable）, `products`, `warehouses`
- `forecasts` → `products`, `customers`
- `expiry_rules` → `products?`, `suppliers?`（NULL 許容で汎用ルール）
- `inbound_submissions` → 外部連携の単位。直接の FK は持たず、ジョブ追跡が中心。

---

## 運用ルール（要旨）

- 物理削除は行わず、`deleted_at` により論理削除を徹底。
- 変更は `*_history` に**必ず**残る（I/U/D の差分監査）。
- 在庫は**差分積み上げ（`stock_movements`）**を正として管理。現在庫はビューで算出し、運用上の要請でバックアップ実表を併用可能。
