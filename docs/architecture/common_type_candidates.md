# 共通型候補リスト（統合版）

**作成日**: 2025-11-16
**更新日**: 2025-11-19
**目的**: バックエンド（FastAPI/Pydantic）とフロントエンド（React/TypeScript）で繰り返し登場する型パターンを特定し、共通型定義の候補として整理する。

---

## 概要

### メリット

- **型安全性の向上**: 一貫したフィールド定義により、型エラーを早期発見
- **コードの重複削減**: 同じフィールドの組み合わせを再定義する必要がなくなる
- **保守性の向上**: 共通型を変更すれば、使用箇所すべてに反映される
- **バックエンド・フロントエンド間の整合性**: 対応関係を明確化

---

## 1. マスタデータSummary系

### 対応表

| バックエンド (Python) | フロントエンド (TypeScript) | フィールド |
|----------------------|---------------------------|-----------|
| `WarehouseSummary` | `WarehouseDisplay` | id + code + name |
| `SupplierSummary` | `SupplierDisplay` | id + code + name |
| `CustomerSummary` | `CustomerDisplay` | id + code + name |
| `DeliveryPlaceSummary` | `DeliveryPlaceDisplay` | id + code + name |
| `ProductSummary` | `ProductDisplay` | id + code + name + unit |
| `UserSummary` | `UserDisplay` | id + username + display_name |
| `RoleSummary` | `RoleDisplay` | id + code + name |

### 使用例

**バックエンド**:
- `WarehouseOut`（重複定義: masters_schema.py, warehouses_schema.py）
- 在庫レスポンス、ロットレスポンスでの埋め込み

**フロントエンド**:
- 注文カード、引当一覧での顧客・製品情報表示
- フィルタ条件での選択肢表示

### 問題点

- **重複定義**: `ProductBase` が `masters_schema.py` と `products_schema.py` に重複
- **重複定義**: `WarehouseOut` が `masters_schema.py` と `warehouses_schema.py` に重複

---

## 2. ListResponse / PageResponse パターン

### バックエンド

```python
# 現状: 多くの*ListResponseで繰り返し定義
class XxxListResponse(BaseSchema):
    items: list[XxxResponse]
    total: int

# 提案: 共通型として定義
class ListResponse[T](BaseSchema):
    items: list[T]
    total: int
```

### フロントエンド

```typescript
// 提案: 共通型として定義
export type ListResponse<T> = {
  items: T[];
  total: number;
};

export type PageResponse<T> = ListResponse<T> & {
  page: number;
  pageSize: number;
};
```

### 使用箇所

- `WarehouseListResponse`, `CustomerListResponse`, `ProductListResponse`
- `CandidateLotsResponse`, `AllocationListResponse`, `InboundPlanListResponse`

---

## 3. ドメイン固有Summary系

### LotSummary（ロットサマリ）

| フィールド | バックエンド | フロントエンド |
|-----------|-------------|---------------|
| ID | `lot_id: int` | `lotId: number` |
| ロット番号 | `lot_number: str` | `lotNumber: string` |
| 有効期限 | `expiry_date: date \| None` | `expiryDate: string \| null` |
| 引当可能数量 | `available_quantity: Decimal` | `availableQuantity: number \| string` |

### AllocationSummary（引当サマリ）

**問題点**: `orders_schema.py` と `allocations_schema.py` でほぼ同じ定義が重複

---

## 4. 既存の共通型（活用状況）

### TimestampMixin（広く使用されている）

- **バックエンド**: `backend/app/schemas/common/base.py`
- **状況**: ほぼすべてのレスポンススキーマで使用
- **推奨**: 今後も積極的に活用すべき

### Page[T]（定義済みだが活用不足）

- **バックエンド**: `backend/app/schemas/common/common_schema.py`
- **状況**: 十分に活用されていない
- **推奨**: ページネーション付きレスポンスで使用すべき

---

## 5. レガシーフィールドの問題（フロントエンド）

### 現状

`frontend/src/features/allocations/types/index.ts` の `Order` 型と `OrderLine` 型に、DDL v2.2準拠フィールドとレガシーフィールドが混在：

```typescript
// Order型
order_number: string; // DDL v2.2
order_no?: string;    // レガシー

// OrderLine型
product_id: number;   // DDL v2.2
product_code?: string | null; // レガシー
```

### 推奨される対応

- **移行期限**: 2026-02-15（バックエンドAPI移行期限と合わせる）
- **段階的削除**: レガシーフィールドを段階的に削除

---

## 6. 優先度別アクションプラン

### 高優先度（即時対応）

1. **マスタデータSummary型の定義**
   - バックエンド: `backend/app/schemas/common/summary_schema.py`
   - フロントエンド: `frontend/src/shared/types/master-displays.ts`

2. **重複定義の統合**
   - `ProductBase`, `WarehouseOut` の重複解消

3. **ListResponse[T] の共通化**
   - バックエンド・フロントエンド両方で定義

### 中優先度（3ヶ月以内）

4. **ドメインSummary型の定義**
   - `LotSummary`, `AllocationSummary`

5. **レガシーフィールドの削除**
   - フロントエンドの `Order`, `OrderLine` 型

6. **既存 WarehouseSummary の昇格**
   - `allocations/types/index.ts` から `shared/types/` へ移動

### 低優先度（必要に応じて）

7. **ケース変換方針の決定**
   - 現状は `snake_case` のまま使用を推奨

8. **数量フィールド共通定義**
   - `QuantityField` の共通化

---

## 7. 次のステップ

1. **チーム内レビュー**: 優先順位を合意
2. **共通型の定義**: 高優先度の型から順に実装
3. **移行期間**: 既存コードを段階的に移行
4. **ドキュメント更新**: CLAUDE.md の共通型セクションを更新
5. **型チェック強化**: mypy / ESLint の型チェックルールを追加

---

**注意**: このドキュメントは現状分析に基づく提案です。実装前に必ずチーム内で議論・合意を行ってください。
