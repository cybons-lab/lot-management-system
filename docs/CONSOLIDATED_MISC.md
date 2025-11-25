# その他ドキュメント 統合

最終更新: 2025-11-25

---

## 📚 目次

1. [概要](#概要)
2. [Unit Conversion System Implementation（単位換算システム実装）](#unit-conversion-system-implementation単位換算システム実装)

---

## 概要

本ドキュメントは、カテゴリに分類しづらい技術実装ドキュメントを統合したものです。

### 統合元ドキュメント

1. **Unit Conversion System Implementation（単位換算システム実装）**
   - 元ファイル: `docs/unit-conversion-implementation.md`
   - 内容: データベース駆動の単位換算システムの実装記録

---

# Unit Conversion System Implementation（単位換算システム実装）

## 概要
データベース駆動の単位換算システムを実装し、自動引当・ステータス計算・フィルタのバグを修正しました。

## 実装内容

### バックエンド

#### 1. データベース
- **マイグレーション**: `550e261da7cb_create_product_uom_conversions_table.py`
- **テーブル**: `product_uom_conversions`
  - `conversion_id` (PK)
  - `product_id` (FK → products)
  - `external_unit` (外部単位: "BOX", "CAN"など)
  - `factor` (換算係数: 例 1 BOX = 12 PCS → factor = 12.0)

#### 2. モデル (`masters_models.py`)
- `ProductUomConversion` モデル追加
- `Product.uom_conversions` リレーションシップ追加

#### 3. サービス (`quantity_service.py`)
- ハードコードされた`ROUNDING_RULES`を削除
- DB駆動の`to_internal_qty()`関数を実装
- 非同期処理対応

### フロントエンド

#### 1. 型定義 (`aliases.ts`)
- `OrderLine.converted_quantity` フィールド追加

#### 2. 自動引当修正 (`allocationFieldHelpers.ts`)
**問題**: `order_quantity`（外部単位）を使用していたため過剰引当が発生
- 例: 9 KG必要 → 9 CAN (180 KG) 引当 ❌

**修正**: `getOrderQuantity()`を修正
```typescript
return Number(line.converted_quantity ?? line.order_quantity ?? line.quantity ?? 0);
```

#### 3. ステータス計算修正 (`useAllocationCalculations.ts`)
**問題**: 20 KG必要で1 CAN (=20 KG)引当済みでも「残:19」と表示

**修正**: `requiredQty`計算で`converted_quantity`を使用

#### 4. フィルタ修正 (`FlatAllocationList.tsx`)
**問題**: ステータスフィルタ（在庫不足/在庫過剰）が機能しない

**修正**: フィルタロジックで`converted_quantity`を使用

## 検証結果

### バックエンド
```bash
python backend/scripts/verify_uom_conversion.py
```
- PCS → PCS (換算なし) ✅
- 2 BOX → 24 PCS (1 BOX = 12 PCS) ✅

### フロントエンド
- 自動引当: 9 KG / 1 CAN=20 KG → 0.45 CAN ✅
- ステータス: 20 KG / 1 CAN引当 → 「引当完了」 ✅
- フィルタ: 全ステータスフィルタ動作 ✅

## 変更ファイル

### バックエンド
- `backend/alembic/versions/550e261da7cb_create_product_uom_conversions_table.py`
- `backend/app/models/masters_models.py`
- `backend/app/models/__init__.py`
- `backend/app/services/common/quantity_service.py`
- `backend/scripts/verify_uom_conversion.py` (新規)

### フロントエンド
- `frontend/src/shared/types/aliases.ts`
- `frontend/src/features/allocations/hooks/useLotAllocation/allocationFieldHelpers.ts`
- `frontend/src/features/allocations/components/lots/hooks/useAllocationCalculations.ts`
- `frontend/src/features/allocations/components/shared/FlatAllocationList.tsx`

## コミット履歴
```
3da296f fix: Use converted_quantity in status calculation and filters
cee689a fix: Add converted_quantity to OrderLine TypeScript type
81a5e2c fix: Use converted_quantity for auto-allocation calculations
edf38eb feat: Implement UOM conversion system with product_uom_conversions table
```

## 依存関係
- `aiosqlite` - SQLite非同期サポート
- `greenlet` - SQLAlchemy非同期処理に必要
- `asyncpg` - PostgreSQL非同期サポート

---

以上がその他の技術実装ドキュメントです。
