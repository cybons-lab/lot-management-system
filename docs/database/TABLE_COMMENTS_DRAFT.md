# データベーステーブル・カラムコメント定義

このドキュメントは、全テーブルとカラムに対する日本語論理名称（コメント）と初期値の定義を記載しています。
確認・修正後、SQLAlchemyモデルに反映し、マイグレーションを作成します。

---

## 📦 在庫管理テーブル

### `lot_receipts` (ロット入荷実体)

**テーブルコメント:**
「ロット入荷実体：個別の入荷記録を管理。在庫の単一ソース」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `lot_master_id` | BIGINT | NO | - | ロットマスタID（名寄せ親） |
| `product_group_id` | BIGINT | NO | - | 仕入先品目ID（メーカー品番への参照、歴史的にproduct_group_idと命名） |
| `warehouse_id` | BIGINT | NO | - | 倉庫ID |
| `supplier_id` | BIGINT | YES | NULL | 仕入先ID（仕入元） |
| `expected_lot_id` | BIGINT | YES | NULL | 入荷予定ロットID |
| `supplier_item_id` | BIGINT | YES | NULL | 仕入先品目ID（メーカー品番の実体、supplier_items参照） |
| `received_date` | DATE | NO | - | 入荷日 |
| `expiry_date` | DATE | YES | NULL | 有効期限（NULL=期限なし） |
| `received_quantity` | NUMERIC(15,3) | NO | 0 | 入荷数量（初期入荷時の数量） |
| `consumed_quantity` | NUMERIC(15,3) | NO | 0 | 消費済み数量（出庫確定分の累積） |
| `unit` | VARCHAR(20) | NO | - | 単位 |
| `status` | VARCHAR(20) | NO | 'active' | ステータス（active/depleted/expired/quarantine/locked） |
| `lock_reason` | TEXT | YES | NULL | ロック理由 |
| `locked_quantity` | NUMERIC(15,3) | NO | 0 | ロック数量（手動ロック分） |
| `inspection_status` | VARCHAR(20) | NO | 'not_required' | 検査ステータス（not_required/pending/passed/failed） |
| `inspection_date` | DATE | YES | NULL | 検査日 |
| `inspection_cert_number` | VARCHAR(100) | YES | NULL | 検査証明書番号 |
| `shipping_date` | DATE | YES | NULL | 出荷予定日 |
| `cost_price` | NUMERIC(10,2) | YES | NULL | 仕入単価 |
| `sales_price` | NUMERIC(10,2) | YES | NULL | 販売単価 |
| `tax_rate` | NUMERIC(5,2) | YES | NULL | 適用税率 |
| `version` | INTEGER | NO | 1 | バージョン（楽観的ロック用） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |
| `origin_type` | VARCHAR(20) | NO | 'adhoc' | 起源種別（order/forecast/sample/safety_stock/adhoc） |
| `origin_reference` | VARCHAR(255) | YES | NULL | 起源参照（受注ID等） |
| `temporary_lot_key` | UUID | YES | NULL | 仮入庫時の一意識別キー（UUID） |
| `receipt_key` | UUID | NO | - | 入荷識別UUID（重複防止、NOT NULL） |

**計算カラム（Hybrid Property）:**
- `current_quantity`: 現在在庫数 = received_quantity - consumed_quantity

---

### `lot_master` (ロット番号名寄せマスタ)

**テーブルコメント:**
「ロット番号名寄せマスタ：同一ロット番号の複数入荷を集約管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `lot_number` | VARCHAR(100) | YES | NULL | ロット番号（仕入先発番、NULL許可） |
| `product_group_id` | BIGINT | NO | - | 仕入先品目ID（メーカー品番への参照） |
| `supplier_id` | BIGINT | YES | NULL | 仕入先ID（仕入元） |
| `total_quantity` | NUMERIC(15,3) | NO | 0 | 合計入荷数量（受け入れ時） |
| `first_receipt_date` | DATE | YES | NULL | 初回入荷日（自動更新） |
| `latest_expiry_date` | DATE | YES | NULL | 傘下receiptの最長有効期限（表示用） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

**ユニーク制約:** (lot_number, product_group_id) WHERE lot_number IS NOT NULL

---

### `lot_reservations` (ロット引当)

**テーブルコメント:**
「ロット引当：ロットの予約管理（受注・予測・手動）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `lot_id` | BIGINT | NO | - | ロットID（lot_receipts参照） |
| `source_type` | VARCHAR(20) | NO | - | 引当元種別（forecast/order/manual） |
| `source_id` | BIGINT | YES | NULL | 引当元ID（order_line_id等） |
| `reserved_qty` | NUMERIC(15,3) | NO | - | 引当数量（正数必須） |
| `status` | VARCHAR(20) | NO | 'active' | ステータス（temporary/active/confirmed/released） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | YES | NULL | 更新日時 |
| `expires_at` | DATETIME | YES | NULL | 有効期限（一時引当用） |
| `confirmed_at` | DATETIME | YES | NULL | 確定日時 |
| `confirmed_by` | VARCHAR(50) | YES | NULL | 確定ユーザー |
| `released_at` | DATETIME | YES | NULL | 解放日時 |
| `cancel_reason` | VARCHAR(50) | YES | NULL | キャンセル理由（input_error/wrong_quantity等） |
| `cancel_note` | VARCHAR(500) | YES | NULL | キャンセル補足 |
| `cancelled_by` | VARCHAR(50) | YES | NULL | キャンセル実行ユーザー |
| `sap_document_no` | VARCHAR(20) | YES | NULL | SAP伝票番号（SAP登録成功時にセット） |
| `sap_registered_at` | DATETIME | YES | NULL | SAP登録日時 |

---

### `lot_reservation_history` (ロット引当履歴)

**テーブルコメント:**
「ロット引当履歴：lot_reservations変更の監査ログ」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `reservation_id` | BIGINT | NO | - | 引当ID |
| `operation` | VARCHAR(10) | NO | - | 操作種別（INSERT/UPDATE/DELETE） |
| `lot_id` | BIGINT | YES | NULL | 新ロットID |
| `source_type` | VARCHAR(20) | YES | NULL | 新引当元種別 |
| `source_id` | BIGINT | YES | NULL | 新引当元ID |
| `reserved_qty` | NUMERIC(15,3) | YES | NULL | 新引当数量 |
| `status` | VARCHAR(20) | YES | NULL | 新ステータス |
| `sap_document_no` | VARCHAR(20) | YES | NULL | 新SAP伝票番号 |
| `old_lot_id` | BIGINT | YES | NULL | 旧ロットID |
| `old_source_type` | VARCHAR(20) | YES | NULL | 旧引当元種別 |
| `old_source_id` | BIGINT | YES | NULL | 旧引当元ID |
| `old_reserved_qty` | NUMERIC(15,3) | YES | NULL | 旧引当数量 |
| `old_status` | VARCHAR(20) | YES | NULL | 旧ステータス |
| `old_sap_document_no` | VARCHAR(20) | YES | NULL | 旧SAP伝票番号 |
| `changed_by` | VARCHAR(100) | YES | NULL | 変更ユーザー |
| `changed_at` | DATETIME | NO | CURRENT_TIMESTAMP | 変更日時 |
| `change_reason` | VARCHAR(255) | YES | NULL | 変更理由 |

---

### `stock_history` (在庫履歴)

**テーブルコメント:**
「在庫履歴：追記専用の在庫台帳（イミュータブル）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `lot_id` | BIGINT | NO | - | ロットID（lot_receipts参照） |
| `transaction_type` | VARCHAR(20) | NO | - | トランザクション種別（inbound/allocation/shipment/adjustment/return/withdrawal） |
| `quantity_change` | NUMERIC(15,3) | NO | - | 数量変動（±） |
| `quantity_after` | NUMERIC(15,3) | NO | - | 変動後在庫数 |
| `reference_type` | VARCHAR(50) | YES | NULL | 参照種別（order/forecast等） |
| `reference_id` | BIGINT | YES | NULL | 参照ID |
| `transaction_date` | DATETIME | NO | CURRENT_TIMESTAMP | トランザクション日時 |

---

### `adjustments` (在庫調整)

