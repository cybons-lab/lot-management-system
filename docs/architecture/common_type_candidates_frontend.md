# 共通型候補リスト（フロントエンド）

**作成日**: 2025-11-16
**目的**: フロントエンド（React/TypeScript）で繰り返し登場する型の組み合わせを特定し、将来的な共通型定義の候補として整理する。

---

## 概要

フロントエンドのコンポーネント、hooks、型定義を走査したところ、以下のような共通パターンが複数箇所で登場していることが確認できました。

これらを共通型として定義することで、以下のメリットが期待できます：

- **型安全性の向上**: 一貫したプロパティ定義により、型エラーを早期発見
- **コンポーネント間の整合性**: 同じデータ構造を扱うコンポーネント間で型の不整合を防止
- **保守性の向上**: 共通型を変更すれば、使用箇所すべてに反映される
- **バックエンドとの対応**: バックエンドの共通型と対応関係を明確化

---

## 1. マスタデータSummary系（バックエンド対応）

### 背景

各マスタデータは、詳細レスポンス（`*Response`）とは別に「id + code + name」の組み合わせでコンポーネント内で繰り返し参照されます。バックエンドの `*Summary` 型と対応する形でフロントエンド側にも定義すべきです。

---

## CustomerDisplay（顧客表示情報）

### プロパティ一覧

| プロパティ名 | 型 | 説明 | 備考 |
|-------------|-----|------|------|
| customerId | number | 顧客ID | API型では `customer_id` |
| customerCode | string | 顧客コード | API型では `customer_code` |
| customerName | string | 顧客名 | API型では `customer_name` |

### 使用箇所例

- `frontend/src/features/orders/components/OrderCard.tsx`（57行目） - `customer_name || customer_code`
- `frontend/src/features/allocations/components/OrderDetailPane.tsx`（50行目） - 得意先表示
- `frontend/src/features/orders/components/OrderFilters.tsx` - フィルタ条件での顧客選択

### UI上の役割

- **テーブル表示**: 注文一覧、引当一覧で顧客情報を表示
- **詳細ヘッダ**: 注文詳細画面のヘッダ部分
- **フィルタ条件**: 検索条件での顧客選択

### 備考

- バックエンドの `CustomerSummary` と対応
- API型 `CustomerResponse` から派生させる（`id`, `created_at`, `updated_at` を除外）
- 表示時は「code + name」のフォーマットがよく使われる（例: `formatCodeAndName()`ユーティリティ）

---

## DeliveryPlaceDisplay（納品先表示情報）

### プロパティ一覧

| プロパティ名 | 型 | 説明 | 備考 |
|-------------|-----|------|------|
| deliveryPlaceId | number | 納品先ID | API型では `delivery_place_id` |
| deliveryPlaceCode | string | 納品先コード | API型では `delivery_place_code` |
| deliveryPlaceName | string | 納品先名 | API型では `delivery_place_name` |

### 使用箇所例

- `frontend/src/features/allocations/components/OrderDetailPane.tsx`（54-56行目） - 納品先表示
- `frontend/src/features/allocations/components/OrderCard.tsx`（21行目） - `primaryDeliveryPlace`
- `frontend/src/features/allocations/types/index.ts`（16-17行目） - レガシーフィールド

### UI上の役割

- **注文カード**: 注文一覧で納品先を簡潔に表示
- **詳細ヘッダ**: 注文詳細画面のヘッダ部分
- **検索条件**: フィルタでの納品先選択

### 備考

- バックエンドの `DeliveryPlaceSummary` と対応
- 注文データに埋め込まれて使用されることが多い
- `delivery_place` という省略形もレガシーコードに存在

---

## ProductDisplay（製品表示情報）

### プロパティ一覧

| プロパティ名 | 型 | 説明 | 備考 |
|-------------|-----|------|------|
| productId | number | 製品ID | API型では `product_id` |
| productCode | string | 製品コード | API型では `maker_part_code` に統一予定 |
| productName | string | 製品名 | API型では `product_name` |
| unit | string | 基本単位 | API型では `base_unit` |

