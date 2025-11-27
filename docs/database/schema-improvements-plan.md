# 最終的なデータモデル改善案（SAP商品マスタ対応）

## SAP商品マスタの構造理解

```
SAPの1レコード = {
  仕入元 (supplier)
  製品 (product)
  得意先 (customer)
  次区 (jiku)
  出荷表テキスト (shipping_document_template)
  備考 (notes)
}
```

**問題**: 実際は1製品に複数の次区が必要だが、SAPでは1つしか登録できない

---

## 提案する改善（統合版）

### 1. `customer_items` テーブル拡張

**追加カラム**:
```sql
ALTER TABLE customer_items 
ADD COLUMN shipping_document_template TEXT,  -- 出荷表テキスト定型文
ADD COLUMN sap_notes TEXT;                   -- SAP備考欄
```

**更新後の構造**:
```sql
CREATE TABLE customer_items (
    customer_id BIGINT,           -- 得意先
    external_product_code VARCHAR, -- 先方品番（主キー）
    product_id BIGINT,            -- 製品（メーカー品番）
    supplier_id BIGINT,           -- 仕入元
    base_unit VARCHAR,
    pack_unit VARCHAR,
    pack_quantity INTEGER,
    special_instructions TEXT,
    shipping_document_template TEXT,  -- ✅ NEW: 出荷表テキスト定型文
    sap_notes TEXT,                   -- ✅ NEW: SAP備考欄
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY (customer_id, external_product_code)
);
```

### 2. 次区コードマッピング（複数対応）

**新規テーブル**: `customer_item_jiku_mappings`

```sql
CREATE TABLE customer_item_jiku_mappings (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    external_product_code VARCHAR(100) NOT NULL,
    jiku_code VARCHAR(50) NOT NULL,
    delivery_place_id BIGINT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_customer_item_jiku_customer_item
        FOREIGN KEY (customer_id, external_product_code)
        REFERENCES customer_items(customer_id, external_product_code)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_customer_item_jiku_delivery_place
        FOREIGN KEY (delivery_place_id)
        REFERENCES delivery_places(id)
        ON DELETE CASCADE,
    
    CONSTRAINT uq_customer_item_jiku
        UNIQUE (customer_id, external_product_code, jiku_code)
);

COMMENT ON TABLE customer_item_jiku_mappings IS 
'顧客商品-次区マッピング（1商品に複数の次区コード対応）';
```

### 3. `order_lines` テーブル拡張（出荷指示用）

**追加カラム**:
```sql
ALTER TABLE order_lines
ADD COLUMN shipping_document_text TEXT;  -- 実際の出荷表テキスト（ロット番号を記入）
```

**使用フロー**:
1. 受注作成時: `customer_items.shipping_document_template` から定型文をコピー
2. ロット引当後: ロット番号を `shipping_document_text` に記入
3. 印刷: 工場へ出荷指示

---

## データフロー全体像

### 受注処理フロー

```
1. SAP連携 or 手動入力
   ↓
2. customer_items から shipping_document_template を取得
   ↓
3. order_lines.shipping_document_text に定型文をセット
   ↓
4. ロット引当実行
   ↓
5. 引当完了後、ロット番号を shipping_document_text に追記
   ↓
6. 印刷 → 工場へ出荷指示
```

### 次区コード→納入先の解決

```sql
-- 受注データに次区コードが含まれる場合
SELECT delivery_place_id
FROM customer_item_jiku_mappings
WHERE customer_id = ?
  AND external_product_code = ?
  AND jiku_code = ?
LIMIT 1;
```

---

## 最終的な一括改善リスト

### A. スキーマ変更

1. ✅ `version_id` → `version` (lots, order_lines)
2. ✅ `user_supplier_assignments` テーブル追加
3. ✅ `customer_items` に出荷表テキスト追加
4. ✅ `customer_item_jiku_mappings` テーブル追加
5. ✅ `order_lines` に `shipping_document_text` 追加

### B. ビュー修正

1. `v_lots_with_master`: LEFT JOIN、version修正
2. `v_order_line_details`: jiku_code, external_product_code, shipping_document_text 追加
3. `v_supplier_code_to_id`: 新規作成
4. `v_warehouse_code_to_id`: 新規作成
5. `v_user_supplier_assignments`: 新規作成
6. `v_customer_item_jiku_mappings`: 新規作成
7. `v_candidate_lots_by_order_line`: 予測データJOIN削除

### C. 用語集・ドキュメント

1. 業務用語集作成
2. モデルへのコメント追加
3. README更新

---

## 推定作業時間（全体）

- スキーマ変更: 2時間
- ビュー修正: 2時間
- モデル更新: 2時間
- API実装: 3時間
- フロントエンド: 4時間
- ドキュメント: 1時間

**合計**: 14時間（2日）

---

## 優先順位

### 今回実施（最優先）
- version変更
- 用語集・ドキュメント化
- ビュー修正（重大な問題のみ）

### 次回実施（Phase 3前）
- user_supplier_assignments
- customer_items拡張
- customer_item_jiku_mappings
- order_lines拡張

---

現在のDBには次区コードデータがない（全部NULL）ので、
まずは最小限の改善（version + ドキュメント + ビュー修正）を実施して、
次区コードマッピングは来週のテスト時に合わせて実装する方が良さそうです。
