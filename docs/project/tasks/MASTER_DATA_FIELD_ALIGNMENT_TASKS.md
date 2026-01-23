# マスタデータフィールド整合性 - 残タスク

**作成日**: 2026-01-19
**ステータス**: 🔄 進行中
**優先度**: 🔥 高（データ損失バグ修正完了、設計レビュー保留中）

---

## 完了した作業

### ✅ 1. Service層のデータ損失バグ修正

**ファイル:** `backend/app/application/services/masters/customer_items_service.py`

**問題:**
- `_enrich_item()` メソッドが16フィールドしか返さなかった（DB: 22フィールド）
- UIに表示される「出荷票テキスト」「発注の有無」などが常に空白だった

**修正内容:**
```python
# 追加したフィールド (11個)
- shipping_document_template
- sap_notes
- maker_part_no
- order_category
- is_procurement_required  # ← UIテーブル列
- shipping_slip_text       # ← UIテーブル列
- ocr_conversion_notes
- sap_supplier_code
- sap_warehouse_code
- sap_shipping_warehouse
- sap_uom
```

**影響:**
- `GET /api/masters/customer-items` が完全なデータを返すようになった
- UIテーブルの「出荷票テキスト」列が正しく表示される
- 詳細ダイアログのOCR-SAP変換タブが正しいデータを表示する

**コミット:** 含める

---

### ✅ 2. 得意先品番マッピングに編集機能を追加

**変更ファイル:**
1. `frontend/src/features/customer-items/components/CustomerItemsTable.tsx`
   - テーブル行に「編集」ボタン追加（Pencilアイコン）
   - `onEdit` propsを追加

2. `frontend/src/features/customer-items/components/CustomerItemDetailDialog.tsx`
   - 詳細ダイアログのヘッダーに「編集」ボタン追加
   - `onEdit` propsを追加

3. `frontend/src/features/customer-items/pages/CustomerItemsListPage.tsx`
   - 編集ダイアログの状態管理を追加
   - `useUpdateCustomerItem` hookを使用した更新処理
   - 編集ダイアログコンポーネントを配置

**機能:**
- テーブル行の編集ボタンをクリック → 編集フォームが開く
- 詳細ダイアログの編集ボタンをクリック → 編集フォームが開く
- 編集フォームで全フィールド（基本情報、OCR-SAP変換、SAPキャッシュ）を編集可能

**コミット:** 含める

---

### ✅ 3. 包括的な設計レビュードキュメント作成

**ファイル:** `docs/review/PRODUCT_IDENTIFICATION_DESIGN_REVIEW.md`

**内容:**
- 現在のデータベーススキーマ詳細（products, customer_items）
- フィールド使用頻度調査
  - `maker_part_code`: 133回（40ファイル）← システム全体で主要識別子
  - `customer_part_no`: 6回（5ファイル）← ほぼ未使用（表示のみ）
- ビジネス要件との乖離分析
- 4つの設計選択肢（Option A~D）
- 関連ファイル一覧
- レビュアーへの質問事項

**ユーザーの疑問:**
> 「受注時は得意先から『先方品番』で注文が来るはず。9割がた先方品番を使うと思っていたが、
> 実装では `maker_part_code` が主要識別子として133回も使われている。根本的に間違っている気がする。」

**次ステップ:** 外部レビュー必須（設計判断が必要）

**コミット:** 含める

---

## 保留中の作業

### ⚠️ 4. 商品識別子の設計レビューと修正判断

**ステータス:** 外部レビュー待ち

**レビュードキュメント:** `docs/review/PRODUCT_IDENTIFICATION_DESIGN_REVIEW.md`

**必要な判断:**
1. ビジネス要件の再確認
   - 受注時に使われる識別子は何か？（先方品番 vs メーカー品番 vs 内部ID）
   - 使用頻度の実態は？（先方品番 9割、メーカー品番 1割？）

2. `maker_part_code` の扱い
   - 現状維持：内部IDとして保持（命名変更のみ）
   - 削除：`id` のみで識別
   - 置き換え：先方品番に置き換え

3. マイグレーションの許容範囲
   - 小規模（1-5ファイル）
   - 中規模（10-20ファイル）
   - 大規模（40ファイル以上）← `maker_part_code` を変更する場合