**テーブルコメント:**
「在庫調整：ロットへの在庫調整記録」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `lot_id` | BIGINT | NO | - | ロットID（lot_receipts参照） |
| `adjustment_type` | VARCHAR(20) | NO | - | 調整種別（physical_count/damage/loss/found/other） |
| `adjusted_quantity` | NUMERIC(15,3) | NO | - | 調整数量 |
| `reason` | TEXT | NO | - | 調整理由 |
| `adjusted_by` | BIGINT | NO | - | 調整実行ユーザーID |
| `adjusted_at` | DATETIME | NO | CURRENT_TIMESTAMP | 調整日時 |

---

### `allocation_suggestions` (引当推奨)

**テーブルコメント:**
「引当推奨：システムが提案する引当案」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `order_line_id` | BIGINT | YES | NULL | 受注明細ID |
| `forecast_period` | VARCHAR(20) | NO | - | 予測期間（YYYY-MM or YYYY-MM-DD） |
| `forecast_id` | BIGINT | YES | NULL | 予測ID |
| `customer_id` | BIGINT | NO | - | 顧客ID |
| `delivery_place_id` | BIGINT | NO | - | 納入先ID |
| `product_group_id` | BIGINT | NO | - | 仕入先品目ID（メーカー品番への参照） |
| `lot_id` | BIGINT | NO | - | ロットID（推奨対象） |
| `quantity` | NUMERIC(15,3) | NO | - | 推奨引当数量 |
| `priority` | INTEGER | NO | 0 | 優先度 |
| `allocation_type` | VARCHAR(10) | NO | - | 引当種別（soft/hard） |
| `source` | VARCHAR(32) | NO | - | 推奨元（forecast_import等） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `allocation_traces` (引当トレース)

**テーブルコメント:**
「引当トレース：引当処理の推論過程を記録（デバッグ用）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `order_line_id` | BIGINT | NO | - | 受注明細ID |
| `lot_id` | BIGINT | YES | NULL | ロットID（候補ロット） |
| `score` | NUMERIC(15,6) | YES | NULL | 優先度スコア（FEFOベース等） |
| `decision` | VARCHAR(20) | NO | - | 判定結果（adopted/rejected/partial） |
| `reason` | VARCHAR(255) | NO | - | 判定理由（期限切れ/ロック中/FEFO採用/在庫不足等） |
| `allocated_qty` | NUMERIC(15,3) | YES | NULL | 実引当数量（adoptedまたはpartialの場合） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

---

## 📋 受注管理テーブル

### `orders` (受注ヘッダ)

**テーブルコメント:**
「受注ヘッダ：受注全体の情報を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `customer_id` | BIGINT | NO | - | 顧客ID |
| `order_date` | DATE | NO | - | 受注日 |
| `status` | VARCHAR(20) | NO | 'open' | ステータス（open/part_allocated/allocated/shipped/closed） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |
| `locked_by_user_id` | INTEGER | YES | NULL | ロック中ユーザーID（楽観的ロック用） |
| `locked_at` | DATETIME | YES | NULL | ロック取得日時 |
| `lock_expires_at` | DATETIME | YES | NULL | ロック有効期限 |
| `ocr_source_filename` | VARCHAR(255) | YES | NULL | OCR取込元ファイル名 |
| `cancel_reason` | VARCHAR(255) | YES | NULL | キャンセル・保留理由 |

---

### `order_lines` (受注明細)

**テーブルコメント:**
「受注明細：受注の明細行を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `order_id` | BIGINT | NO | - | 受注ヘッダID |
| `order_group_id` | BIGINT | YES | NULL | 受注グループID（得意先×製品×受注日） |
| `product_group_id` | BIGINT | YES | NULL | 仕入先品目ID（メーカー品番への参照、OCR取込時はNULL可、変換後に設定） |
| `customer_part_no` | VARCHAR(100) | YES | NULL | 得意先品番（先方品番、OCR読取時は生データ） |
| `delivery_date` | DATE | NO | - | 納期 |
| `order_quantity` | NUMERIC(15,3) | NO | - | 受注数量 |
| `unit` | VARCHAR(20) | NO | - | 単位 |
| `converted_quantity` | NUMERIC(15,3) | YES | NULL | 換算後数量（内部単位） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |
| `delivery_place_id` | BIGINT | NO | - | 納入先ID |
| `customer_order_no` | VARCHAR(6) | YES | NULL | 得意先6桁受注番号（業務キー） |
| `customer_order_line_no` | VARCHAR(10) | YES | NULL | 得意先側行番号 |
| `sap_order_no` | VARCHAR(20) | YES | NULL | SAP受注番号（業務キー） |
| `sap_order_item_no` | VARCHAR(6) | YES | NULL | SAP明細番号（業務キー） |
| `shipping_document_text` | TEXT | YES | NULL | 出荷表テキスト |
| `order_type` | VARCHAR(20) | NO | 'ORDER' | 需要種別（FORECAST_LINKED/KANBAN/SPOT/ORDER） |
| `forecast_reference` | VARCHAR(100) | YES | NULL | Forecast業務キー参照（forecast_id FK廃止） |
| `status` | VARCHAR(20) | NO | 'pending' | ステータス（pending/allocated/shipped/completed/cancelled/on_hold） |
| `version` | INTEGER | NO | 1 | バージョン（楽観的ロック用） |

**ユニーク制約:** (order_group_id, customer_order_no)

---

### `order_groups` (受注グループ)

**テーブルコメント:**
「受注グループ：業務キー中心の論理ヘッダ（得意先×製品×受注日）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `customer_id` | BIGINT | NO | - | 顧客ID |
| `product_group_id` | BIGINT | NO | - | 仕入先品目ID（メーカー品番への参照） |
| `order_date` | DATE | NO | - | 受注日 |
| `source_file_name` | VARCHAR(255) | YES | NULL | 取り込み元ファイル名 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

**ユニーク制約:** (customer_id, product_group_id, order_date)

---

## 📦 マスタデータテーブル

### `warehouses` (倉庫マスタ)

**テーブルコメント:**
「倉庫マスタ：倉庫情報を管理（Soft Delete対応）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `warehouse_code` | VARCHAR(50) | NO | - | 倉庫コード（業務キー） |
| `warehouse_name` | VARCHAR(200) | NO | - | 倉庫名 |
| `warehouse_type` | VARCHAR(20) | NO | - | 倉庫種別（internal/external/supplier） |
| `default_transport_lead_time_days` | INTEGER | YES | NULL | デフォルト輸送リードタイム（日） |
| `short_name` | VARCHAR(50) | YES | NULL | 短縮表示名（UI省スペース用） |
| `valid_to` | DATE | NO | '9999-12-31' | 有効終了日（Soft Delete） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `suppliers` (仕入先マスタ)

**テーブルコメント:**
「仕入先マスタ：仕入先情報を管理（Soft Delete対応）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `supplier_code` | VARCHAR(50) | NO | - | 仕入先コード（業務キー） |
| `supplier_name` | VARCHAR(200) | NO | - | 仕入先名 |
| `short_name` | VARCHAR(50) | YES | NULL | 短縮表示名（UI省スペース用） |
| `valid_to` | DATE | NO | '9999-12-31' | 有効終了日（Soft Delete） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `customers` (顧客マスタ)

**テーブルコメント:**
「顧客マスタ：得意先情報を管理（Soft Delete対応）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `customer_code` | VARCHAR(50) | NO | - | 顧客コード（業務キー） |
| `customer_name` | VARCHAR(200) | NO | - | 顧客名 |
| `address` | VARCHAR(500) | YES | NULL | 住所 |
| `contact_name` | VARCHAR(100) | YES | NULL | 担当者名 |
| `phone` | VARCHAR(50) | YES | NULL | 電話番号 |
| `email` | VARCHAR(200) | YES | NULL | メールアドレス |
| `short_name` | VARCHAR(50) | YES | NULL | 短縮表示名（UI省スペース用） |
| `valid_to` | DATE | NO | '9999-12-31' | 有効終了日（Soft Delete） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `delivery_places` (納入先マスタ)

**テーブルコメント:**
「納入先マスタ：納入先情報を管理（Soft Delete対応）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `jiku_code` | VARCHAR(50) | NO | '' | 次区コード |
| `delivery_place_code` | VARCHAR(50) | NO | - | 納入先コード（業務キー） |
| `delivery_place_name` | VARCHAR(200) | NO | - | 納入先名 |
| `short_name` | VARCHAR(50) | YES | NULL | 短縮表示名（UI省スペース用） |
| `customer_id` | BIGINT | NO | - | 顧客ID |
| `valid_to` | DATE | NO | '9999-12-31' | 有効終了日（Soft Delete） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `supplier_items` (仕入先品目マスタ)