### 使用箇所例

- `frontend/src/features/orders/components/OrderCard.tsx`（48行目） - `product_code`
- `frontend/src/features/allocations/types/index.ts`（10-11行目） - レガシーフィールド
- `frontend/src/features/customer-items/components/CustomerItemTable.tsx` - 製品情報表示
- `frontend/src/features/customer-items/components/CustomerItemForm.tsx` - 製品入力

### UI上の役割

- **テーブル表示**: 注文明細、在庫一覧で製品情報を表示
- **カード表示**: 製品カードで基本情報を表示
- **フォーム入力**: 製品選択フィールド
- **検索条件**: フィルタでの製品選択

### 備考

- バックエンドの `ProductSummary` と対応
- **重要**: DDL v2.2では `product_code` → `maker_part_code` に統一されるべき
- `unit` フィールドはオプションではなく必須にすべき（数量表示時に必要）

---

## WarehouseDisplay（倉庫表示情報）

### プロパティ一覧

| プロパティ名 | 型 | 説明 | 備考 |
|-------------|-----|------|------|
| warehouseId | number | 倉庫ID | API型では `warehouse_id` |
| warehouseCode | string | 倉庫コード | API型では `warehouse_code` |
| warehouseName | string | 倉庫名 | API型では `warehouse_name` |

### 使用箇所例

- `frontend/src/features/allocations/types/index.ts`（53-59行目） - `WarehouseSummary`（**既存定義**）
- `frontend/src/features/orders/components/WarehouseSelector.tsx` - 倉庫選択
- `frontend/src/features/orders/components/WarehouseBadges.tsx` - 倉庫バッジ表示

### UI上の役割

- **セレクタ**: 倉庫選択ドロップダウン
- **バッジ表示**: 在庫サマリなどで倉庫ごとの情報を表示
- **フィルタ条件**: 検索条件での倉庫選択

### 備考

- バックエンドの `WarehouseSummary` と対応
- **既存定義あり**: `frontend/src/features/allocations/types/index.ts` に独自定義が存在
- 既存定義には `totalStock` プロパティが追加されている（拡張版）
- API型 `WarehouseOut` がバックエンドで定義されている

---

## SupplierDisplay（仕入先表示情報）

### プロパティ一覧

| プロパティ名 | 型 | 説明 | 備考 |
|-------------|-----|------|------|
| supplierId | number | 仕入先ID | API型では `supplier_id` |
| supplierCode | string | 仕入先コード | API型では `supplier_code` |
| supplierName | string | 仕入先名 | API型では `supplier_name` |

### 使用箇所例

- `frontend/src/features/inbound-plans/pages/InboundPlanDetailPage.tsx` - 入荷予定で仕入先表示
- ロット詳細画面 - 仕入先情報表示（推測）

### UI上の役割

- **詳細表示**: ロット詳細、入荷予定詳細で仕入先情報を表示
- **フィルタ条件**: 検索条件での仕入先選択

### 備考

- バックエンドの `SupplierSummary` と対応
- 現状、使用頻度は他のマスタより低い

---

## 2. ドメイン固有Summary系

---

## OrderHeaderSummary（注文ヘッダサマリ）

### プロパティ一覧

| プロパティ名 | 型 | 説明 | 備考 |
|-------------|-----|------|------|
| id | number | 注文ID | |
| orderNumber | string | 注文番号 | API: `order_number`, レガシー: `order_no` |
| orderDate | string | 注文日 | Format: date (ISO 8601) |
| status | string | ステータス | pending/allocated/shipped/completed/cancelled |
| customer | CustomerDisplay | 顧客情報 | 埋め込み型 |
| deliveryPlace | DeliveryPlaceDisplay | 納品先情報 | 埋め込み型 |