**影響範囲（maker_part_code変更の場合）:**
- バックエンド: 40ファイル、133箇所
- フロントエンド: 多数
- データベース: マイグレーション必要

**推奨:** 別PRで対応（このPRには含めない）

---

### 📋 5. 他のマスタページの調査（編集機能）

**調査結果:**

#### 調査対象マスタページ:
1. 商品マスタ (products) - `/masters/products`
2. 得意先マスタ (customers) - `/masters/customers`
3. 仕入先マスタ (suppliers) - `/masters/suppliers`
4. 倉庫マスタ (warehouses) - `/masters/warehouses`
5. 単位換算マスタ (uom_conversions) - `/masters/uom-conversions`
6. 商品マッピング (product_mappings) - `/masters/product-mappings`

#### 確認項目:
- [ ] テーブルに編集ボタンがあるか
- [ ] 詳細ダイアログに編集ボタンがあるか
- [ ] 編集フォームが実装されているか
- [ ] Service層でデータ損失がないか（`_enrich` メソッド）

#### Service層の調査結果:
```bash
# _enrich メソッドを持つサービス
- customer_items_service.py  ← 修正済み

# 他のサービスは _enrich メソッドなし
- products_service.py
- customer_service.py
- supplier_service.py
- warehouse_service.py
- uom_conversion_service.py
- product_mappings_service.py
```

**結論:** `customer_items_service.py` 以外にService層のデータ損失問題はなし

**TODO:** フロントエンドの編集機能を個別に確認（このPRには含めない、別途対応）

---

### 📋 6. 命名の統一（オプション）

**現在の混乱:**
- UI: 「商品コード（メーカー品番）」
- DB: `maker_part_code`
- 実態: システム内部ID（PRD-####）

**提案:**
- UIラベル: 「商品コード（メーカー品番）」→「商品コード」に変更
- コメント追加: `maker_part_code` が内部IDであることを明記

**優先度:** 低（設計レビュー後に対応）

---

## 次のステップ

### このPRで対応すること

1. ✅ Service層のデータ損失バグ修正を含める
2. ✅ 得意先品番マッピングの編集機能を含める
3. ✅ 設計レビュードキュメントを含める
4. ✅ CHANGELOG.mdを更新
5. ✅ PRを作成

### 別PRで対応すること

1. **商品識別子の設計レビューと修正判断**
   - レビュードキュメントを基に外部レビュー
   - ビジネス要件の再確認
   - 必要に応じてマイグレーション設計

2. **他のマスタページの編集機能調査**
   - 各マスタページの編集機能の有無を確認
   - 欠落している場合は追加実装

3. **命名の統一**
   - UIラベルの改善
   - コメントの追加

---

## 参考情報

### 関連ファイル

**バックエンド:**
- `backend/app/application/services/masters/customer_items_service.py` ← 修正済み
- `backend/app/infrastructure/persistence/models/masters_models.py`
- `backend/app/presentation/schemas/masters/customer_items_schema.py`

**フロントエンド:**
- `frontend/src/features/customer-items/components/CustomerItemsTable.tsx` ← 編集ボタン追加
- `frontend/src/features/customer-items/components/CustomerItemDetailDialog.tsx` ← 編集ボタン追加
- `frontend/src/features/customer-items/pages/CustomerItemsListPage.tsx` ← 編集ダイアログ追加

**ドキュメント:**
- `docs/review/PRODUCT_IDENTIFICATION_DESIGN_REVIEW.md` ← 新規作成
- `docs/tasks/MASTER_DATA_FIELD_ALIGNMENT_TASKS.md` ← このファイル

### データベーススキーマ

**products テーブル:**
```sql
- id (PK)
- maker_part_code (UNIQUE) ← 内部ID、システム全体で使用
- product_name
- customer_part_no ← ほぼ未使用
- maker_item_code ← 検索のみ使用
- (その他の単位換算フィールド)
```

**customer_items テーブル:**
```sql
- customer_id (複合PK)
- external_product_code (複合PK) ← 得意先ごとの品番
- product_id (FK → products.id)
- supplier_id
- (基本情報フィールド)
- (OCR-SAP変換フィールド 6個)
- (SAPキャッシュフィールド 4個)
```

---

**最終更新:** 2026-01-19