**テーブルコメント:**
「仕入先品目マスタ：メーカー品番の実体（2コード体系のSSOT）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `supplier_id` | BIGINT | NO | - | 仕入先ID |
| `maker_part_no` | VARCHAR(100) | NO | - | メーカー品番（仕入先の品番、業務キー） |
| `display_name` | VARCHAR(200) | NO | - | 製品名（必須） |
| `base_unit` | VARCHAR(20) | NO | - | 基本単位（在庫単位、必須） |
| `internal_unit` | VARCHAR(20) | YES | NULL | 社内単位/引当単位（例: CAN） |
| `external_unit` | VARCHAR(20) | YES | NULL | 外部単位/表示単位（例: KG） |
| `qty_per_internal_unit` | NUMERIC(10,4) | YES | NULL | 内部単位あたりの数量（例: 1 CAN = 20.0 KG） |
| `consumption_limit_days` | INTEGER | YES | NULL | 消費期限日数 |
| `requires_lot_number` | BOOLEAN | NO | TRUE | ロット番号管理が必要 |
| `net_weight` | NUMERIC(10,3) | YES | NULL | 正味重量 |
| `weight_unit` | VARCHAR(20) | YES | NULL | 重量単位 |
| `lead_time_days` | INTEGER | YES | NULL | リードタイム（日） |
| `notes` | TEXT | YES | NULL | 備考 |
| `valid_to` | DATE | NO | '9999-12-31' | 有効終了日（Soft Delete） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

**ユニーク制約:** (supplier_id, maker_part_no)

---

### `customer_items` (得意先品番マッピング)

**テーブルコメント:**
「得意先品番マッピング：顧客が使用する品番コードの変換マスタ（受注・出荷ドメイン）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `customer_id` | BIGINT | NO | - | 顧客ID |
| `customer_part_no` | VARCHAR(100) | NO | - | 得意先品番（先方品番、得意先が注文時に指定する品番） |
| `product_group_id` | BIGINT | NO | - | 仕入先品目ID（メーカー品番への参照） |
| `supplier_id` | BIGINT | YES | NULL | 仕入先ID |
| `supplier_item_id` | BIGINT | YES | NULL | 仕入先品目ID |
| `is_primary` | BOOLEAN | NO | FALSE | 主要得意先フラグ（1 supplier_itemにつき1つ） |
| `base_unit` | VARCHAR(20) | NO | - | 基本単位 |
| `pack_unit` | VARCHAR(20) | YES | NULL | 梱包単位 |
| `pack_quantity` | INTEGER | YES | NULL | 梱包数量 |
| `special_instructions` | TEXT | YES | NULL | 特記事項 |
| `valid_to` | DATE | NO | '9999-12-31' | 有効終了日（Soft Delete） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

**ユニーク制約:** (customer_id, customer_part_no)

---

### `product_mappings` (商品マッピング)

**テーブルコメント:**
「商品マッピング：顧客+先方品番+製品+仕入先の4者マッピング（調達・発注ドメイン）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `customer_id` | BIGINT | NO | - | 顧客ID |
| `customer_part_code` | VARCHAR(100) | NO | - | 得意先品番コード |
| `supplier_id` | BIGINT | NO | - | 仕入先ID |
| `product_group_id` | BIGINT | NO | - | 仕入先品目ID（メーカー品番への参照） |
| `base_unit` | VARCHAR(20) | NO | - | 基本単位 |
| `pack_unit` | VARCHAR(20) | YES | NULL | 梱包単位 |
| `pack_quantity` | INTEGER | YES | NULL | 梱包数量 |
| `special_instructions` | TEXT | YES | NULL | 特記事項 |
| `valid_to` | DATE | NO | '9999-12-31' | 有効終了日（Soft Delete） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

**ユニーク制約:** (customer_id, customer_part_code, supplier_id)

---

### `product_uom_conversions` (製品単位換算マスタ)

**テーブルコメント:**
「製品単位換算マスタ：製品ごとの単位変換係数を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `conversion_id` | BIGSERIAL | NO | - | 換算ID（主キー） |
| `product_group_id` | BIGINT | NO | - | 仕入先品目ID（メーカー品番への参照） |
| `external_unit` | VARCHAR(20) | NO | - | 外部単位 |
| `factor` | NUMERIC(15,3) | NO | - | 変換係数 |
| `valid_to` | DATE | NO | '9999-12-31' | 有効終了日（Soft Delete） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

**ユニーク制約:** (product_group_id, external_unit)

---

### `warehouse_delivery_routes` (輸送経路マスタ)

**テーブルコメント:**
「輸送経路マスタ：倉庫から納入先への輸送リードタイムを管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `warehouse_id` | BIGINT | NO | - | 倉庫ID |
| `delivery_place_id` | BIGINT | NO | - | 納入先ID |
| `product_group_id` | BIGINT | YES | NULL | 仕入先品目ID（メーカー品番への参照、NULLの場合は経路デフォルト） |
| `transport_lead_time_days` | INTEGER | NO | - | 輸送リードタイム（日） |
| `is_active` | BOOLEAN | NO | TRUE | 有効フラグ |
| `notes` | TEXT | YES | NULL | 備考 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `customer_item_jiku_mappings` (顧客商品-次区マッピング)

**テーブルコメント:**
「顧客商品-次区マッピング：顧客品番と次区コードの対応を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `customer_item_id` | BIGINT | NO | - | 顧客商品ID |
| `jiku_code` | VARCHAR(50) | NO | - | 次区コード |
| `delivery_place_id` | BIGINT | NO | - | 納入先ID |
| `is_default` | BOOLEAN | YES | FALSE | デフォルト次区フラグ |
| `created_at` | DATETIME | YES | CURRENT_TIMESTAMP | 作成日時 |

**ユニーク制約:** (customer_item_id, jiku_code)

---

### `customer_item_delivery_settings` (得意先品番-納入先別出荷設定)

**テーブルコメント:**
「得意先品番-納入先別出荷設定：次区・納入先ごとの出荷テキスト、梱包注意書き、リードタイム等を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `customer_item_id` | BIGINT | NO | - | 顧客商品ID |
| `delivery_place_id` | BIGINT | YES | NULL | 納入先ID（NULLの場合はデフォルト設定） |
| `jiku_code` | VARCHAR(50) | YES | NULL | 次区コード（NULLの場合は全次区共通） |
| `shipment_text` | TEXT | YES | NULL | 出荷表テキスト（SAP連携用） |
| `packing_note` | TEXT | YES | NULL | 梱包・注意書き |
| `lead_time_days` | INTEGER | YES | NULL | リードタイム（日） |
| `is_default` | BOOLEAN | NO | FALSE | デフォルト設定フラグ |
| `valid_from` | DATE | YES | NULL | 有効開始日 |
| `valid_to` | DATE | YES | NULL | 有効終了日 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

**ユニーク制約:** (customer_item_id, delivery_place_id, jiku_code)

---

## 📥 入荷計画テーブル

### `inbound_plans` (入荷計画ヘッダ)

**テーブルコメント:**
「入荷計画ヘッダ：入荷計画全体の情報を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `plan_number` | VARCHAR(50) | NO | - | 計画番号（業務キー） |
| `sap_po_number` | VARCHAR(20) | YES | NULL | SAP購買発注番号（業務キー） |
| `supplier_id` | BIGINT | NO | - | 仕入先ID |
| `planned_arrival_date` | DATE | NO | - | 入荷予定日 |
| `status` | VARCHAR(20) | NO | 'planned' | ステータス（planned/partially_received/received/cancelled） |
| `notes` | TEXT | YES | NULL | 備考 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

**ユニーク制約:** plan_number, sap_po_number

---

### `inbound_plan_lines` (入荷計画明細)

**テーブルコメント:**
「入荷計画明細：入荷計画の製品別明細を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `inbound_plan_id` | BIGINT | NO | - | 入荷計画ヘッダID |
| `product_group_id` | BIGINT | NO | - | 仕入先品目ID（メーカー品番への参照） |
| `planned_quantity` | NUMERIC(15,3) | NO | - | 計画数量 |
| `unit` | VARCHAR(20) | NO | - | 単位 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `expected_lots` (入荷予定ロット)