### 使用箇所例

- `frontend/src/features/allocations/types/index.ts`（22-42行目） - `Order` 型（**独自定義**）
- `frontend/src/features/allocations/components/OrderCard.tsx` - 注文カード表示
- `frontend/src/features/allocations/components/OrderDetailPane.tsx` - 注文ヘッダ表示

### UI上の役割

- **注文一覧**: 注文リストで各注文の基本情報を表示
- **注文カード**: カード形式での注文表示
- **詳細ヘッダ**: 注文詳細画面のヘッダ部分

### 備考

- **既存定義あり**: `allocations/types/index.ts` に独自の `Order` 型が定義されている
- レガシーフィールド（`order_no`, `customer_code`, `customer_name` など）が混在
- DDL v2.2準拠にするには、埋め込み型として `CustomerDisplay` と `DeliveryPlaceDisplay` を使うべき
- API型 `OrderResponse` + マスタデータを組み合わせて構築する必要がある

---

## OrderLineSummary（注文明細サマリ）

### プロパティ一覧

| プロパティ名 | 型 | 説明 | 備考 |
|-------------|-----|------|------|
| id | number | 注文明細ID | |
| orderId | number | 注文ID（親） | API: `order_id` |
| product | ProductDisplay | 製品情報 | 埋め込み型 |
| deliveryDate | string | 納品予定日 | Format: date (ISO 8601) |
| orderQuantity | number \| string | 受注数量 | API: Decimal型（string） |
| unit | string | 単位 | ProductDisplayから取得可能だが明示的に持つ |
| allocatedQuantity? | number \| string | 引当済数量 | オプション、引当情報がある場合 |

### 使用箇所例

- `frontend/src/features/allocations/types/index.ts`（7-18行目） - `OrderLine` 型（**独自定義**）
- `frontend/src/features/orders/components/OrderCard.tsx`（45-62行目） - 明細テーブル
- `frontend/src/features/allocations/components/OrderLineCard.tsx` - 明細カード表示

### UI上の役割

- **明細テーブル**: 注文詳細画面で明細行を表示
- **明細カード**: カード形式での明細表示
- **引当画面**: 引当対象の明細情報を表示

### 備考

- **既存定義あり**: `allocations/types/index.ts` に独自の `OrderLine` 型が定義されている
- レガシーフィールド（`line_no`, `product_code`, `product_name`, `quantity` など）が混在
- `product` を埋め込み型として持つことで、表示時のコード冗長性を削減できる
- API型 `OrderLineResponse` + 製品マスタを組み合わせて構築

---

## LotSummary（ロットサマリ）

### プロパティ一覧

| プロパティ名 | 型 | 説明 | 備考 |
|-------------|-----|------|------|
| lotId | number | ロットID | API: `lot_id` |
| lotNumber | string | ロット番号 | |
| product | ProductDisplay | 製品情報 | 埋め込み型 |
| warehouse | WarehouseDisplay | 倉庫情報 | 埋め込み型 |
| expiryDate | string \| null | 有効期限 | Format: date (ISO 8601) |
| receivedDate | string \| null | 入荷日 | Format: date (ISO 8601) |
| currentQuantity | number \| string | 現在数量 | API: Decimal型（string） |
| allocatedQuantity | number \| string | 引当済数量 | API: Decimal型（string） |
| availableQuantity | number \| string | 引当可能数量 | 計算フィールド: current - allocated |
| unit | string | 単位 | |
| status | LotStatus | ステータス | active/depleted/expired/quarantine |

### 使用箇所例

- `frontend/src/types/api.d.ts`（4740-4781行目） - `LotResponse`（API型）
- 引当候補ロット一覧 - `CandidateLotItem`（API型では定義済み）
- FEFO引当結果 - `FefoLotAllocation`（API型では定義済み）

### UI上の役割

- **候補ロット一覧**: 引当可能なロットのリスト表示
- **ロット詳細**: ロット詳細画面
- **在庫サマリ**: 倉庫別、製品別の在庫サマリ

