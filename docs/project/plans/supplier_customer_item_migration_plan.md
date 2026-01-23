# 仕入先起点・得意先起点の在庫/受注モデル移行計画（DDL & API設計付き）

## 0. 目的
在庫（入荷）は **supplier_id + maker_part_no** をキーとする **supplier_items** で一意管理し、受注は **customer_id + customer_part_no** をキーとする **customer_items** で一意管理する。customer_items.supplier_item_id は NULL を許容し、在庫を扱う処理（引当・出荷・返品）はマッピング必須とする。

---

## 1. 現状調査結果（影響範囲）

### 1.1 主要モデル/テーブル
- **products**: maker_part_code をユニーク識別子として利用。customer_part_no/maker_item_code を保持。
- **customer_items**: (customer_id, external_product_code) の複合PKで product_id と supplier_id を保持。
- **order_lines**: product_id と external_product_code（OCR元品番）を保持。
- **lot_receipts**: product_id と supplier_id を持つ入荷実体。
- **lot_master**: (lot_number, product_id) で名寄せ。
- **lot_reservations**: 引当/予約の単一ソース。

### 1.2 影響を受ける主要ファイル（抜粋）

**バックエンド**
- Models: `backend/app/infrastructure/persistence/models/masters_models.py`
- Models: `backend/app/infrastructure/persistence/models/lot_receipt_models.py`
- Models: `backend/app/infrastructure/persistence/models/lot_master_model.py`
- Models: `backend/app/infrastructure/persistence/models/orders_models.py`
- Models: `backend/app/infrastructure/persistence/models/lot_reservations_model.py`
- Views: `backend/app/infrastructure/persistence/models/views_models.py`
- Schemas: `backend/app/presentation/schemas/orders/orders_schema.py`
- Schemas: `backend/app/presentation/schemas/inventory/inventory_schema.py`

**フロントエンド**
- `frontend/src/features/products/components/ProductForm.tsx`
- `frontend/src/features/customer-items/components/CustomerItemForm.tsx`
- `frontend/src/features/orders/*`（受注明細表示・引当UI）
- `frontend/src/features/inventory/*`（在庫表示/ロット表示）

### 1.3 現状の関係図（簡易）
```
Customer ──< customer_items (customer_id, external_product_code) >── Product
Order ──< OrderLine(product_id, external_product_code)
Product ──< LotMaster(lot_number, product_id)
LotMaster ──< LotReceipt(product_id, supplier_id)
LotReceipt ──< LotReservation(source_type, source_id)
```

---

## 2. 目標データモデル案（確定方針に準拠）

### 2.1 コア設計方針
- **入荷キー**: `supplier_id + maker_part_no` → **supplier_items** で一意
- **受注キー**: `customer_id + customer_part_no` → **customer_items** で一意
- **customer_items.supplier_item_id**: NULL 許容（未マッピング状態を表現）
- **在庫処理（引当/出荷/返品）**: supplier_item_id 必須

### 2.2 目標エンティティ
- **supplier_items**: 仕入先品目マスタ
- **customer_items**: 得意先品目マスタ（supplier_items への任意マッピング）
- **lot_receipts / lot_master**: supplier_item_id に紐づく在庫ロット
- **lot_reservations**: 受注/在庫引当をロット起点で管理

---

## 3. DDLの具体例（サンプル）

> ※実際のマイグレーションは段階導入を前提に、NULL許容・既存カラム併存で進める。

### 3.1 supplier_items（新規）
```sql
CREATE TABLE supplier_items (
    id                  BIGSERIAL PRIMARY KEY,
    supplier_id         BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    maker_part_no       VARCHAR(100) NOT NULL,
    product_id          BIGINT NULL REFERENCES products(id) ON DELETE SET NULL,
    display_name        VARCHAR(200) NULL,
    base_unit           VARCHAR(20) NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (supplier_id, maker_part_no)
);

CREATE INDEX idx_supplier_items_supplier ON supplier_items (supplier_id);
CREATE INDEX idx_supplier_items_product ON supplier_items (product_id);
```

### 3.2 customer_items（既存拡張）
```sql
ALTER TABLE customer_items
    ADD COLUMN id BIGSERIAL;

ALTER TABLE customer_items
    ADD COLUMN supplier_item_id BIGINT NULL REFERENCES supplier_items(id) ON DELETE SET NULL;

-- 複合PKから surrogate key へ移行する場合（段階移行）
-- ALTER TABLE customer_items DROP CONSTRAINT customer_items_pkey;
-- ALTER TABLE customer_items ADD PRIMARY KEY (id);

CREATE INDEX idx_customer_items_supplier_item ON customer_items (supplier_item_id);
```

### 3.3 lot_master / lot_receipts（在庫ロット）
```sql
ALTER TABLE lot_master
    ADD COLUMN supplier_item_id BIGINT NULL REFERENCES supplier_items(id) ON DELETE SET NULL;

ALTER TABLE lot_receipts
    ADD COLUMN supplier_item_id BIGINT NULL REFERENCES supplier_items(id) ON DELETE SET NULL;

CREATE INDEX idx_lot_master_supplier_item ON lot_master (supplier_item_id);
CREATE INDEX idx_lot_receipts_supplier_item ON lot_receipts (supplier_item_id);
```