**テーブルコメント:**
「入荷予定ロット：入荷予定ロット情報の事前登録」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `inbound_plan_line_id` | BIGINT | NO | - | 入荷計画明細ID |
| `expected_lot_number` | VARCHAR(100) | YES | NULL | 予定ロット番号（入荷時確定の場合はNULL） |
| `expected_quantity` | NUMERIC(15,3) | NO | - | 予定数量 |
| `expected_expiry_date` | DATE | YES | NULL | 予定有効期限 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

## 📤 出庫管理テーブル

### `withdrawals` (出庫記録)

**テーブルコメント:**
「出庫記録：受注外出庫の記録を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `lot_id` | BIGINT | YES | NULL | ロットID（レガシー：withdrawal_lines移行後は未使用） |
| `quantity` | NUMERIC(15,3) | YES | NULL | 数量（レガシー：withdrawal_lines移行後は未使用） |
| `withdrawal_type` | VARCHAR(20) | NO | - | 出庫種別（order_manual/internal_use/disposal/return/sample/other） |
| `customer_id` | BIGINT | YES | NULL | 顧客ID |
| `delivery_place_id` | BIGINT | YES | NULL | 納入先ID |
| `ship_date` | DATE | YES | NULL | 出荷日 |
| `due_date` | DATE | NO | - | 納期（必須） |
| `planned_ship_date` | DATE | YES | NULL | 予定出荷日（任意、LT計算用） |
| `reason` | TEXT | YES | NULL | 理由 |
| `reference_number` | VARCHAR(100) | YES | NULL | 参照番号 |
| `withdrawn_by` | BIGINT | YES | NULL | 出庫実行ユーザーID |
| `withdrawn_at` | DATETIME | NO | CURRENT_TIMESTAMP | 出庫日時 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `cancelled_at` | DATETIME | YES | NULL | キャンセル日時 |
| `cancelled_by` | BIGINT | YES | NULL | キャンセル実行ユーザーID |
| `cancel_reason` | VARCHAR(50) | YES | NULL | キャンセル理由 |
| `cancel_note` | TEXT | YES | NULL | キャンセル補足 |

---

### `withdrawal_lines` (出庫明細)

**テーブルコメント:**
「出庫明細：どのreceiptから何個出庫したか（FIFO消費記録）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `withdrawal_id` | BIGINT | NO | - | 出庫ID |
| `lot_receipt_id` | BIGINT | NO | - | ロット入荷ID（lot_receipts参照） |
| `quantity` | NUMERIC(15,3) | NO | - | 出庫数量 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

---

## 📊 予測管理テーブル

### `forecast_current` (現行予測)

**テーブルコメント:**
「現行予測：最新の予測データのみを保持」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `customer_id` | BIGINT | NO | - | 顧客ID |
| `delivery_place_id` | BIGINT | NO | - | 納入先ID |
| `product_group_id` | BIGINT | NO | - | 仕入先品目ID（メーカー品番への参照） |
| `forecast_date` | DATE | NO | - | 予測日 |
| `forecast_quantity` | NUMERIC(15,3) | NO | - | 予測数量 |
| `unit` | VARCHAR | YES | NULL | 単位 |
| `forecast_period` | VARCHAR(7) | NO | - | 予測期間（YYYY-MM形式） |
| `snapshot_at` | DATETIME | NO | CURRENT_TIMESTAMP | スナップショット日時 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

**ユニーク制約:** (customer_id, delivery_place_id, product_group_id, forecast_date, forecast_period)

---

### `forecast_history` (予測履歴)

**テーブルコメント:**
「予測履歴：過去の全予測データをアーカイブ（FK制約なし）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `customer_id` | BIGINT | NO | - | 顧客ID（FK制約なし） |
| `delivery_place_id` | BIGINT | NO | - | 納入先ID（FK制約なし） |
| `product_group_id` | BIGINT | NO | - | 仕入先品目ID（メーカー品番への参照、FK制約なし） |
| `forecast_date` | DATE | NO | - | 予測日 |
| `forecast_quantity` | NUMERIC | NO | - | 予測数量 |
| `unit` | VARCHAR | YES | NULL | 単位 |
| `forecast_period` | VARCHAR(7) | NO | - | 予測期間（YYYY-MM形式） |
| `snapshot_at` | DATETIME | NO | - | スナップショット日時 |
| `archived_at` | DATETIME | NO | CURRENT_TIMESTAMP | アーカイブ日時 |
| `created_at` | DATETIME | NO | - | 作成日時 |
| `updated_at` | DATETIME | NO | - | 更新日時 |

---

## 👤 認証・ユーザー管理テーブル

### `users` (ユーザーマスタ)

**テーブルコメント:**
「ユーザーマスタ：システムユーザー情報を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `username` | VARCHAR(50) | NO | - | ユーザー名（ログインID、ユニーク） |
| `email` | VARCHAR(255) | NO | - | メールアドレス（ユニーク） |
| `auth_provider` | VARCHAR(50) | NO | 'local' | 認証プロバイダ（local/azure等） |
| `azure_object_id` | VARCHAR(100) | YES | NULL | Azure AD オブジェクトID（ユニーク） |
| `password_hash` | VARCHAR(255) | YES | NULL | パスワードハッシュ |
| `display_name` | VARCHAR(100) | NO | - | 表示名 |
| `is_active` | BOOLEAN | NO | TRUE | アクティブフラグ |
| `last_login_at` | DATETIME | YES | NULL | 最終ログイン日時 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `roles` (ロールマスタ)

**テーブルコメント:**
「ロールマスタ：システムロール（権限グループ）を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `role_code` | VARCHAR(50) | NO | - | ロールコード（admin/user/guest等、ユニーク） |
| `role_name` | VARCHAR(100) | NO | - | ロール名 |
| `description` | TEXT | YES | NULL | 説明 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `user_roles` (ユーザー-ロール関連)

**テーブルコメント:**
「ユーザー-ロール関連：ユーザーとロールの多対多関連を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `user_id` | BIGINT | NO | - | ユーザーID（複合PK） |
| `role_id` | BIGINT | NO | - | ロールID（複合PK） |
| `assigned_at` | DATETIME | NO | CURRENT_TIMESTAMP | 割り当て日時 |

---

### `user_supplier_assignments` (ユーザー-仕入先担当割り当て)

**テーブルコメント:**
「ユーザー-仕入先担当割り当て：ユーザーと仕入先の担当関係を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `user_id` | BIGINT | NO | - | ユーザーID |
| `supplier_id` | BIGINT | NO | - | 仕入先ID |
| `is_primary` | BOOLEAN | NO | FALSE | 主担当フラグ（1仕入先につき1人のみ） |
| `assigned_at` | DATETIME | NO | CURRENT_TIMESTAMP | 割り当て日時 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

**ユニーク制約:** (user_id, supplier_id)

---

## ⚙️ システム管理テーブル

### `system_configs` (システム設定)

**テーブルコメント:**
「システム設定：システム全体の設定値を管理（キー・バリュー型）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `config_key` | VARCHAR(100) | NO | - | 設定キー（ユニーク） |
| `config_value` | TEXT | NO | - | 設定値 |
| `description` | TEXT | YES | NULL | 説明 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `business_rules` (業務ルール設定)

**テーブルコメント:**
「業務ルール設定：業務ロジックのルールを動的に管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `rule_code` | VARCHAR(50) | NO | - | ルールコード（ユニーク） |
| `rule_name` | VARCHAR(100) | NO | - | ルール名 |
| `rule_type` | VARCHAR(50) | NO | - | ルール種別（allocation/expiry_warning/kanban/inventory_sync_alert/other） |
| `rule_parameters` | JSONB | NO | '{}' | ルールパラメータ（JSON形式） |
| `is_active` | BOOLEAN | NO | TRUE | 有効フラグ |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `batch_jobs` (バッチジョブ管理)

