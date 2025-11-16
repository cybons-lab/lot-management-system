# 共通型候補リスト（バックエンド）

**作成日**: 2025-11-16
**目的**: バックエンド（FastAPI/Pydantic）スキーマで繰り返し登場するフィールド組み合わせを特定し、将来的な共通型定義の候補として整理する。

---

## 概要

現在のスキーマ定義を走査したところ、以下のような共通パターンが複数箇所で登場していることが確認できました。これらを共通型として定義することで、以下のメリットが期待できます：

- **型安全性の向上**: 一貫したフィールド定義により、型エラーを早期発見
- **コードの重複削減**: 同じフィールドの組み合わせを再定義する必要がなくなる
- **保守性の向上**: 共通型を変更すれば、使用箇所すべてに反映される
- **ドキュメント性の向上**: 「〇〇Summary」という名前で意図が明確になる

---

## 1. マスタデータSummary系

### 背景
各マスタデータ（倉庫、仕入先、顧客、製品など）は、詳細レスポンスとは別に「id + code + name」の組み合わせで他のエンティティから参照されることが多い。

---

## WarehouseSummary（倉庫サマリ）

### フィールド一覧

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| warehouse_id | int | 倉庫ID（DBのプライマリキー） |
| warehouse_code | str | 倉庫コード（業務キー） |
| warehouse_name | str | 倉庫名 |

### 使用箇所例

- `backend/app/schemas/masters/masters_schema.py` - `WarehouseOut`（簡易リスト表示用）
- `backend/app/schemas/masters/warehouses_schema.py` - `WarehouseOut`（重複定義）
- 在庫レスポンス、ロットレスポンスなどで倉庫情報を埋め込む際に使用される可能性

### 備考

- **重複定義**: 現在 `masters_schema.py` と `warehouses_schema.py` で別々に定義されている
- **フル情報との違い**: `WarehouseResponse` には `warehouse_type`, `created_at`, `updated_at` も含まれるが、Summaryには含めない
- **用途**: APIレスポンスで「関連倉庫情報」として埋め込む際に使用

---

## SupplierSummary（仕入先サマリ）

### フィールド一覧

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| supplier_id | int | 仕入先ID |
| supplier_code | str | 仕入先コード |
| supplier_name | str | 仕入先名 |

### 使用箇所例

- `backend/app/schemas/masters/masters_schema.py` - `SupplierResponse`（フル情報）から派生可能
- ロット情報、入荷予定などで仕入先情報を埋め込む際に使用

### 備考

- **フル情報との違い**: `SupplierResponse` には `created_at`, `updated_at` も含まれる
- **用途**: ロット詳細レスポンスなどで「どの仕入先から入荷したか」を示す際に使用

---

## CustomerSummary（顧客サマリ）

### フィールド一覧

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| customer_id | int | 顧客ID |
| customer_code | str | 顧客コード |
| customer_name | str | 顧客名 |

### 使用箇所例

- `backend/app/schemas/masters/masters_schema.py` - `CustomerResponse`（フル情報）から派生可能
- 注文レスポンス、予測レスポンスなどで顧客情報を埋め込む際に使用

### 備考

- **フル情報との違い**: `CustomerResponse` には `created_at`, `updated_at` も含まれる
- **用途**: 注文詳細レスポンスなどで「どの顧客からの注文か」を示す際に使用

---

## DeliveryPlaceSummary（納品先サマリ）

### フィールド一覧

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| delivery_place_id | int | 納品先ID |
| delivery_place_code | str | 納品先コード |
| delivery_place_name | str | 納品先名 |

### 使用箇所例

- `backend/app/schemas/masters/masters_schema.py` - `DeliveryPlaceResponse`（フル情報）から派生可能
- 注文レスポンス、予測レスポンスなどで納品先情報を埋め込む際に使用

### 備考

- **フル情報との違い**: `DeliveryPlaceResponse` には `customer_id`, `jiku_code`, `created_at`, `updated_at` も含まれる
- **用途**: 注文詳細レスポンスなどで「どこに納品するか」を示す際に使用

---

## ProductSummary（製品サマリ）

### フィールド一覧