### 3.4 order_lines（任意推奨）
```sql
ALTER TABLE order_lines
    ADD COLUMN customer_item_id BIGINT NULL REFERENCES customer_items(id) ON DELETE SET NULL;

CREATE INDEX idx_order_lines_customer_item ON order_lines (customer_item_id);
```

---

## 4. APIレスポンス設計（例）

### 4.1 SupplierItem API

#### GET /api/v2/supplier-items
```json
{
  "items": [
    {
      "id": 101,
      "supplier_id": 12,
      "supplier_name": "ABC商事",
      "maker_part_no": "MKR-001",
      "product_id": 55,
      "product_code": "PRD-010oe",
      "product_name": "Brake Pad",
      "base_unit": "EA",
      "created_at": "2026-02-01T09:12:00Z",
      "updated_at": "2026-02-01T09:12:00Z"
    }
  ],
  "total": 1
}
```

#### POST /api/v2/supplier-items
```json
{
  "supplier_id": 12,
  "maker_part_no": "MKR-001",
  "product_id": 55,
  "base_unit": "EA"
}
```

### 4.2 CustomerItem API

#### GET /api/v2/customer-items
```json
{
  "items": [
    {
      "id": 301,
      "customer_id": 7,
      "customer_part_no": "CUST-ABC",
      "supplier_item_id": 101,
      "supplier_maker_part_no": "MKR-001",
      "product_id": 55,
      "product_name": "Brake Pad",
      "base_unit": "EA",
      "is_procurement_required": true,
      "shipping_slip_text": "Handle with care"
    }
  ],
  "total": 1
}
```

### 4.3 OrderLine API（引当前後）

#### GET /api/v2/order/lines
```json
{
  "items": [
    {
      "id": 9001,
      "order_id": 6001,
      "customer_id": 7,
      "customer_part_no": "CUST-ABC",
      "customer_item_id": 301,
      "supplier_item_id": 101,
      "product_id": 55,
      "product_code": "PRD-010oe",
      "order_quantity": 100,
      "unit": "EA",
      "status": "pending",
      "allocation_ready": true
    },
    {
      "id": 9002,
      "order_id": 6001,
      "customer_id": 7,
      "customer_part_no": "CUST-XYZ",
      "customer_item_id": 302,
      "supplier_item_id": null,
      "product_id": null,
      "order_quantity": 50,
      "unit": "EA",
      "status": "pending",
      "allocation_ready": false,
      "allocation_block_reason": "supplier_item_not_mapped"
    }
  ],
  "total": 2
}
```

### 4.4 Lot API（在庫ロット）

#### GET /api/v2/lot
```json
{
  "items": [
    {
      "lot_id": 8801,
      "lot_number": "LOT-2026-0001",
      "supplier_item_id": 101,
      "maker_part_no": "MKR-001",
      "received_quantity": 300,
      "remaining_quantity": 200,
      "available_quantity": 180,
      "warehouse_id": 3,
      "status": "active"
    }
  ],
  "total": 1
}
```

---

## 5. 変更タスク分割（順序付き）

### 5.1 DBマイグレーション
1. supplier_items の作成（unique: supplier_id + maker_part_no）
2. customer_items への supplier_item_id 追加（NULL許容）
3. lot_master / lot_receipts への supplier_item_id 追加
4. order_lines への customer_item_id 追加（任意だが推奨）
5. 既存ビュー（v_lot_details / v_order_line_details）を新設計で拡張

### 5.2 バックエンド
- 新規CRUD: supplier_items
- 受注/在庫APIのレスポンスに supplier_item_id を追加
- 引当処理で supplier_item_id 未設定時はエラー
- 返品処理は lot_reservations からロットへ戻す

### 5.3 フロント
- SupplierItem管理画面追加
- CustomerItem編集で supplier_item_id の任意マッピングUI
- 引当画面で「未マッピング」の明確表示
- UIラベル/変数名で maker_part_no を「仕入先/メーカー品番」と明示

### 5.4 テスト
- 単体: supplier_item 解決とNULL時のバリデーション
- 統合: 入荷→在庫→引当
- E2E: 受注→引当→出荷→返品

---

## 6. 受け入れ条件（要約）
- supplier_id + maker_part_no で入荷が登録できる
- customer_item が未マッピングの場合、引当で明確にブロックされる
- マッピング済みの customer_item は対応する supplier_item のロットから引当される
- 返品はロットへ戻り、特定customerへ固定されない

---

## 7. リスクと移行方針

### リスク
- 既存データが product_id 前提のため即時切替は破壊的
- supplier_id 不在のロット/受注が存在する可能性

### 移行方針
- **Phase 1**: NULL許容でカラム追加・後方互換維持
- **Phase 2**: マッピング補完後に supplier_item_id 必須化

---

## 8. 二段階リリース案

### 8.1 最小リリース
- supplier_items 作成
- customer_items/lot_receipts に supplier_item_id 追加
- 引当時の必須チェックのみ導入

### 8.2 フル対応
- order_lines の customer_item_id 前提化
- ビュー/API/UIを supplier_item 起点に統一
- マッピング支援UI（検索/一括割当）

---

## 9. 要確認リスト
- supplier_items と products の恒久的な関係（一本化するか）
- customer_items の surrogate key 追加可否
- 既存の OCR/CSV インポートが参照している識別子
- supplier_id が NULL の既存在庫割合