**テーブルコメント:**
「バッチジョブ管理：バッチ処理の実行状況を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `job_name` | VARCHAR(100) | NO | - | ジョブ名 |
| `job_type` | VARCHAR(50) | NO | - | ジョブ種別（allocation_suggestion/allocation_finalize/inventory_sync/data_import/report_generation） |
| `status` | VARCHAR(20) | NO | 'pending' | ステータス（pending/running/completed/failed） |
| `parameters` | JSONB | YES | NULL | パラメータ（JSON形式） |
| `result_message` | TEXT | YES | NULL | 結果メッセージ |
| `started_at` | DATETIME | YES | NULL | 開始日時 |
| `completed_at` | DATETIME | YES | NULL | 完了日時 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

---

## 📝 ログ・監査テーブル

### `operation_logs` (操作ログ)

**テーブルコメント:**
「操作ログ：ユーザー操作の監査証跡を記録」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `user_id` | BIGINT | YES | NULL | ユーザーID |
| `operation_type` | VARCHAR(50) | NO | - | 操作種別（create/update/delete/login/logout/export） |
| `target_table` | VARCHAR(50) | NO | - | 対象テーブル |
| `target_id` | BIGINT | YES | NULL | 対象レコードID |
| `changes` | JSONB | YES | NULL | 変更内容（JSON形式） |
| `ip_address` | VARCHAR(50) | YES | NULL | IPアドレス |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

---

### `master_change_logs` (マスタ変更履歴)

**テーブルコメント:**
「マスタ変更履歴：マスタデータの変更履歴を記録」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `table_name` | VARCHAR(50) | NO | - | テーブル名 |
| `record_id` | BIGINT | NO | - | レコードID |
| `change_type` | VARCHAR(20) | NO | - | 変更種別（insert/update/delete） |
| `old_values` | JSONB | YES | NULL | 変更前の値（JSON形式） |
| `new_values` | JSONB | YES | NULL | 変更後の値（JSON形式） |
| `changed_by` | BIGINT | NO | - | 変更ユーザーID |
| `changed_at` | DATETIME | NO | CURRENT_TIMESTAMP | 変更日時 |

---

### `server_logs` (サーバーログ)

**テーブルコメント:**
「サーバーログ：アプリケーションログを保存（調査用）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `level` | VARCHAR(20) | NO | - | ログレベル（DEBUG/INFO/WARNING/ERROR） |
| `logger` | VARCHAR(255) | NO | - | ロガー名 |
| `event` | TEXT | YES | NULL | イベント名 |
| `message` | TEXT | NO | - | メッセージ |
| `request_id` | VARCHAR(64) | YES | NULL | リクエストID |
| `user_id` | BIGINT | YES | NULL | ユーザーID |
| `username` | VARCHAR(255) | YES | NULL | ユーザー名 |
| `method` | VARCHAR(16) | YES | NULL | HTTPメソッド |
| `path` | TEXT | YES | NULL | リクエストパス |
| `extra` | JSONB | YES | NULL | 追加情報（JSON形式） |

---

### `system_client_logs` (クライアントログ)

**テーブルコメント:**
「クライアントログ：フロントエンドのログをサーバー側に保存」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `user_id` | BIGINT | YES | NULL | ユーザーID |
| `level` | VARCHAR(20) | NO | 'info' | ログレベル（debug/info/warning/error） |
| `message` | TEXT | NO | - | メッセージ |
| `user_agent` | VARCHAR(255) | YES | NULL | ユーザーエージェント |
| `request_id` | VARCHAR(64) | YES | NULL | リクエストID |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

---

## 📅 カレンダー管理テーブル

### `holiday_calendars` (祝日カレンダー)

**テーブルコメント:**
「祝日カレンダー：祝日情報を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `holiday_date` | DATE | NO | - | 祝日（ユニーク） |
| `holiday_name` | VARCHAR(100) | YES | NULL | 祝日名 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `company_calendars` (会社カレンダー)

**テーブルコメント:**
「会社カレンダー：会社の休日・稼働日を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `calendar_date` | DATE | NO | - | 対象日（ユニーク） |
| `is_workday` | BOOLEAN | NO | - | 稼働日フラグ（true=稼働日、false=休日） |
| `description` | VARCHAR(200) | YES | NULL | 説明 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `original_delivery_calendars` (オリジナル配信日カレンダー)

**テーブルコメント:**
「オリジナル配信日カレンダー：特定の配信日を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `delivery_date` | DATE | NO | - | 配信日（ユニーク） |
| `description` | VARCHAR(200) | YES | NULL | 説明 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

## 🤖 RPA・自動化テーブル

### `rpa_run_groups` (RPAランググループ)

**テーブルコメント:**
「RPAランググループ：Step3のグルーピング結果（Runグループ）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `rpa_type` | VARCHAR(50) | NO | 'material_delivery_note' | RPA種別 |
| `grouping_method` | VARCHAR(50) | NO | - | グルーピング方法 |
| `max_items_per_run` | INTEGER | YES | NULL | Run当たり最大アイテム数 |
| `planned_run_count` | INTEGER | YES | NULL | 計画Run数 |
| `created_by_user_id` | BIGINT | YES | NULL | 作成ユーザーID |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

---

### `rpa_runs` (RPA実行記録)

**テーブルコメント:**
「RPA実行記録：素材納品書発行ワークフローの実行記録（親テーブル）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `rpa_type` | VARCHAR(50) | NO | 'material_delivery_note' | RPA種別 |
| `status` | VARCHAR(30) | NO | 'downloaded' | ステータス（downloaded/step2_done/external_done/step4_done/cancelled） |
| `run_group_id` | BIGINT | YES | NULL | RPAランググループID |
| `progress_percent` | FLOAT | YES | NULL | 進捗率（%） |
| `estimated_minutes` | INTEGER | YES | NULL | 推定所要時間（分） |
| `paused_at` | DATETIME | YES | NULL | 一時停止日時 |
| `cancelled_at` | DATETIME | YES | NULL | キャンセル日時 |
| `data_start_date` | DATE | YES | NULL | データ開始日 |
| `data_end_date` | DATE | YES | NULL | データ終了日 |
| `started_at` | DATETIME | YES | NULL | 開始日時 |
| `started_by_user_id` | BIGINT | YES | NULL | 開始ユーザーID |
| `step2_executed_at` | DATETIME | YES | NULL | Step2実行日時 |
| `step2_executed_by_user_id` | BIGINT | YES | NULL | Step2実行ユーザーID |
| `external_done_at` | DATETIME | YES | NULL | 外部処理完了日時 |
| `external_done_by_user_id` | BIGINT | YES | NULL | 外部処理完了ユーザーID |
| `step4_executed_at` | DATETIME | YES | NULL | Step4実行日時 |
| `customer_id` | BIGINT | YES | NULL | 顧客ID |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `rpa_run_items` (RPA実行明細)

**テーブルコメント:**
「RPA実行明細：CSVの各行に対応する実行明細（子テーブル）」

**注:** このテーブルはカラムが多数（40以上）あるため、主要なカラムのみ記載します。全カラムのコメントが必要な場合は別途追加します。

主要カラム:
- `id` | BIGSERIAL | NO | - | ID（主キー）
- `run_id` | BIGINT | NO | - | RPA実行記録ID
- `row_no` | INTEGER | NO | - | 行番号（CSV内の行番号）
- `status` | VARCHAR(50) | YES | NULL | ステータス
- `result_status` | VARCHAR(20) | YES | NULL | 結果ステータス（pending/success/failure/error）
- `result_message` | TEXT | YES | NULL | 結果メッセージ
- `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時
- `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時

*(その他、jiku_code, layer_code, customer_part_no, delivery_date等、業務固有のカラムが多数)*

---

### `rpa_run_events` (RPAイベントログ)

**テーブルコメント:**
「RPAイベントログ：Run制御イベントを記録」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `run_id` | BIGINT | NO | - | RPA実行記録ID |
| `event_type` | VARCHAR(50) | NO | - | イベント種別 |
| `message` | TEXT | YES | NULL | メッセージ |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `created_by_user_id` | BIGINT | YES | NULL | 作成ユーザーID |

---

### `rpa_run_item_attempts` (RPA再試行履歴)

**テーブルコメント:**
「RPA再試行履歴：失敗アイテムの再試行履歴を記録」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `run_item_id` | BIGINT | NO | - | RPA実行明細ID |
| `attempt_no` | INTEGER | NO | - | 試行回数 |
| `status` | VARCHAR(20) | NO | - | ステータス |
| `error_code` | VARCHAR(100) | YES | NULL | エラーコード |
| `error_message` | TEXT | YES | NULL | エラーメッセージ |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

