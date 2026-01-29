# マスタデータ統合実装記録 (Master Data Consolidation Implementation)

**ブランチ:** `fix/backend-type-errors`
**実装期間:** 2026-01-27 〜 2026-01-30
**ステータス:** 完了 (Ready for PR)

---

## 概要 (Overview)

このブランチでは、`MASTER_ALIGNMENT_PLAN.md` で計画された「メーカー品番中心の2コード体系」への移行を完了させた。

### 実装前 (Before)
- **3コード体系**: 社内商品コード（products）+ メーカー品番（supplier_items）+ 得意先品番（customer_items）
- `products` テーブルが主役で在庫・単位換算の起点
- `supplier_items.product_id` は必須（NOT NULL）

### 実装後 (After)
- **2コード体系**: メーカー品番（supplier_items）+ 得意先品番（customer_items）
- `products` テーブル（→ `product_groups`）は削除され、必要な属性は `supplier_items` に統合
- メーカー品番が在庫管理の唯一の起点（SSOT: Single Source of Truth）

---

## 実装内容 (Implementation Details)

### 1. Phase 1: SKU駆動の在庫管理強制 (SKU-driven Inventory Enforcement)

**コミット:** `c23a97d9` - `feat(phase1): SKU-driven inventory management enforcement`

#### Migration: `phase1_sku_enforcement.py`
- `supplier_items.maker_part_no` を NOT NULL に変更
- `customer_items.supplier_item_id` を NOT NULL に変更
- データ監査機能組み込み（100%マッピング完了チェック）

#### Backend API変更
- **supplier_items_schema.py**
  - `product_id`: 必須 → オプショナル（Phase2用の準備）
  - `maker_part_no`: 必須（SKUキー）

- **customer_items_router.py**
  - `supplier_id` フィルタ追加（`supplier_items` 経由で絞り込み）

#### Frontend変更
- **SupplierProductForm**: `maker_part_no` 必須、`product_id` オプショナル
- **CustomerItemFormBasicSection**: `supplier_item_id` 必須、Phase1警告表示
- **UI統一**: "先方品番" → "得意先品番" 全画面で統一

---

### 2. products → product_groups リネーム (Table Rename)

**コミット:** `723e0b5e` - `refactor: Rename products → product_groups with full codebase update`

#### Migration: `products_to_product_groups.py`
- `products` テーブルを `product_groups` にリネーム
- 全てのビュー（14個）を `product_group_id` カラム名で再作成
- 全てのForeign Key制約を更新

#### 目的
商品マスタが「在庫の実体」ではなく「グルーピング用の論理ID」であることを明確化。

---

### 3. product_group_id外部キー追加 (Foreign Key Addition)

**コミット:** `a9f36409b674` - `add_product_group_id_foreign_keys_to_existing_tables`

#### Migration: `a9f36409b674_add_product_group_id_foreign_keys_to_.py`
- `supplier_items.product_group_id` に外部キー制約追加
- `customer_items.product_group_id` に外部キー制約追加

#### 制約内容
- `ON DELETE SET NULL`: product_groupsレコード削除時、参照側はNULLに設定
- NULLABLEを維持（独立稼働を許容）

---

### 4. supplier_items.base_unit NOT NULL化 (Base Unit Enforcement)

**コミット:** `9d7943ef324a` - `make_supplier_items_base_unit_not_null`

#### Migration: `9d7943ef324a_make_supplier_items_base_unit_not_null.py`
- 既存データで `base_unit` がNULLの場合、デフォルト値 `'EA'` を設定
- `supplier_items.base_unit` を NOT NULL に変更

#### 理由
在庫の基準単位は必須項目であるため、NULL許容は不適切。

---

### 5. product_groups削除とsupplier_items統合 (Table Consolidation)

**コミット:** `a5ec9cd27093` - `remove_product_groups_extend_supplier_items`

#### Migration: `a5ec9cd27093_remove_product_groups_extend_supplier_.py`