| フィールド名 | 型 | 説明 | 備考 |
|-------------|-----|------|------|
| product_id | int | 製品ID | |
| product_code | str | 製品コード | DDL v2.2では `maker_part_code` に統一されている可能性あり |
| product_name | str | 製品名 | |
| unit | str | 基本単位 | `base_unit` または `internal_unit` |

### 使用箇所例

- `backend/app/schemas/masters/masters_schema.py` - `ProductResponse`（フル情報）
- `backend/app/schemas/masters/products_schema.py` - `ProductOut`（**重複定義**）
- 注文明細、ロット、在庫サマリなどで製品情報を埋め込む際に使用

### 備考

- **重複定義の問題**: `masters_schema.py` と `products_schema.py` で異なる定義が存在
  - `masters_schema.py`: `maker_part_code` + `base_unit`
  - `products_schema.py`: `product_code` + `internal_unit`
- **DDL v2.2準拠**: `maker_part_code` + `base_unit` が正式フィールド名
- **用途**: 注文明細、ロット詳細などで「どの製品か」を示す際に使用

---

## UserSummary（ユーザーサマリ）

### フィールド一覧

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| user_id | int | ユーザーID |
| username | str | ユーザー名（ログインID） |
| display_name | str | 表示名 |

### 使用箇所例

- `backend/app/schemas/system/users_schema.py` - `UserResponse`（フル情報）から派生可能
- 操作ログ、変更履歴などで「誰が実行したか」を示す際に使用

### 備考

- **フル情報との違い**: `UserResponse` には `email`, `is_active`, `last_login_at`, `created_at`, `updated_at` も含まれる
- **用途**: 監査ログ、変更履歴などで実行者情報を埋め込む際に使用

---

## RoleSummary（ロールサマリ）

### フィールド一覧

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| role_id | int | ロールID |
| role_code | str | ロールコード |
| role_name | str | ロール名 |

### 使用箇所例

- `backend/app/schemas/system/roles_schema.py` - `RoleResponse`（フル情報）から派生可能
- ユーザー詳細レスポンスなどで「割り当てられたロール」を示す際に使用

### 備考

- **フル情報との違い**: `RoleResponse` には `description`, `created_at`, `updated_at` も含まれる
- **用途**: ユーザー管理画面などでロール一覧を表示する際に使用

---

## 2. ドメイン固有Summary系

---

## LotSummary（ロットサマリ）

### フィールド一覧

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| lot_id | int | ロットID |
| lot_number | str | ロット番号 |
| expiry_date | date \| None | 有効期限 |
| received_date | date \| None | 入荷日 |
| available_quantity | Decimal | 引当可能数量（decimal_places=3） |
| product_id | int | 製品ID（参照用） |
| warehouse_id | int | 倉庫ID（参照用） |

### 使用箇所例

- `backend/app/schemas/allocations/allocations_schema.py` - `CandidateLotItem`（候補ロット）
- `backend/app/schemas/allocations/allocations_schema.py` - `FefoLotAllocation`（FEFO引当詳細）
- `backend/app/schemas/inventory/inventory_schema.py` - `LotResponse`（フル情報）から派生可能

### 備考

- **フル情報との違い**: `LotResponse` には `supplier_id`, `expected_lot_id`, `current_quantity`, `allocated_quantity`, `unit`, `status`, `created_at`, `updated_at` も含まれる
- **用途**: 引当候補ロット一覧、FEFO アロケーション結果などで使用
- **数量フィールド**: `available_quantity` = `current_quantity` - `allocated_quantity` として計算される

---

## OrderLineSummary（注文明細サマリ）

### フィールド一覧

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| order_line_id | int | 注文明細ID |
| product_id | int | 製品ID |
| delivery_date | date | 納品予定日 |
| order_quantity | Decimal | 受注数量（decimal_places=3） |
| unit | str | 単位 |

### 使用箇所例

- `backend/app/schemas/orders/orders_schema.py` - `OrderLineBase`, `OrderLineResponse`
- 引当リクエスト、FEFO プレビューなどで注文明細情報を参照する際に使用

### 備考

- **フル情報との違い**: `OrderLineResponse` には `id`, `order_id`, `created_at`, `updated_at` も含まれる
- **拡張版**: `OrderLineWithAllocationsResponse` には `allocations` と `allocated_quantity` が追加される
- **用途**: 注文詳細レスポンス、引当画面などで使用