---

### `rpa_run_fetches` (RPA進度実績取得ログ)

**テーブルコメント:**
「RPA進度実績取得ログ：Step1の進度実績取得結果を記録」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `rpa_type` | VARCHAR(50) | NO | 'material_delivery_note' | RPA種別 |
| `start_date` | DATE | YES | NULL | 開始日 |
| `end_date` | DATE | YES | NULL | 終了日 |
| `status` | VARCHAR(20) | NO | - | ステータス |
| `item_count` | INTEGER | YES | NULL | アイテム数 |
| `run_created` | INTEGER | YES | NULL | Run作成数 |
| `run_updated` | INTEGER | YES | NULL | Run更新数 |
| `message` | TEXT | YES | NULL | メッセージ |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

---

### `rpa_jobs` (RPAジョブ管理)

**テーブルコメント:**
「RPAジョブ管理：RPAジョブの実行状況を管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | UUID | NO | - | ID（主キー、UUID） |
| `job_type` | VARCHAR(50) | NO | - | ジョブ種別（sales_order_entry等） |
| `status` | VARCHAR(20) | NO | 'pending' | ステータス（pending/validating/processing/completed/failed） |
| `target_count` | INTEGER | NO | 0 | 対象件数 |
| `success_count` | INTEGER | NO | 0 | 成功件数 |
| `failure_count` | INTEGER | NO | 0 | 失敗件数 |
| `error_message` | TEXT | YES | NULL | エラーメッセージ |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |
| `timeout_at` | DATETIME | YES | NULL | タイムアウト日時 |

---

## 📸 OCR・SmartReadテーブル

### `smartread_configs` (SmartRead設定)

**テーブルコメント:**
「SmartRead設定：SmartRead OCRの設定を保存」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `endpoint` | TEXT | NO | - | エンドポイントURL |
| `api_key` | TEXT | NO | - | APIキー |
| `template_ids` | TEXT | YES | NULL | テンプレートID（カンマ区切り） |
| `export_type` | VARCHAR(20) | NO | 'json' | エクスポート形式（json/csv） |
| `aggregation_type` | VARCHAR(50) | YES | NULL | 集約タイプ |
| `watch_dir` | TEXT | YES | NULL | 監視ディレクトリ |
| `export_dir` | TEXT | YES | NULL | エクスポートディレクトリ |
| `input_exts` | VARCHAR(100) | YES | 'pdf,png,jpg,jpeg' | 入力ファイル拡張子 |
| `name` | VARCHAR(100) | NO | 'default' | 設定名 |
| `description` | TEXT | YES | NULL | 説明 |
| `is_active` | BOOLEAN | NO | TRUE | 有効フラグ |
| `is_default` | BOOLEAN | NO | FALSE | デフォルト設定フラグ |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `smartread_tasks` (SmartReadタスク管理)

**テーブルコメント:**
「SmartReadタスク管理：SmartReadタスクの管理」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `config_id` | BIGINT | NO | - | SmartRead設定ID |
| `task_id` | VARCHAR(255) | NO | - | タスクID（ユニーク） |
| `task_date` | DATE | NO | - | タスク日付 |
| `name` | VARCHAR(255) | YES | NULL | タスク名 |
| `state` | VARCHAR(50) | YES | NULL | 状態 |
| `synced_at` | DATETIME | YES | NULL | 同期日時 |
| `skip_today` | BOOLEAN | NO | FALSE | 本日スキップフラグ |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

---

### `smartread_requests` (SmartReadリクエスト管理)

**テーブルコメント:**
「SmartReadリクエスト管理：requestId/resultsルートで全自動化」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `request_id` | VARCHAR(255) | NO | - | リクエストID（ユニーク） |
| `task_id_ref` | BIGINT | YES | NULL | タスクID参照（smartread_tasks） |
| `task_id` | VARCHAR(255) | NO | - | タスクID |
| `task_date` | DATE | NO | - | タスク日付 |
| `config_id` | BIGINT | NO | - | SmartRead設定ID |
| `filename` | VARCHAR(500) | YES | NULL | ファイル名 |
| `num_of_pages` | INTEGER | YES | NULL | ページ数 |
| `submitted_at` | DATETIME | NO | CURRENT_TIMESTAMP | 送信日時 |
| `state` | VARCHAR(50) | NO | 'PENDING' | 状態（PENDING/PROCESSING/COMPLETED/FAILED） |
| `result_json` | JSONB | YES | NULL | 結果JSON |
| `error_message` | TEXT | YES | NULL | エラーメッセージ |
| `completed_at` | DATETIME | YES | NULL | 完了日時 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

---

### `smartread_wide_data` (SmartRead横持ちデータ)

**テーブルコメント:**
「SmartRead横持ちデータ：exportから取得したCSV行を保存（生データ）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `config_id` | BIGINT | NO | - | SmartRead設定ID |
| `task_id` | VARCHAR(255) | NO | - | タスクID |
| `task_date` | DATE | NO | - | タスク日付 |
| `export_id` | VARCHAR(255) | YES | NULL | エクスポートID |
| `request_id_ref` | BIGINT | YES | NULL | リクエストID参照（smartread_requests） |
| `filename` | VARCHAR(500) | YES | NULL | ファイル名 |
| `row_index` | INTEGER | NO | - | 行インデックス |
| `content` | JSONB | NO | '{}' | コンテンツ（JSON形式） |
| `row_fingerprint` | VARCHAR(64) | NO | - | 行フィンガープリント（重複防止用ハッシュ） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

**ユニーク制約:** (config_id, task_date, row_fingerprint)

---

### `smartread_long_data` (SmartRead縦持ちデータ)

**テーブルコメント:**
「SmartRead縦持ちデータ：横持ちデータを変換した業務データ」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `wide_data_id` | BIGINT | YES | NULL | 横持ちデータID（smartread_wide_data参照） |
| `config_id` | BIGINT | NO | - | SmartRead設定ID |
| `task_id` | VARCHAR(255) | NO | - | タスクID |
| `task_date` | DATE | NO | - | タスク日付 |
| `request_id_ref` | BIGINT | YES | NULL | リクエストID参照（smartread_requests） |
| `row_index` | INTEGER | NO | - | 行インデックス |
| `content` | JSONB | NO | '{}' | コンテンツ（JSON形式） |
| `status` | VARCHAR(20) | NO | 'PENDING' | ステータス（PENDING/IMPORTED/ERROR/PROCESSING） |
| `error_reason` | TEXT | YES | NULL | エラー理由 |
| `rpa_job_id` | UUID | YES | NULL | RPAジョブID |
| `sap_order_no` | VARCHAR(50) | YES | NULL | SAP受注番号 |
| `verification_result` | JSONB | YES | NULL | 検証結果（JSON形式） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

---

### `smartread_long_data_completed` (SmartRead縦持ちデータ完了済み)

**テーブルコメント:**
「SmartRead縦持ちデータ完了済み：完了済みアーカイブ（FK制約なし）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `original_id` | BIGINT | YES | NULL | 元ID（smartread_long_data） |
| `wide_data_id` | BIGINT | YES | NULL | 横持ちデータID（FK制約なし） |
| `config_id` | BIGINT | NO | - | SmartRead設定ID（FK制約なし） |
| `task_id` | VARCHAR(255) | NO | - | タスクID |
| `task_date` | DATE | NO | - | タスク日付 |
| `request_id_ref` | BIGINT | YES | NULL | リクエストID参照（FK制約なし） |
| `row_index` | INTEGER | NO | - | 行インデックス |
| `content` | JSONB | NO | '{}' | コンテンツ（JSON形式） |
| `status` | VARCHAR(20) | NO | 'COMPLETED' | ステータス |
| `sap_order_no` | VARCHAR(50) | YES | NULL | SAP受注番号 |
| `completed_at` | DATETIME | NO | CURRENT_TIMESTAMP | 完了日時 |
| `created_at` | DATETIME | NO | - | 作成日時 |

---

### `smartread_export_history` (SmartReadエクスポート履歴)