### 備考

- バックエンドの `LotSummary` と対応
- API型 `CandidateLotItem` が既に定義されている（allocations_schema.py）
- `product` と `warehouse` を埋め込み型として持つことで、表示時の参照を簡素化できる
- `availableQuantity` は計算フィールドだが、APIから直接返されることもある

---

## AllocationSummary（引当サマリ）

### プロパティ一覧

| プロパティ名 | 型 | 説明 | 備考 |
|-------------|-----|------|------|
| allocationId | number | 引当ID | API: `id` or `allocation_id` |
| orderLineId | number | 注文明細ID | API: `order_line_id` |
| lotId | number | ロットID | API: `lot_id` |
| allocatedQuantity | number \| string | 引当数量 | API: Decimal型（string） |
| status | string | ステータス | allocated/shipped/cancelled |

### 使用箇所例

- `frontend/src/types/api.d.ts` - `AllocationResponse`, `AllocationDetail`（API型）
- 引当一覧画面 - 引当実績の表示
- 注文明細詳細 - 引当情報の表示

### UI上の役割

- **引当一覧**: 引当実績の一覧表示
- **注文明細詳細**: 注文明細に紐づく引当情報の表示
- **ロット詳細**: ロットに紐づく引当情報の表示

### 備考

- バックエンドの `AllocationSummary` と対応
- API型 `AllocationDetail` が既に定義されている（allocations_schema.py）

---

## 3. UI拡張型（ドメイン型の拡張）

フロントエンド独自のUI要件により、ドメイン型を拡張した型です。

---

## OrderCardData（注文カード表示用）

### プロパティ一覧

| プロパティ名 | 型 | 説明 | 備考 |
|-------------|-----|------|------|
| ...Order | - | 基底型のすべてのプロパティ | `OrderHeaderSummary` を継承 |
| priority | PriorityLevel | 優先度 | urgent/warning/attention/allocated/inactive |
| unallocatedQty | number | 未引当数量 | 計算フィールド |
| daysTodue | number \| null | 納期までの日数 | 計算フィールド |
| hasMissingFields | boolean | 必須項目欠落フラグ | バリデーション結果 |
| totalQuantity | number | 合計数量 | 明細の合計 |
| primaryDeliveryPlace? | string \| null | 主納品先 | UI表示用 |

### 使用箇所例

- `frontend/src/features/allocations/types/index.ts`（44-51行目） - **既存定義**
- `frontend/src/features/allocations/components/OrderCard.tsx` - 注文カード表示

### UI上の役割

- **注文カード**: 注文一覧でカード形式で表示する際の専用型
- **優先度判定**: 未引当数量や納期に基づいて優先度を色分け表示
- **KPIバッジ**: 未引当、納期残、必須欠落などのバッジ表示

### 備考

- **既存定義あり**: `allocations/types/index.ts` に定義済み
- UI専用のプロパティ（`priority`, `unallocatedQty` など）を含む
- 基底型 `Order` を継承し、計算フィールドとUIフラグを追加

---

## 4. ユーティリティ型パターン

---

## ListResponse[T] パターン（ページネーションなし）

### プロパティ一覧

| プロパティ名 | 型 | 説明 |
|-------------|-----|------|
| items | T[] | アイテムリスト（ジェネリック） |
| total | number | 総件数 |

### 使用箇所例

API型で多数定義されている：
- `WarehouseListResponse` - `items: WarehouseOut[]`, `total: number`
- `CustomerListResponse` - `items: CustomerResponse[]`
- `ProductListResponse` - `items: ProductResponse[]`
- `CandidateLotsResponse` - `items: CandidateLotItem[]`, `total: number`
- `AllocationListResponse` - `items: AllocationDetail[]`, `total: number`

### UI上の役割