---

## AllocationSummary（引当サマリ）

### フィールド一覧

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| allocation_id | int | 引当ID |
| order_line_id | int | 注文明細ID |
| lot_id | int | ロットID |
| allocated_quantity | Decimal | 引当数量（decimal_places=3） |
| status | str | ステータス（allocated/shipped/cancelled） |

### 使用箇所例

- `backend/app/schemas/orders/orders_schema.py` - `AllocationResponse`
- `backend/app/schemas/allocations/allocations_schema.py` - `AllocationDetail`

### 備考

- **重複定義**: `orders_schema.py` と `allocations_schema.py` でほぼ同じ定義が存在
- **用途**: 注文詳細レスポンス（引当情報付き）、引当一覧などで使用
- **ステータス**: `allocated` → `shipped` → `cancelled` の状態遷移

---

## 3. 既存の共通型（活用状況）

---

## TimestampMixin（タイムスタンプミックスイン）

### フィールド一覧

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| created_at | datetime | 作成日時 |
| updated_at | datetime \| None | 更新日時 |

### 定義場所

- `backend/app/schemas/common/base.py` - `TimestampMixin`

### 使用箇所例

- `inventory_schema.py` - `LotResponse`, `StockHistoryResponse`, `AdjustmentResponse`, `InventoryItemResponse`
- `inbound_schema.py` - `ExpectedLotResponse`, `InboundPlanLineResponse`, `InboundPlanResponse`
- `forecast_schema.py` - `ForecastHeaderResponse`, `ForecastLineResponse`
- `orders_schema.py` - `OrderResponse`, `OrderLineResponse`, `AllocationResponse`
- `masters_schema.py` - `WarehouseResponse`, `SupplierResponse`, `CustomerResponse`, `DeliveryPlaceResponse`, `ProductResponse`
- `users_schema.py` - `UserResponse`
- `roles_schema.py` - `RoleResponse`

### 備考

- **既に定義済み**: すでに共通ミックスインとして定義されており、多くのスキーマで使用されている
- **活用状況**: ほぼすべてのエンティティのレスポンススキーマで使用されている
- **推奨**: 今後も新しいレスポンススキーマを定義する際は積極的に活用すべき

---

## Page[T]（ページネーション）

### フィールド一覧

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| items | list[T] | アイテムリスト（ジェネリック） |
| total | int | 総件数 |
| page | int | 現在のページ番号 |
| per_page | int | ページあたりの件数 |

### 定義場所

- `backend/app/schemas/common/common_schema.py` - `Page[T]`

### 使用箇所例

- ページネーション付きレスポンスで使用可能
- 現在、多くの `*ListResponse` が独自に `items` + `total` を定義している

### 備考

- **既に定義済み**: ジェネリック型として定義されている
- **活用状況**: 十分に活用されていない可能性あり
- **推奨**: ページネーション付きレスポンスでは `Page[T]` を使うべき

---

## ListResponse[T] パターン（共通化候補）

### 現状

多くのスキーマで以下のパターンが繰り返し定義されている：

```python
class XxxListResponse(BaseSchema):
    items: list[XxxResponse]
    total: int
```

### 使用箇所例

- `WarehouseListResponse`
- `CustomerListResponse`
- `ProductListResponse`
- `SupplierListResponse`
- `DeliveryPlaceListResponse`
- `CandidateLotsResponse`
- `AllocationListResponse`
- `InboundPlanListResponse`

### 提案

ページネーション不要のシンプルなリストレスポンス用に、以下の共通型を定義する：

```python
class ListResponse[T](BaseSchema):
    """Generic list response without pagination."""
    items: list[T]
    total: int
```

または、既存の `Page[T]` を拡張して、ページネーションなしでも使えるようにする。

---

## 4. 数量フィールド共通定義（検討事項）

### 背景

多くのスキーマで `Decimal` 型の数量フィールドが `decimal_places=3` で定義されている。

### 繰り返し登場する数量フィールド

- `order_quantity` - 受注数量
- `allocated_quantity` - 引当数量
- `forecast_quantity` - 予測数量
- `planned_quantity` - 計画数量
- `current_quantity` - 現在数量
- `available_quantity` - 利用可能数量
- `suggested_quantity` - 推奨数量
- `adjusted_quantity` - 調整数量