**テーブルコメント:**
「SmartReadエクスポート履歴：エクスポート処理の履歴を記録」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `config_id` | BIGINT | NO | - | SmartRead設定ID |
| `task_id` | VARCHAR(255) | NO | - | タスクID |
| `export_id` | VARCHAR(255) | NO | - | エクスポートID |
| `task_date` | DATE | NO | - | タスク日付 |
| `filename` | VARCHAR(500) | YES | NULL | ファイル名 |
| `wide_row_count` | INTEGER | NO | 0 | 横持ちデータ行数 |
| `long_row_count` | INTEGER | NO | 0 | 縦持ちデータ行数 |
| `status` | VARCHAR(20) | NO | 'SUCCESS' | ステータス（SUCCESS/FAILED） |
| `error_message` | TEXT | YES | NULL | エラーメッセージ |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

---

### `smartread_pad_runs` (SmartRead PAD互換フロー実行記録)

**テーブルコメント:**
「SmartRead PAD互換フロー実行記録：工程追跡用」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `run_id` | VARCHAR(36) | NO | - | ランID（UUID、ユニーク） |
| `config_id` | BIGINT | NO | - | SmartRead設定ID |
| `status` | VARCHAR(20) | NO | 'RUNNING' | ステータス（RUNNING/SUCCEEDED/FAILED/STALE） |
| `step` | VARCHAR(30) | NO | 'CREATED' | ステップ |
| `task_id` | VARCHAR(255) | YES | NULL | タスクID |
| `export_id` | VARCHAR(255) | YES | NULL | エクスポートID |
| `filenames` | JSONB | YES | NULL | ファイル名リスト（JSON配列） |
| `wide_data_count` | INTEGER | NO | 0 | 横持ちデータ件数 |
| `long_data_count` | INTEGER | NO | 0 | 縦持ちデータ件数 |
| `error_message` | TEXT | YES | NULL | エラーメッセージ |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |
| `heartbeat_at` | DATETIME | NO | CURRENT_TIMESTAMP | ハートビート日時 |
| `completed_at` | DATETIME | YES | NULL | 完了日時 |
| `retry_count` | INTEGER | NO | 0 | リトライ回数 |
| `max_retries` | INTEGER | NO | 3 | 最大リトライ回数 |

---

### `ocr_result_edits` (OCR結果編集)

**テーブルコメント:**
「OCR結果編集：OCR結果の手入力編集内容を保存」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `smartread_long_data_id` | BIGINT | NO | - | SmartRead縦持ちデータID（ユニーク） |
| `lot_no_1` | VARCHAR(100) | YES | NULL | ロット番号1 |
| `quantity_1` | VARCHAR(50) | YES | NULL | 数量1 |
| `lot_no_2` | VARCHAR(100) | YES | NULL | ロット番号2 |
| `quantity_2` | VARCHAR(50) | YES | NULL | 数量2 |
| `inbound_no` | VARCHAR(100) | YES | NULL | 入荷番号 |
| `inbound_no_2` | VARCHAR(100) | YES | NULL | 入荷番号2 |
| `shipping_date` | DATE | YES | NULL | 出荷日 |
| `shipping_slip_text` | TEXT | YES | NULL | 出荷表テキスト |
| `shipping_slip_text_edited` | BOOLEAN | NO | FALSE | 出荷表テキスト編集済みフラグ |
| `jiku_code` | VARCHAR(100) | YES | NULL | 次区コード |
| `material_code` | VARCHAR(100) | YES | NULL | 材料コード |
| `delivery_quantity` | VARCHAR(100) | YES | NULL | 納入数量 |
| `delivery_date` | VARCHAR(100) | YES | NULL | 納入日 |
| `process_status` | VARCHAR(20) | NO | 'pending' | 処理ステータス（pending/downloaded/sap_linked/completed） |
| `error_flags` | JSONB | NO | '{}' | エラーフラグ（JSON形式） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `ocr_result_edits_completed` (OCR結果編集完了済み)

**テーブルコメント:**
「OCR結果編集完了済み：完了済みアーカイブ（FK制約なし）」

*(カラム構成は ocr_result_edits とほぼ同じだが、FK制約なし。詳細は割愛)*

---

## ☁️ Cloud Flow・SAP連携テーブル

### `cloud_flow_configs` (Cloud Flow設定)

**テーブルコメント:**
「Cloud Flow設定：Cloud FlowのURL等の設定を保存」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `config_key` | VARCHAR(100) | NO | - | 設定キー（ユニーク） |
| `config_value` | TEXT | NO | - | 設定値 |
| `description` | TEXT | YES | NULL | 説明 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `cloud_flow_jobs` (Cloud Flowジョブ履歴)

**テーブルコメント:**
「Cloud Flowジョブ履歴：Cloud Flow実行履歴を記録」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `job_type` | VARCHAR(50) | NO | - | ジョブ種別（progress_download等） |
| `status` | VARCHAR(30) | NO | 'pending' | ステータス（pending/running/completed/failed） |
| `start_date` | DATE | NO | - | 開始日 |
| `end_date` | DATE | NO | - | 終了日 |
| `requested_by_user_id` | BIGINT | YES | NULL | 要求ユーザーID |
| `requested_at` | DATETIME | NO | CURRENT_TIMESTAMP | 要求日時 |
| `started_at` | DATETIME | YES | NULL | 開始日時 |
| `completed_at` | DATETIME | YES | NULL | 完了日時 |
| `result_message` | TEXT | YES | NULL | 結果メッセージ |
| `error_message` | TEXT | YES | NULL | エラーメッセージ |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `sap_connections` (SAP接続情報)

**テーブルコメント:**
「SAP接続情報：SAP ERPへの接続情報を管理（本番/テスト環境切り替えサポート）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `name` | VARCHAR(100) | NO | - | 接続名（本番/テスト等） |
| `environment` | VARCHAR(20) | NO | - | 環境識別子（production/test） |
| `description` | TEXT | YES | NULL | 説明 |
| `ashost` | VARCHAR(255) | NO | - | SAPホスト |
| `sysnr` | VARCHAR(10) | NO | - | システム番号 |
| `client` | VARCHAR(10) | NO | - | クライアント番号 |
| `user_name` | VARCHAR(100) | NO | - | ユーザー名 |
| `passwd_encrypted` | TEXT | NO | - | 暗号化パスワード |
| `lang` | VARCHAR(10) | NO | 'JA' | 言語 |
| `default_bukrs` | VARCHAR(10) | NO | '10' | デフォルト会社コード |
| `default_kunnr` | VARCHAR(20) | YES | NULL | デフォルト得意先コード |
| `is_active` | BOOLEAN | NO | TRUE | 有効フラグ |
| `is_default` | BOOLEAN | NO | FALSE | デフォルト接続フラグ |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

### `sap_material_cache` (SAPマテリアルキャッシュ)

**テーブルコメント:**
「SAPマテリアルキャッシュ：Z_SCM1_RFC_MATERIAL_DOWNLOADからのET_DATAをキャッシュ」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `connection_id` | BIGINT | NO | - | SAP接続ID |
| `zkdmat_b` | VARCHAR(100) | NO | - | 先方品番（SAPのZKDMAT_B） |
| `kunnr` | VARCHAR(20) | NO | - | 得意先コード |
| `raw_data` | JSONB | NO | '{}' | ET_DATAの生データ（ZKDMAT_B以外の列、JSON形式） |
| `fetched_at` | DATETIME | NO | CURRENT_TIMESTAMP | 取得日時 |
| `fetch_batch_id` | VARCHAR(50) | YES | NULL | 取得バッチID（同一取得を識別） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

**ユニーク制約:** (connection_id, zkdmat_b, kunnr)

---

### `sap_fetch_logs` (SAP取得ログ)

**テーブルコメント:**
「SAP取得ログ：SAP RFC呼び出しのログを記録（デバッグ・監査用）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `connection_id` | BIGINT | NO | - | SAP接続ID |
| `fetch_batch_id` | VARCHAR(50) | NO | - | 取得バッチID |
| `rfc_name` | VARCHAR(100) | NO | - | RFC名 |
| `params` | JSONB | NO | '{}' | 呼び出しパラメータ（JSON形式） |
| `status` | VARCHAR(20) | NO | - | ステータス（SUCCESS/ERROR） |
| `record_count` | INTEGER | YES | NULL | 取得件数 |
| `error_message` | TEXT | YES | NULL | エラーメッセージ |
| `duration_ms` | INTEGER | YES | NULL | 処理時間（ミリ秒） |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

---

## 📋 出荷マスタテーブル