- **一覧画面**: シンプルなリスト表示（ページネーション不要）
- **総件数表示**: 「全〇件」のような表示に使用

### 備考

- バックエンドの `ListResponse[T]` パターンと対応
- ページネーション付きの場合は `Page[T]`（`page`, `per_page` を含む）を使用
- フロントエンドで共通型として定義すれば、重複を削減できる

---

## PageResponse[T] パターン（ページネーション付き）

### プロパティ一覧

| プロパティ名 | 型 | 説明 |
|-------------|-----|------|
| items | T[] | アイテムリスト（ジェネリック） |
| total | number | 総件数 |
| page | number | 現在のページ番号 |
| pageSize | number | ページあたりの件数 |

### 使用箇所例

- `BatchJobListResponse` - `jobs: BatchJobResponse[]`, `total`, `page`, `page_size`
- `OperationLogListResponse` - `logs: OperationLogResponse[]`, `total`, `page`, `page_size`

### UI上の役割

- **一覧画面**: ページネーション付きリスト表示
- **ページネーションコンポーネント**: ページ切り替えUI

### 備考

- バックエンドの `Page[T]` と対応
- フロントエンド共通型として定義すべき

---

## 5. レガシーフィールドの問題

### 現状

多くの型定義で「DDL v2.2準拠フィールド」と「レガシーフィールド」が混在しています。

### 問題のあるパターン例

#### allocations/types/index.ts の `Order` 型

```typescript
export interface Order {
  id: number;
  order_number: string; // DDL v2.2
  customer_id: number; // DDL v2.2
  delivery_place_id: number; // DDL v2.2
  // ...
  // Legacy fields for backward compatibility
  order_no?: string; // ← レガシー
  customer_code?: string | null; // ← レガシー
  customer_name?: string; // ← レガシー
  delivery_place_code?: string | null; // ← レガシー
  delivery_place_name?: string | null; // ← レガシー
}
```

#### allocations/types/index.ts の `OrderLine` 型

```typescript
export type OrderLine = components["schemas"]["OrderLineResponse"] & {
  // Legacy fields for backward compatibility
  line_no?: number | null; // ← レガシー
  product_code?: string | null; // ← レガシー
  product_name?: string | null; // ← レガシー
  quantity?: number | string | null; // ← レガシー
  due_date?: string | null; // ← レガシー
}
```

### 推奨される対応

1. **新規型定義**: DDL v2.2準拠の型を新たに定義
2. **型エイリアス**: レガシー型を別名として残す（例: `LegacyOrder`）
3. **段階的移行**: コンポーネントを徐々に新型に移行
4. **移行期限**: レガシー型の削除期限を設定（例: 2026年2月）

---

## 6. ケース変換の問題（snake_case vs camelCase）

### 現状

- **API型**: OpenAPI生成の型は `snake_case`（例: `customer_code`, `order_number`）
- **フロントエンド慣習**: TypeScript/React では `camelCase` が一般的

### 問題点

```typescript
// API型をそのまま使う場合
const order: OrderResponse = { /* ... */ };
console.log(order.customer_id); // snake_case

// フロントエンド独自型を使う場合
const orderCard: OrderCardData = { /* ... */ };
console.log(orderCard.customerId); // camelCase ← 一貫性がない
```

### 推奨される対応

#### オプション1: API型をそのまま使用（現状維持）

- **メリット**: バックエンドとの整合性が高い、型変換不要
- **デメリット**: TypeScript/React慣習に反する

#### オプション2: ケース変換層を設ける

```typescript
// 変換ユーティリティ
function toFrontendOrder(apiOrder: components["schemas"]["OrderResponse"]): OrderDisplay {
  return {
    id: apiOrder.id,
    orderNumber: apiOrder.order_number,
    customerId: apiOrder.customer_id,
    // ...
  };
}
```

- **メリット**: フロントエンド慣習に従える
- **デメリット**: 変換コストがかかる、型定義が2倍になる