##### 追加カラム（supplier_itemsへ統合）
- `internal_unit` (VARCHAR(20)): 社内単位/引当単位（例: CAN）
- `external_unit` (VARCHAR(20)): 外部単位/表示単位（例: KG）
- `qty_per_internal_unit` (NUMERIC(10,4)): 内部単位あたりの数量（例: 1 CAN = 20.0 KG）
- `consumption_limit_days` (INTEGER): 消費期限日数
- `requires_lot_number` (BOOLEAN, DEFAULT TRUE): ロット番号管理が必要

##### 削除内容
- `supplier_items.product_group_id` カラム削除
- `supplier_items.is_primary` カラム削除（役割不明確）
- `customer_items.product_group_id` カラム削除
- `product_groups` テーブル完全削除

##### 制約変更
- `supplier_items.display_name` を NOT NULL に変更（既存NULLには `maker_part_no` をコピー）

---

### 6. Frontend: productsフィーチャー削除

**コミット:** `f0c8d827` - `fix: Remove products feature, use supplier-products instead`

#### 削除内容
- `frontend/src/features/products/` ディレクトリ完全削除
- 全てのインポート参照を `@/features/supplier-products` に置換

#### 影響範囲
- `MastersPage.tsx`: 「商品マスタ」カード削除
- ルーティング: `/masters/products` エンドポイント削除
- Backend: `products_router.py` 削除

---

## マイグレーション順序 (Migration Sequence)

このブランチで追加された6つのマイグレーションは、以下の順序で適用される：

```
baseline_2026_01_27
  ↓
phase1_sku_enforcement          (supplier_items.maker_part_no NOT NULL)
  ↓
products_to_product_groups      (products → product_groups rename)
  ↓
a9f36409b674                    (product_group_id FK追加)
  ↓
9d7943ef324a                    (supplier_items.base_unit NOT NULL)
  ↓
a5ec9cd27093                    (product_groups削除、supplier_items統合)
  ↓
e1ffaa651bdb                    (lot_number nullable化 + Excel View編集)
```

---

## データベース変更概要 (Database Changes Summary)

### 削除されたテーブル
- `product_groups` (旧 `products`)

### 主要テーブルの変更

#### `supplier_items` (メーカー品番マスタ)
| カラム | Before | After | 説明 |
|--------|--------|-------|------|
| `maker_part_no` | VARCHAR(100) | VARCHAR(100) NOT NULL | メーカー品番（業務キー） |
| `product_id` | BIGINT NOT NULL | **削除** | 商品グループIDは不要に |
| `product_group_id` | - | **削除** | リネーム後も最終的に削除 |
| `base_unit` | VARCHAR(20) | VARCHAR(20) NOT NULL | 在庫基準単位（必須化） |
| `display_name` | VARCHAR(200) | VARCHAR(200) NOT NULL | 表示名（必須化） |
| `internal_unit` | - | VARCHAR(20) | **新規追加** |
| `external_unit` | - | VARCHAR(20) | **新規追加** |
| `qty_per_internal_unit` | - | NUMERIC(10,4) | **新規追加** |
| `consumption_limit_days` | - | INTEGER | **新規追加** |
| `requires_lot_number` | - | BOOLEAN NOT NULL DEFAULT TRUE | **新規追加** |

#### `customer_items` (得意先品番マスタ)
| カラム | Before | After | 説明 |
|--------|--------|-------|------|
| `supplier_item_id` | BIGINT | BIGINT NOT NULL | メーカー品番への参照（必須化） |
| `product_group_id` | BIGINT | **削除** | 不要に |

---

## Backend API変更 (Backend API Changes)

### 削除されたエンドポイント
- `GET /api/products` - 商品一覧取得
- `POST /api/products` - 商品作成
- `GET /api/products/{id}` - 商品詳細取得
- `PUT /api/products/{id}` - 商品更新
- `DELETE /api/products/{id}` - 商品削除