### `shipping_master_raw` (出荷用マスタ生データ)

**テーブルコメント:**
「出荷用マスタ生データ：監査・完全再現用（Excel「マスタ」シート20列をそのまま保持）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `customer_code` | VARCHAR(50) | YES | NULL | 顧客コード |
| `material_code` | VARCHAR(50) | YES | NULL | 材料コード |
| `jiku_code` | VARCHAR(50) | YES | NULL | 次区コード |
| `warehouse_code` | VARCHAR(50) | YES | NULL | 倉庫コード |
| `delivery_note_product_name` | TEXT | YES | NULL | 納品書製品名 |
| `customer_part_no` | VARCHAR(100) | YES | NULL | 得意先品番 |
| `maker_part_no` | VARCHAR(100) | YES | NULL | メーカー品番 |
| `order_flag` | VARCHAR(20) | YES | NULL | 発注フラグ |
| `maker_code` | VARCHAR(50) | YES | NULL | メーカーコード |
| `maker_name` | VARCHAR(100) | YES | NULL | メーカー名 |
| `supplier_code` | VARCHAR(50) | YES | NULL | 仕入先コード |
| `staff_name` | VARCHAR(100) | YES | NULL | 担当者名 |
| `delivery_place_abbr` | VARCHAR(100) | YES | NULL | 納入先略称 |
| `delivery_place_code` | VARCHAR(50) | YES | NULL | 納入先コード |
| `delivery_place_name` | VARCHAR(200) | YES | NULL | 納入先名 |
| `shipping_warehouse` | VARCHAR(100) | YES | NULL | 出荷倉庫 |
| `shipping_slip_text` | TEXT | YES | NULL | 出荷表テキスト |
| `transport_lt_days` | INTEGER | YES | NULL | 輸送リードタイム（日） |
| `order_existence` | VARCHAR(20) | YES | NULL | 発注有無 |
| `remarks` | TEXT | YES | NULL | 備考 |
| `row_index` | INTEGER | NO | - | 行インデックス（Excel行番号） |
| `import_batch_id` | VARCHAR(50) | YES | NULL | インポートバッチID |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

---

### `shipping_master_curated` (出荷用マスタ整形済み)

**テーブルコメント:**
「出荷用マスタ整形済み：アプリ参照用（独立データ、既存マスタへのFK制約なし）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `raw_id` | BIGINT | YES | NULL | 生データID（shipping_master_raw参照） |
| `customer_code` | VARCHAR(50) | NO | - | 顧客コード（業務キー） |
| `material_code` | VARCHAR(50) | NO | - | 材料コード（業務キー） |
| `jiku_code` | VARCHAR(50) | NO | - | 次区コード（業務キー） |
| `warehouse_code` | VARCHAR(50) | YES | NULL | 倉庫コード |
| `customer_name` | VARCHAR(100) | YES | NULL | 顧客名 |
| `has_duplicate_warning` | BOOLEAN | NO | FALSE | 重複警告フラグ |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |
| *(その他、正規化されたマスタ値のカラム多数)* |

**ユニーク制約:** (customer_code, material_code, jiku_code)

---

### `order_register_rows` (受注登録結果)

**テーブルコメント:**
「受注登録結果：OCR + マスタ参照の結果を保存（Excel出力・React表示の単一ソース）」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `long_data_id` | BIGINT | YES | NULL | SmartRead縦持ちデータID（FK制約なし） |
| `curated_master_id` | BIGINT | YES | NULL | 整形済みマスタID（FK制約なし） |
| `task_date` | DATE | NO | - | タスク日付 |
| `status` | VARCHAR(20) | NO | 'PENDING' | ステータス（PENDING/EXPORTED/ERROR） |
| `error_message` | TEXT | YES | NULL | エラーメッセージ |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |
| *(その他、OCR結果とマスタ値のカラム多数)* |

---

### `layer_code_mappings` (層別コードマッピング)

**テーブルコメント:**
「層別コードマッピング：層別コード → メーカー名の変換マスタ」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `layer_code` | VARCHAR(50) | NO | - | 層別コード（主キー） |
| `maker_name` | VARCHAR(100) | NO | - | メーカー名 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

## 🔧 その他のテーブル

### `seed_snapshots` (スナップショット)

**テーブルコメント:**
「スナップショット：テストデータ生成のパラメータとプロファイルを保存」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | INTEGER | NO | - | ID（主キー） |
| `name` | VARCHAR(255) | NO | - | スナップショット名 |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `params_json` | JSONB | NO | '{}' | 展開後の最終パラメータ（profile解決後、JSON形式） |
| `profile_json` | JSONB | YES | NULL | 使用したプロファイル設定（JSON形式） |
| `csv_dir` | TEXT | YES | NULL | CSVエクスポートディレクトリ（オプション） |
| `summary_json` | JSONB | YES | NULL | 生成結果のサマリ（件数、検証結果など、JSON形式） |

---

### `missing_mapping_events` (未設定イベント)

**テーブルコメント:**
「未設定イベント：自動セット失敗時の警告記録」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `id` | BIGSERIAL | NO | - | ID（主キー） |
| `customer_id` | BIGINT | YES | NULL | 顧客ID |
| `product_group_id` | BIGINT | YES | NULL | 製品グループID |
| `supplier_id` | BIGINT | YES | NULL | 仕入先ID |
| `event_type` | VARCHAR(50) | NO | - | イベント種別（delivery_place_not_found/jiku_mapping_not_found等） |
| `occurred_at` | DATETIME | NO | CURRENT_TIMESTAMP | 発生日時 |
| `context_json` | JSONB | YES | NULL | エラー発生時のコンテキスト（リクエスト内容等、JSON形式） |
| `created_by` | BIGINT | YES | NULL | 作成ユーザーID |
| `resolved_at` | DATETIME | YES | NULL | 解決日時（NULL=未解決） |
| `resolved_by` | BIGINT | YES | NULL | 解決ユーザーID |
| `resolution_note` | TEXT | YES | NULL | 解決メモ |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |

---

### `product_warehouse` (製品グループ×倉庫管理)

**テーブルコメント:**
「製品グループ×倉庫管理：在庫一覧の母集団として使用」

| カラム名 | 型 | Null | デフォルト | コメント（論理名称） |
|---------|-----|------|-----------|---------------------|
| `product_group_id` | BIGINT | NO | - | 仕入先品目ID（メーカー品番への参照、複合PK） |
| `warehouse_id` | BIGINT | NO | - | 倉庫ID（複合PK） |
| `is_active` | BOOLEAN | NO | TRUE | 有効フラグ |
| `created_at` | DATETIME | NO | CURRENT_TIMESTAMP | 作成日時 |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | 更新日時 |

---

## 📊 ビュー（Read-only）

以下のビューはテーブル定義ではありませんが、参照用として記載します。

- `v_lot_current_stock` - ロット現在在庫ビュー
- `v_customer_daily_products` - 顧客日次製品ビュー
- `v_lot_available_qty` - ロット利用可能数量ビュー
- `v_order_line_context` - 受注明細コンテキストビュー
- `v_customer_code_to_id` - 顧客コード→IDマッピングビュー
- `v_delivery_place_code_to_id` - 納入先コード→IDマッピングビュー
- `v_forecast_order_pairs` - 予測・受注ペアリングビュー
- `v_product_code_to_id` - 製品コード→IDマッピングビュー
- `v_candidate_lots_by_order_line` - 受注明細別候補ロットビュー
- `v_lot_details` - ロット詳細ビュー
- `v_order_line_details` - 受注明細詳細ビュー
- `v_inventory_summary` - 在庫サマリビュー

*ビューはテーブルではないため、カラムコメントは省略します。必要に応じて追加可能です。*

---

## ✅ 次のステップ

1. **確認・修正**: このドキュメントの内容を確認し、修正箇所をお知らせください。
2. **モデル反映**: 確定後、SQLAlchemyモデルに `comment="..."` を追加します。
3. **マイグレーション作成**: Alembicマイグレーションで `COMMENT ON TABLE/COLUMN` を実行します。
4. **ER図生成**: `eralchemy2` または `tbls` でER図を自動生成します。
5. **ヘルプページ作成**: フロントエンドのヘルプ機能にスキーマページを追加します。

---

**Generated:** 2026-01-31
**Author:** Claude (AI Assistant)
**Version:** Draft v1.0