### 提案

Pydantic の `Field` 定義を共通化する：

```python
from decimal import Decimal
from pydantic import Field

# 共通の数量フィールド定義
QuantityField = Field(..., gt=0, decimal_places=3, description="数量")
OptionalQuantityField = Field(None, ge=0, decimal_places=3, description="数量（オプション）")
```

使用例：

```python
class OrderLineBase(BaseSchema):
    order_quantity: Decimal = QuantityField
```

### 備考

- **メリット**: 数量フィールドの定義が統一され、小数点桁数の変更も一箇所で対応可能
- **デメリット**: Pydantic の `Field` をエイリアスするアプローチが適切かどうか要検討
- **代替案**: カスタムバリデータを持つ `Quantity` 型を定義する

---

## 5. ステータスEnum（活用状況）

### 現状

各ドメインごとに独立した `Enum` でステータスが定義されている。

### 既存のステータスEnum

| Enum名 | 定義場所 | 値 |
|--------|---------|-----|
| `LotStatus` | `inventory_schema.py` | active, depleted, expired, quarantine |
| `InboundPlanStatus` | `inbound_schema.py` | planned, partially_received, received, cancelled |
| `ForecastStatus` | `forecast_schema.py` | active, completed, cancelled |
| `OrderStatus`（推測） | `orders_schema.py` | pending, allocated, shipped, completed, cancelled |
| `AllocationStatus`（推測） | `allocations_schema.py` | allocated, shipped, cancelled |
| `StockTransactionType` | `inventory_schema.py` | inbound, allocation, shipment, adjustment, return |
| `AdjustmentType` | `inventory_schema.py` | physical_count, damage, loss, found, other |

### 備考

- **独立性**: 各ドメインのステータスは独立しており、共通化は難しい
- **型安全性**: Enum として定義されているため、既に型安全性は確保されている
- **推奨**: このまま各ドメインごとに定義を続けるのが適切

---

## 6. まとめと推奨アクション

### 高優先度（すぐに共通化を検討すべき）

1. **マスタデータSummary系**
   - `WarehouseSummary`, `SupplierSummary`, `CustomerSummary`, `DeliveryPlaceSummary`, `ProductSummary`
   - 理由: 重複定義が多数存在、APIレスポンスで頻繁に使用される

2. **ListResponse[T] パターン**
   - `items` + `total` の組み合わせが多数重複
   - 理由: 既存の `Page[T]` との統合またはシンプル版を定義

3. **重複定義の統合**
   - `ProductBase` が `masters_schema.py` と `products_schema.py` に重複
   - `WarehouseOut` が `masters_schema.py` と `warehouses_schema.py` に重複
   - 理由: メンテナンス性の低下、バグの原因

### 中優先度（段階的に検討）

4. **LotSummary**
   - 引当関連の複数箇所でロット情報を参照
   - 理由: フィールドが多く、共通化のメリットが大きい

5. **AllocationSummary**
   - `orders_schema.py` と `allocations_schema.py` で重複定義
   - 理由: 引当情報の一貫性確保

### 低優先度（必要に応じて検討）

6. **OrderLineSummary**
   - 既存の `OrderLineResponse` で十分な可能性
   - 理由: 共通化のメリットが限定的

7. **数量フィールド共通定義**
   - `QuantityField` の共通化
   - 理由: メリットはあるが、Pydantic のベストプラクティスとの整合性要確認

### 既に適切に定義されている

8. **TimestampMixin**
   - 広く使用されており、問題なし

9. **Page[T]**
   - 定義済みだが、もっと活用すべき

10. **ステータスEnum**
    - 各ドメインごとに適切に定義されている

---

## 7. 次のステップ

1. **チーム内レビュー**: この候補リストをチームでレビューし、優先順位を合意
2. **段階的実装**: 高優先度の共通型から順に定義し、既存コードを移行
3. **移行期間**: 既存の定義と新しい共通型を並存させ、徐々に移行
4. **ドキュメント更新**: 共通型の使用ガイドラインを CLAUDE.md に追加
5. **型チェック強化**: mypy や ruff の型チェックルールを追加

---

**注意**: このドキュメントは現状分析に基づく提案であり、実装前に必ずチーム内で議論・合意を行ってください。