#### オプション3: 型エイリアスで両方サポート

```typescript
export type OrderResponse = components["schemas"]["OrderResponse"];
export type OrderDisplay = {
  id: number;
  orderNumber: string; // camelCase
  customerId: number;
  // ...
};
```

- **メリット**: 用途に応じて使い分けられる
- **デメリット**: 型定義が増える

### 現状の推奨

**オプション1（API型をそのまま使用）**を推奨します。理由：

- OpenAPI生成の型を活用できる
- バックエンドとの整合性が高い
- 変換コストがかからない
- ESLint/Prettierで一貫性を保てる

---

## 7. まとめと推奨アクション

### 高優先度（すぐに共通化を検討すべき）

#### 1. **マスタデータDisplay系の共通型定義**

**場所**: `frontend/src/shared/types/master-displays.ts`（新規作成）

```typescript
export type CustomerDisplay = {
  customerId: number; // または customer_id
  customerCode: string;
  customerName: string;
};

export type ProductDisplay = {
  productId: number;
  productCode: string; // 将来 makerPartCode に統一
  productName: string;
  unit: string;
};

export type WarehouseDisplay = {
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
};

export type DeliveryPlaceDisplay = {
  deliveryPlaceId: number;
  deliveryPlaceCode: string;
  deliveryPlaceName: string;
};

export type SupplierDisplay = {
  supplierId: number;
  supplierCode: string;
  supplierName: string;
};
```

**メリット**:
- コンポーネント間で一貫した型を使用できる
- バックエンドの `*Summary` 型と対応関係が明確

#### 2. **ListResponse / PageResponse の共通型定義**

**場所**: `frontend/src/shared/types/api-responses.ts`（新規作成）

```typescript
export type ListResponse<T> = {
  items: T[];
  total: number;
};

export type PageResponse<T> = ListResponse<T> & {
  page: number;
  pageSize: number; // または page_size
};
```

**メリット**:
- API型定義の重複を削減
- ページネーション付き/なしを明確に区別

#### 3. **レガシーフィールドの整理**

**場所**: `frontend/src/features/allocations/types/index.ts`

**アクション**:
- `Order` 型と `OrderLine` 型からレガシーフィールドを削除
- 必要に応じて `LegacyOrder` として別エイリアスを定義
- 使用箇所を段階的に移行

**移行期限**: 2026年2月（バックエンドAPI v2.2の移行期限と合わせる）

### 中優先度（段階的に検討）

#### 4. **ドメイン型の埋め込み型化**

**例**: `OrderHeaderSummary` に `CustomerDisplay` を埋め込む

```typescript
export type OrderHeaderSummary = {
  id: number;
  orderNumber: string;
  orderDate: string;
  status: string;
  customer: CustomerDisplay; // 埋め込み
  deliveryPlace: DeliveryPlaceDisplay; // 埋め込み
};
```

**メリット**:
- コンポーネントでの参照が簡潔になる（`order.customer.customerName`）
- マスタデータの取得漏れを防げる

**デメリット**:
- API型とフロントエンド型の変換が必要
- 型定義が増える

#### 5. **UI拡張型の標準化**

**場所**: `frontend/src/features/*/types/`

**アクション**:
- `OrderCardData` のようなUI拡張型を各フィーチャーで定義
- 共通パターン（`priority`, `hasMissingFields` など）を抽出し、ミックスインとして定義

### 低優先度（必要に応じて検討）

#### 6. **ケース変換の方針決定**

- 現状は `snake_case`（API型）のまま使用を推奨
- 将来的に `camelCase` に統一する場合は、変換層を設ける

#### 7. **ユーティリティ関数の型定義**

**例**: `formatCodeAndName()` の型定義

```typescript
export function formatCodeAndName(
  code: string | null | undefined,
  name: string | null | undefined
): string {
  if (code && name) return `${code} - ${name}`;
  return code || name || "—";
}
```

---