### 変更されたスキーマ
- `SupplierItemCreate`: `product_id` が必須 → オプショナル
- `SupplierItemUpdate`: `product_id` が必須 → オプショナル
- `CustomerItemCreate`: `supplier_item_id` が必須化

---

## Frontend変更 (Frontend Changes)

### 削除されたページ/コンポーネント
- `ProductsPage` - 商品一覧ページ
- `ProductForm` - 商品登録/編集フォーム
- `ProductsTable` - 商品一覧テーブル
- `features/products/` ディレクトリ全体

### 変更されたページ
- **MastersPage**: 「商品マスタ」カード削除
- **SupplierProductsPage**: `product_id` をオプショナル入力に変更
- **CustomerItemsPage**: `supplier_item_id` を必須入力に変更、Phase1警告表示追加

### UI文言統一
- "先方品番" → "得意先品番" （全画面で統一）

---

## 破壊的変更 (Breaking Changes)

### Backend
1. **`products` エンドポイント完全削除**
   - 影響: 外部システムからの `products` API呼び出しは全て404エラー
   - 対策: `supplier_items` APIへ移行

2. **`supplier_items.product_id` 削除**
   - 影響: `product_id` に依存する既存ロジックは動作不可
   - 対策: 単位換算や属性参照は `supplier_items` 自体の属性を使用

3. **`customer_items.supplier_item_id` 必須化**
   - 影響: `supplier_item_id` がNULLの得意先品番は登録不可
   - 対策: 登録時に必ずメーカー品番を指定

### Frontend
1. **`@/features/products` インポート削除**
   - 影響: `products` フィーチャーを参照するコードはビルドエラー
   - 対策: 全て `@/features/supplier-products` に置換済み

2. **商品マスタメニュー削除**
   - 影響: UIから商品マスタへのアクセス不可
   - 対策: メーカー品番マスタで代替

---

## テスト観点 (Testing Points)

### P0 (Critical)
- [ ] 在庫登録: `supplier_items` 単位で正しく登録できるか
- [ ] 受注登録: 得意先品番で受注 → メーカー品番へ変換されるか
- [ ] 引当: 在庫が正しく引当たるか（メーカー品番単位）
- [ ] 出荷: 出荷指示書に正しい得意先品番が印字されるか

### P1 (High)
- [ ] 単位換算: `supplier_items` の `qty_per_internal_unit` が機能するか
- [ ] マイグレーション: fresh DBで全マイグレーションが適用されるか
- [ ] 既存データ: 既存の商品データが正しく `supplier_items` に統合されているか

---

## ロールバック手順 (Rollback Procedure)

### データベース
```bash
# Step 1: マイグレーションをbaselineまで戻す
docker compose exec backend alembic downgrade baseline_2026_01_27

# Step 2: データベースをリセット
docker compose down -v
docker compose up -d db

# Step 3: mainブランチのマイグレーションを適用
git checkout main
docker compose exec backend alembic upgrade head
```

### コード
```bash
# mainブランチに戻す
git checkout main
cd frontend && npm install
```

---

## 関連ドキュメント (Related Documentation)

- **計画書**: `docs/project/MASTER_ALIGNMENT_PLAN.md` - マスタデータ構造改革の全体計画
- **コード体系定義**: `docs/project/CODE_SYSTEM_DEFINITION.md` - 2コード体系の説明
- **バックログ**: `docs/project/BACKLOG.md` - 残タスク管理

---

## 次のステップ (Next Steps)

このブランチの完了により、以下が可能になった：

1. ✅ メーカー品番中心の在庫管理
2. ✅ 商品マスタ（product_groups）の削除
3. ✅ supplier_items への属性統合

### 今後の拡張（Phase 3以降）
- [ ] 単位換算の厳密なバリデーション（引当・出荷時）
- [ ] `supplier_item_uom_conversions` テーブル追加（メーカー品番別の単位換算）
- [ ] 得意先別の例外的な単位換算対応

---

**最終更新:** 2026-01-30
**ステータス:** 実装完了 / PR作成待ち
