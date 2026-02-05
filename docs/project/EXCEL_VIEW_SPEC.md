# Excel View 現行仕様（Phase 1-11）

**更新日**: 2026-02-05
**対象**: Excel View（材料ロット管理/個別）

---

## 1. 主要UI構成

- **ページ**: `frontend/src/features/inventory/components/excel-view/ExcelViewPage.tsx`
- **主要ブロック**:
  - ロット情報（LotInfoGroups）
  - 入庫数/在庫数（BigStatColumn）
  - 納入先テーブル（ShipmentTable）
  - 日付グリッド（DateGrid）
  - ヘッダー: 収容数・保証期間・先方品番（customer_items参照）
  - ロット情報: 発注NOは `lot_receipts.order_no`（手入力）

---

## 2. 取得/更新API

### 2.1 Excel View取得
- `GET /api/v2/inventory/excel-view/{product_id}`
- `GET /api/v2/inventory/excel-view/{product_id}/customer-items/{customer_item_id}`

### 2.2 引当（数量/コメント/手動出荷日/COA日付）一括更新
- `POST /api/v2/forecast/suggestions/batch`
- 対象フィールド:
  - `quantity`
  - `coa_issue_date`
  - `comment`
  - `manual_shipment_date`

### 2.3 納入先追加
- `POST /api/delivery-places`
- `POST /api/delivery-settings`

### 2.4 ロット分割
- 10.2: `POST /api/lots/{lot_id}/split`
- 10.3: `POST /api/lots/{lot_id}/smart-split`

### 2.5 入庫数調整（理由必須）
- `PUT /api/lots/{lot_id}/quantity`

---

## 3. Phase別の主要仕様

### Phase 1-4: 基盤
- Excel Viewの基盤UIとデータ表示
- ロット情報/納入先/日付グリッドの表示

### Phase 5-8: 編集
- セル内数量編集（オートセーブ）
- COA日付の設定
- 納入先追加ダイアログ
- 日付列追加

### Phase 9: 拡張
- ロット備考（`lot_receipts.remarks`）
- 数量別コメント（`allocation_suggestions.comment`）
- 手動出荷日（`allocation_suggestions.manual_shipment_date`）
- ページメモ（`customer_item_delivery_settings.notes`）

### Phase 10: 分割
- **10.2 基本分割**: 指定数量で分割（合計一致必須）
- **10.3 スマート分割**:
  - 2分割または3分割
  - 3ステップUI（分割数選択 → 振り分け → プレビュー）
  - 既存割当の転送（comment/coa/manual_shipment_date含む）

### Phase 11: 理由付き調整
- 入庫数変更時に理由必須
- 理由テンプレート選択 + 「その他」詳細入力
- 監査証跡: `adjustments` に記録

---

## 4. 重要なバリデーション/制約

- **分割**: `consumed_quantity > 0` のロットは分割不可
- **分割後の入荷日**: 同一ロット番号・同一入荷日のロットは作成不可  
  → 分割時は新規ロットに別入荷日を自動付与（翌日以降）
- **スマート分割**:
  - `target_lot_index` は 0..(split_count-1)
  - 指定数量はDB上の割当数量と一致必須
  - 同一の納品予定が重複指定不可
  - 割当合計が `current_quantity` を超えない
- **入庫数調整**:
  - `new_quantity >= consumed_quantity`
  - `reason` 必須

---

## 5. 既知の仕様制限（現行）

- スマート分割は **2分割 / 3分割のみ**
- 未割り当て数量は「ロット1（元）」に残る（プレビューで警告）
- 納入先5件以下の罫線揃い問題は未解消

---

## 6. レビュー結果

- 詳細は `docs/project/COMPLETE_EXCEL_VIEW_REVIEW.md` を参照