## 8. 優先度の高そうな候補トップ5

### 🥇 1位: マスタデータDisplay系の共通型定義

**理由**:
- 使用頻度が最も高い（注文、引当、在庫など多数のフィーチャーで使用）
- 現状、各所で `customer_code + customer_name` のような組み合わせが繰り返されている
- バックエンドの `*Summary` 型と対応関係が明確

**期待効果**:
- コンポーネント間の型の整合性向上
- バックエンドとの対応関係の明確化
- 表示ロジックの共通化（`formatCodeAndName()` など）

---

### 🥈 2位: レガシーフィールドの整理・削除

**理由**:
- DDL v2.2準拠とレガシーフィールドが混在し、混乱の原因
- 既存の `Order` 型、`OrderLine` 型に多数のレガシーフィールドが存在
- バックエンドAPI移行期限（2026年2月）に合わせて整理すべき

**期待効果**:
- 型定義の明確化
- 新規開発時の迷いを削減
- バックエンドとの整合性向上

---

### 🥉 3位: ListResponse / PageResponse の共通型定義

**理由**:
- 多数のAPI型で `items + total` パターンが繰り返されている
- ページネーション付き/なしが混在

**期待効果**:
- API型定義の重複削減
- ページネーション処理の標準化
- テーブルコンポーネントのprops型を統一

---

### 4位: ドメイン型の埋め込み型化（OrderHeaderSummary など）

**理由**:
- 注文詳細表示時に、顧客情報や納品先情報を別途取得する必要がある
- 埋め込み型にすることで、コンポーネントでの参照が簡潔になる

**期待効果**:
- コンポーネントコードの簡潔化
- マスタデータの取得漏れ防止
- 型安全性の向上

**注意点**:
- API型とフロントエンド型の変換が必要
- 型定義が増える
- パフォーマンスへの影響を検証すべき

---

### 5位: 既存 WarehouseSummary の共通型への昇格

**理由**:
- `frontend/src/features/allocations/types/index.ts` に既に定義されている
- 他のフィーチャーでも使いたい場面がある

**期待効果**:
- 既存定義の活用
- 倉庫情報表示の標準化

**アクション**:
- `shared/types/` に移動
- `totalStock` などのUI拡張フィールドは別型として分離

---

## 9. 次のステップ

1. **チーム内レビュー**: この候補リストをチームでレビューし、優先順位を合意
2. **共通型の定義**: `frontend/src/shared/types/` 配下に共通型を定義
   - `master-displays.ts` - マスタデータDisplay系
   - `api-responses.ts` - ListResponse / PageResponse
3. **段階的移行**: 既存コンポーネントを新しい共通型に徐々に移行
4. **レガシーフィールド削除**: DDL v2.2移行完了後、レガシーフィールドを削除
5. **ドキュメント更新**: 共通型の使用ガイドラインを CLAUDE.md に追加
6. **型チェック強化**: ESLint の型チェックルールを追加

---

## 10. 参考: バックエンド共通型との対応表

| フロントエンド共通型候補 | バックエンド共通型候補 | 備考 |
|----------------------|---------------------|------|
| `CustomerDisplay` | `CustomerSummary` | id + code + name |
| `ProductDisplay` | `ProductSummary` | id + code + name + unit |
| `WarehouseDisplay` | `WarehouseSummary` | id + code + name |
| `DeliveryPlaceDisplay` | `DeliveryPlaceSummary` | id + code + name |
| `SupplierDisplay` | `SupplierSummary` | id + code + name |
| `LotSummary` | `LotSummary` | ロット基本情報 |
| `AllocationSummary` | `AllocationSummary` | 引当基本情報 |
| `ListResponse[T]` | `ListResponse[T]` | items + total |
| `PageResponse[T]` | `Page[T]` | items + total + page + pageSize |

---

**注意**: このドキュメントは現状分析に基づく提案であり、実装前に必ずチーム内で議論・合意を行ってください。
