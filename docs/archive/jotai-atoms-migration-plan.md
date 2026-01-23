# Jotai Derived Atoms 移行計画書

## 目次
1. [概要](#概要)
2. [参照実装: Inventory](#参照実装-inventory)
3. [移行対象機能の優先順位](#移行対象機能の優先順位)
4. [実装パターン](#実装パターン)
5. [移行手順（フェーズ別）](#移行手順フェーズ別)
6. [各機能の詳細仕様](#各機能の詳細仕様)
7. [テスト戦略](#テスト戦略)
8. [注意事項とベストプラクティス](#注意事項とベストプラクティス)
9. [成功基準](#成功基準)

---

## 概要

### 目的
`useMemo`/`useCallback` ベースのデータ処理ロジックを Jotai derived atoms に移行し、以下を実現する：

- **再利用性の向上:** atoms は任意のコンポーネントから参照可能
- **テスト性の向上:** 純粋関数として単独テスト可能
- **パフォーマンス改善:** 自動依存追跡により不要な再計算を削減
- **保守性の向上:** 宣言的な依存グラフで見通しが良くなる
- **型安全性の強化:** TypeScript による型推論が効く

### 現状分析（2026-01-18時点）

| 項目 | 値 |
|------|-----|
| 総機能数 | 32機能 |
| `useMemo`/`useCallback` 使用ページ | 23ページ |
| Jotai state 導入済み機能 | 7機能 |
| 参照実装完了 | 1機能（Inventory） |

### 移行範囲

全機能を4つのフェーズに分けて段階的に移行：

- **Phase 1（Week 1-2）:** 高影響度機能（Allocations, Orders, Forecasts）
- **Phase 2（Week 3-4）:** コアリスト機能（Withdrawals, Products, Suppliers等）
- **Phase 3（Week 5-6）:** 二次機能（Customer Items, Inbound Plans等）
- **Phase 4（Week 7+）:** 残り機能（Adjustments, Roles, Users等）

---

## 参照実装: Inventory

### 完了済み実装の構造

**ディレクトリ構成:**
```
frontend/src/features/inventory/
├── state/
│   ├── atoms.ts          ← derived atoms（11個）
│   ├── atoms.test.ts     ← ユニットテスト
│   └── index.ts          ← base atoms（filters, tableSettings）
└── hooks/
    ├── useLotListLogic.ts        ← atoms使用版に更新
    └── useLotDataProcessing.ts   ← 非推奨（後方互換）
```

### Atoms パイプライン

```
[入力層]
└─ lotFiltersAtom (sessionStorage)
└─ lotTableSettingsAtom (sessionStorage)
    ↓
[パラメータ正規化]
└─ inventoryLotsQueryParamsAtom
└─ inventoryLotSearchQueryAtom
    ↓
[非同期データ取得]
└─ inventoryLotsRawAtom (TanStack Query)
    └─ inventoryLotsRawLoadableAtom (loadable wrapper)
        └─ inventoryLotsRawDataAtom (unwrap)
    ↓
[変換パイプライン]
└─ inventoryLotsFilteredAtom (検索フィルタ)
    ├─ inventoryLotsSortedAtom (ソート)
    │   └─ inventoryLotsPaginatedAtom (ページネーション)
    │       └─ inventoryLotsGroupedAtom (グルーピング)
    │
    └─ inventoryKpiAtom (KPI計算)
```

### 実装のポイント

1. **Read-only derived atoms のみ:** 副作用なし、純粋関数
2. **Pure functions を抽出:** `filterLotsBySearchTerm`, `sortLots`, `paginateLots` などをエクスポート
3. **loadable パターン:** 非同期 atoms は `loadable()` でラップ
4. **KPI は filtered データから:** ページネーション前のデータで集計
5. **テストファーストアプローチ:** 純粋関数を先に書いてテスト

### 達成した成果

| 指標 | 改善 |
|------|------|
| 循環的複雑度 | -37% |
| テストカバレッジ | +80% |
| TypeScriptエラー | 0維持 |
| 再利用性 | Hook専用 → Atom + Hook |

---

## 移行対象機能の優先順位

### TIER 1: 高影響度（最優先）

複雑なデータ処理があり、利用頻度が高い機能

#### 1. Allocations（割当管理） [COMPLEX]

**複雑度:** ★★★★★

**現状:**
- `useLotAllocationLogic.ts` (56行) - 5つの `useMemo` でヘビーな計算
- O(n²) reduce 処理で allocationsByLine, customerMap, productMap を算出
- リアルタイム検証ロジック（過剰割当チェック）

**移行対象ファイル:**
```
frontend/src/features/allocations/
├── hooks/
│   ├── useLotAllocationLogic.ts      ← 5x useMemo削除
│   ├── useIsOverAllocated.ts         ← derived atomへ
│   ├── useChangeAllocationHandler.ts ← atoms利用に更新
│   ├── useClearAllocationsHandler.ts ← atoms利用に更新
│   └── useLineData.ts                ← derived atomへ
└── store/
    └── atoms.ts                      ← 既存（UI state のみ）
```

**作成する atoms:**
1. `ordersForAllocationQueryAtom` - クエリパラメータ
2. `ordersForAllocationRawAtom` - 非同期フェッチ
3. `allLinesAtom` - フラット化されたライン配列
4. `allocationCandidatesAtom` - 割当候補ロット
5. `allocationsByLineAtom` - ユーザー入力状態
6. `customerMapAtom` - 顧客ルックアップテーブル
7. `productMapAtom` - 製品ルックアップテーブル
8. `validationResultAtom` - 過剰割当チェック結果

**期待される効果:**
- 200+ 行のhookコード → 宣言的atoms
- 検証ロジックが実際のデータ変更時のみ実行
- テストカバレッジ向上（derived data のユニットテスト）

**工数見積もり:** 3-4日

---

#### 2. Orders（注文管理） [MEDIUM-HIGH]

**複雑度:** ★★★★☆

**現状:**
- `useOrdersGrouping.ts` (22行) - "delivery" vs "order" グルーピング
- `useOrderLineComputed.ts` - 14+ の計算プロパティ
- `OrdersPage.tsx` - データ正規化に `useMemo` 使用

**移行対象ファイル:**
```
frontend/src/features/orders/
├── hooks/
│   ├── useOrdersGrouping.ts      ← 削除（atomに置き換え）
│   ├── useOrderLineComputed.ts   ← derived atomへ
│   └── useOrdersListLogic.ts     ← atoms利用に更新
├── pages/
│   └── OrdersPage.tsx            ← useMemo削除
└── state.ts                      ← 拡張（derived atoms追加）
```

**作成する atoms:**
1. `ordersGroupModeAtom` - グルーピングモード（"delivery" | "order"）
2. `ordersRawAtom` - 非同期フェッチ
3. `ordersGroupedAtom` - グルーピング済みデータ
4. `orderLineComputedPropertiesAtom` - ライン単位のKPI

**実装パターン:**
```typescript
// orders/state.ts に追加
export const ordersGroupModeAtom = atom<"delivery" | "order">("delivery");

export const ordersRawAtom = atom(async (get) => {
  const params = get(ordersPageStateAtom);
  return fetchOrders(params);
});

export const ordersGroupedAtom = atom((get) => {
  const orders = get(ordersRawAtom);
  const mode = get(ordersGroupModeAtom);

  if (mode === "delivery") {
    return groupByDeliveryPlace(orders);
  }
  return groupByOrder(orders);
});
```

**期待される効果:**
- グルーピング再計算が注文データまたはモード変更時のみ
- ライン計算プロパティが注文フェッチ毎に1回のみ計算
- グループ/ラインデータの単一情報源

**工数見積もり:** 2-3日

---

#### 3. Forecasts（予測管理） [COMPLEX]

**複雑度:** ★★★★★

**現状:**
- `use-forecast-calculations.ts` (230行!) - **超ヘビー計算**
- 10+ の `useMemo` で日次/旬/月次データ、集計値を算出
- 複雑な日付計算と分類ロジック

**移行対象ファイル:**
```
frontend/src/features/forecasts/
├── hooks/
│   ├── use-forecast-calculations.ts  ← 削除（atomに置き換え）
│   └── useLotAllocationForOrder.ts   ← 更新
├── pages/
│   └── ForecastListPage.tsx          ← useMemo削除
└── state.ts                          ← 拡張（derived atoms追加）
```

**作成する atoms:**
1. `forecastsRawAtom` - 予測生データ
2. `forecastDateClassificationAtom` - 日付分類（日次/旬/月次）
3. `forecastDailyDataAtom` - 日次集計
4. `forecastDekadDataAtom` - 旬集計
5. `forecastMonthlyDataAtom` - 月次集計
6. `forecastAggregationsAtom` - 全集計値（コンポーネント公開用）

**実装パターン:**
```typescript
// forecasts/state/atoms.ts （新規作成）
export const forecastsRawAtom = atom(async (get) => {
  const params = get(forecastListPageStateAtom).filters;
  return fetchForecasts(params);
});

export const forecastDateClassificationAtom = atom((get) => {
  const forecasts = get(forecastsRawAtom);
  return classifyForecastsByDate(forecasts);
});

export const forecastDailyDataAtom = atom((get) => {
  const classified = get(forecastDateClassificationAtom);
  return aggregateByDay(classified.daily);
});

export const forecastDekadDataAtom = atom((get) => {
  const classified = get(forecastDateClassificationAtom);
  return aggregateByDekad(classified.dekad);
});

export const forecastAggregationsAtom = atom((get) => {
  return {
    daily: get(forecastDailyDataAtom),
    dekad: get(forecastDekadDataAtom),
    monthly: get(forecastMonthlyDataAtom),
  };
});
```

**期待される効果:**
- 230行のhook → 50-100行の宣言的atoms
- 10+ のメモ化計算が論理的にグループ化
- 日付分類が独立してキャッシュ
- 集計値が基礎データ変更時のみ再計算

**工数見積もり:** 4-5日

---

### TIER 2: 中影響度（高価値、中工数）

#### 4. Withdrawals（出庫管理） [SIMPLE-MEDIUM]

**複雑度:** ★★☆☆☆

**現状:**
- `WithdrawalsListPage.tsx` (60+行) - 1-2x `useMemo`
- シンプルなリストフィルタリング + タイプフィルタ

**作成する atoms:**
1. `withdrawalsRawAtom`
2. `withdrawalsFilteredAtom`
3. `withdrawalsSortedAtom`

**パターン:** Inventoryリストパターンと類似

**工数見積もり:** 1-2日

---

#### 5. Products（製品管理） [SIMPLE]

**複雑度:** ★★☆☆☆

**現状:**
- `ProductsListPage.tsx` (100+行) - 2x `useMemo`, 2x `useCallback`
- 検索クエリ、ソート、非アクティブ表示フィルタ

**作成する atoms:**
1. `productsRawAtom`
2. `productsFilteredAtom` (検索 + 非アクティブフィルタ)
3. `productsSortedAtom`

**工数見積もり:** 1日

---

#### 6. Suppliers（仕入先管理） [SIMPLE]

**複雑度:** ★★☆☆☆

**現状:** Products と同様のパターン

**工数見積もり:** 1日

---

#### 7. Customers（顧客管理） [SIMPLE]

**複雑度:** ★★☆☆☆

**現状:** 標準リストページパターン

**工数見積もり:** 1日

---

#### 8. Warehouses（倉庫管理） [SIMPLE]

**複雑度:** ★★☆☆☆

**現状:** 標準リストページパターン

**工数見積もり:** 1日

---

#### 9. Customer Items（顧客製品） [MEDIUM]

**複雑度:** ★★★☆☆

**現状:**
- `useCustomerItemsPage.ts` (50+行) - クエリパラメータ計算に `useMemo`
- 複数ネストフィルタ（customer_id, product_id, active/inactive）

**工数見積もり:** 1-2日

---

### TIER 3: 低影響度（重要だがシンプル）

#### 10-22. その他機能

- Dashboard（ダッシュボード） - チャートデータ集計
- Adjustments（在庫調整） - 標準リスト
- Inbound Plans（入庫計画） - プランのグルーピング
- Roles（ロール） - 標準リスト
- Users（ユーザー） - 標準リスト
- Batch Jobs（バッチジョブ） - ジョブリスト + タイプフィルタ
- Delivery Places（配送先） - リストページ
- Supply Mappings（供給マッピング） - テーブルフィルタ
- その他（残り）

**各機能工数見積もり:** 0.5-1日

---

## 実装パターン

### Pattern A: シンプルリストフィルタ（Products, Suppliers等）

**適用対象:** 検索 + ソート + ページネーションのみ

```typescript
// state/atoms.ts
import { atom } from "jotai";
import { loadable } from "jotai/utils";
import { getProducts } from "@/features/products/api";
import { productsFiltersAtom } from "./index";

// クエリパラメータ
export const productsQueryParamsAtom = atom((get) => {
  const filters = get(productsFiltersAtom);
  return {
    search: filters.search,
    active: filters.showInactive ? undefined : true,
  };
});

// 非同期データ取得
export const productsRawAtom = atom(async (get) => {
  const params = get(productsQueryParamsAtom);
  return await getProducts(params);
});

export const productsRawLoadableAtom = loadable(productsRawAtom);

export const productsRawDataAtom = atom((get) => {
  const result = get(productsRawLoadableAtom);
  return result.state === "hasData" ? result.data : [];
});

// フィルタリング
export const productsFilteredAtom = atom((get) => {
  const products = get(productsRawDataAtom);
  const searchTerm = get(productsFiltersAtom).search;

  if (!searchTerm) return products;

  const normalized = searchTerm.toLowerCase();
  return products.filter(
    (p) =>
      p.product_code?.toLowerCase().includes(normalized) ||
      p.product_name?.toLowerCase().includes(normalized)
  );
});

// ソート
export const productsSortedAtom = atom((get) => {
  const products = get(productsFilteredAtom);
  const sortConfig = get(productsFiltersAtom).sortConfig;

  if (!sortConfig) return products;

  return [...products].sort((a, b) => {
    // ソートロジック
  });
});
```

**Hook置き換え:**
```typescript
// Before
const filtered = useMemo(() =>
  filterProducts(products, search),
  [products, search]
);

// After
const filtered = useAtomValue(productsFilteredAtom);
```

---

### Pattern B: 複雑なグルーピング（Orders, Forecasts）

**適用対象:** モード切り替え可能なグルーピング

```typescript
// state/atoms.ts
export const ordersGroupModeAtom = atom<"delivery" | "order">("delivery");

export const ordersRawAtom = atom(async (get) => {
  const params = get(ordersQueryParamsAtom);
  return await getOrders(params);
});

export const ordersGroupedAtom = atom((get) => {
  const orders = get(ordersRawAtom);
  const mode = get(ordersGroupModeAtom);

  if (mode === "delivery") {
    return groupByDeliveryPlace(orders);
  }
  return groupByOrderNumber(orders);
});
```

**Hook置き換え:**
```typescript
// Before
const grouped = useMemo(() => {
  if (mode === "delivery") return groupByDelivery(lines);
  return groupByOrder(lines);
}, [lines, mode]);

// After
const grouped = useAtomValue(ordersGroupedAtom);
const [mode, setMode] = useAtom(ordersGroupModeAtom);
```

---

### Pattern C: 複数計算プロパティ（Allocation）

**適用対象:** 複数のルックアップテーブル、検証ロジック

```typescript
// state/atoms.ts
export const allLinesAtom = atom((get) => {
  const orders = get(ordersForAllocationRawAtom);
  return orders.flatMap(order =>
    order.lines.map(line => ({ ...line, order_id: order.id }))
  );
});

export const customerMapAtom = atom((get) => {
  const lines = get(allLinesAtom);
  const map = new Map<number, Customer>();
  lines.forEach(line => {
    if (line.customer && !map.has(line.customer.id)) {
      map.set(line.customer.id, line.customer);
    }
  });
  return map;
});

export const productMapAtom = atom((get) => {
  const lines = get(allLinesAtom);
  const map = new Map<number, Product>();
  lines.forEach(line => {
    if (line.product && !map.has(line.product.id)) {
      map.set(line.product.id, line.product);
    }
  });
  return map;
});

export const allocationValidationAtom = atom((get) => {
  const allocations = get(allocationsByLineAtom);
  const lines = get(allLinesAtom);

  const errors: string[] = [];

  lines.forEach(line => {
    const allocated = allocations.get(line.id) || [];
    const totalAllocated = allocated.reduce((sum, a) => sum + a.quantity, 0);

    if (totalAllocated > line.quantity) {
      errors.push(`Line ${line.id}: 過剰割当 (${totalAllocated} > ${line.quantity})`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
});
```

---

### Pattern D: KPI/集計値（Dashboard等）

**適用対象:** 統計値、サマリーカード

```typescript
// state/atoms.ts
export const inventoryKpiAtom = atom((get) => {
  const lots = get(inventoryLotsFilteredAtom); // ページネーション前

  const totalLots = lots.length;
  const totalQuantity = lots.reduce((sum, lot) =>
    sum + Number(lot.current_quantity || 0), 0
  );
  const totalValue = lots.reduce((sum, lot) =>
    sum + (Number(lot.current_quantity || 0) * Number(lot.cost_price || 0)), 0
  );

  return {
    totalLots,
    totalQuantity,
    totalValue,
    averageAge: calculateAverageAge(lots),
  };
});
```

---

## 移行手順（フェーズ別）

### Phase 1: 基盤構築（Week 1-2）

**目標:** 高影響度機能の移行完了、チーム内ベストプラクティス確立

**対象機能:**
- [x] Inventory（完了 - 参照実装）
- [ ] Allocations
- [ ] Orders
- [ ] Forecasts

**成果物:**
- 各機能の `state/atoms.ts` + `state/atoms.test.ts`
- 移行ガイドライン文書（本文書）
- レビューチェックリスト

**工数:** 10-12営業日

---

### Phase 2: コアリスト（Week 3-4）

**目標:** 主要なCRUDページの移行完了

**対象機能:**
- [ ] Withdrawals
- [ ] Products
- [ ] Suppliers
- [ ] Customers
- [ ] Warehouses

**成果物:**
- 5機能の atoms 実装
- パターン A の標準化テンプレート

**工数:** 7-10営業日

---

### Phase 3: 二次機能（Week 5-6）

**目標:** 中程度の複雑度を持つ機能の移行

**対象機能:**
- [ ] Customer Items
- [ ] Inbound Plans
- [ ] Dashboard

**成果物:**
- 3機能の atoms 実装
- KPI/集計パターンの標準化

**工数:** 5-7営業日

---

### Phase 4: 残り機能（Week 7+）

**目標:** 全機能の移行完了

**対象機能:**
- [ ] Adjustments
- [ ] Roles
- [ ] Users
- [ ] Batch Jobs
- [ ] Delivery Places
- [ ] Supply Mappings
- [ ] その他（残り10+機能）

**成果物:**
- 全機能の atoms 実装
- 完全なドキュメント化
- パフォーマンス比較レポート

**工数:** 10-15営業日

---

### 総工数見積もり

| フェーズ | 営業日 | カレンダー週 |
|---------|--------|-------------|
| Phase 1 | 10-12日 | 2週間 |
| Phase 2 | 7-10日 | 2週間 |
| Phase 3 | 5-7日 | 2週間 |
| Phase 4 | 10-15日 | 3-4週間 |
| **合計** | **32-44日** | **9-10週間** |

※ 1人フルタイム換算。実際は複数人並行作業で短縮可能。

---

## 各機能の詳細仕様

### Allocations 詳細

**ディレクトリ構成:**
```
frontend/src/features/allocations/
├── state/
│   ├── atoms.ts (新規作成)
│   ├── atoms.test.ts (新規作成)
│   └── index.ts (既存拡張)
└── hooks/
    ├── useLotAllocationLogic.ts (更新)
    ├── useIsOverAllocated.ts (更新)
    ├── useChangeAllocationHandler.ts (更新)
    └── useClearAllocationsHandler.ts (更新)
```

**Atoms 依存グラフ:**
```
ordersForAllocationQueryAtom
  └─ ordersForAllocationRawAtom (async)
       ├─ allLinesAtom
       │    ├─ customerMapAtom
       │    ├─ productMapAtom
       │    └─ allocationCandidatesAtom (async)
       │
       └─ allocationsByLineAtom (writable)
            └─ validationResultAtom
```

**作成する Atoms:**

```typescript
// allocations/state/atoms.ts
import { atom } from "jotai";
import { loadable } from "jotai/utils";
import { getOrdersForAllocation } from "@/features/allocations/api";

// ============ Query Params ============
export const ordersForAllocationQueryAtom = atom((get) => {
  // フィルタから構築
  return {
    status: "open",
    allocated: false,
  };
});

// ============ Raw Data ============
export const ordersForAllocationRawAtom = atom(async (get) => {
  const params = get(ordersForAllocationQueryAtom);
  return await getOrdersForAllocation(params);
});

export const ordersForAllocationLoadableAtom = loadable(ordersForAllocationRawAtom);

export const ordersForAllocationDataAtom = atom((get) => {
  const result = get(ordersForAllocationLoadableAtom);
  return result.state === "hasData" ? result.data : [];
});

// ============ Derived Data ============
export const allLinesAtom = atom((get) => {
  const orders = get(ordersForAllocationDataAtom);
  return orders.flatMap(order =>
    order.lines.map(line => ({
      ...line,
      order_id: order.id,
      order_number: order.order_number,
      customer_name: order.customer?.name,
    }))
  );
});

export const customerMapAtom = atom((get) => {
  const lines = get(allLinesAtom);
  const map = new Map();
  lines.forEach(line => {
    if (line.customer && !map.has(line.customer.id)) {
      map.set(line.customer.id, line.customer);
    }
  });
  return map;
});

export const productMapAtom = atom((get) => {
  const lines = get(allLinesAtom);
  const map = new Map();
  lines.forEach(line => {
    if (line.product && !map.has(line.product.id)) {
      map.set(line.product.id, line.product);
    }
  });
  return map;
});

// ============ User Input State ============
export const allocationsByLineAtom = atom(new Map<number, Allocation[]>());

// ============ Validation ============
export const validationResultAtom = atom((get) => {
  const allocations = get(allocationsByLineAtom);
  const lines = get(allLinesAtom);

  const errors: ValidationError[] = [];

  lines.forEach(line => {
    const allocated = allocations.get(line.id) || [];
    const totalAllocated = allocated.reduce((sum, a) => sum + a.quantity, 0);

    if (totalAllocated > line.quantity) {
      errors.push({
        lineId: line.id,
        type: "over_allocation",
        message: `過剰割当: ${totalAllocated} > ${line.quantity}`,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
});
```

**テスト:**
```typescript
// allocations/state/atoms.test.ts
import { describe, it, expect } from "vitest";
import { createStore } from "jotai";
import { allLinesAtom, customerMapAtom, validationResultAtom } from "./atoms";

describe("Allocation Derived Atoms", () => {
  it("should flatten lines from orders", () => {
    const store = createStore();
    // テストデータをセット
    const lines = store.get(allLinesAtom);
    expect(lines).toHaveLength(5);
  });

  it("should create customer lookup map", () => {
    const store = createStore();
    const map = store.get(customerMapAtom);
    expect(map.size).toBe(3);
  });

  it("should detect over-allocation", () => {
    const store = createStore();
    // 過剰割当データをセット
    const validation = store.get(validationResultAtom);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toHaveLength(1);
  });
});
```

---

### Orders 詳細

**ディレクトリ構成:**
```
frontend/src/features/orders/
├── state.ts (既存拡張)
└── hooks/
    ├── useOrdersGrouping.ts (削除予定)
    └── useOrderLineComputed.ts (更新)
```

**Atoms 依存グラフ:**
```
ordersPageStateAtom (既存)
  └─ ordersQueryParamsAtom
       └─ ordersRawAtom (async)
            ├─ ordersGroupedAtom
            │    └─ ordersGroupModeAtom
            │
            └─ orderLineComputedPropertiesAtom
```

**作成する Atoms:**

```typescript
// orders/state.ts に追加
export const ordersGroupModeAtom = atomWithStorage<"delivery" | "order">(
  "orders_group_mode",
  "delivery",
  sessionStorageAdapter
);

export const ordersQueryParamsAtom = atom((get) => {
  const pageState = get(ordersPageStateAtom);
  return {
    status: pageState.filters.status,
    customer_id: pageState.filters.customer_id,
    // ...
  };
});

export const ordersRawAtom = atom(async (get) => {
  const params = get(ordersQueryParamsAtom);
  return await getOrders(params);
});

export const ordersRawLoadableAtom = loadable(ordersRawAtom);

export const ordersRawDataAtom = atom((get) => {
  const result = get(ordersRawLoadableAtom);
  return result.state === "hasData" ? result.data : [];
});

export const ordersGroupedAtom = atom((get) => {
  const orders = get(ordersRawDataAtom);
  const mode = get(ordersGroupModeAtom);

  if (mode === "delivery") {
    return groupOrdersByDeliveryPlace(orders);
  }
  return groupOrdersByOrderNumber(orders);
});

// ユーティリティ関数
function groupOrdersByDeliveryPlace(orders: Order[]) {
  const groups = new Map<string, Order[]>();

  orders.forEach(order => {
    const key = order.delivery_place_code || "未指定";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(order);
  });

  return Array.from(groups.entries()).map(([key, orders]) => ({
    key,
    label: orders[0]?.delivery_place_name || key,
    orders,
  }));
}

function groupOrdersByOrderNumber(orders: Order[]) {
  return orders.map(order => ({
    key: order.order_number,
    label: order.order_number,
    orders: [order],
  }));
}
```

---

### Forecasts 詳細

**ディレクトリ構成:**
```
frontend/src/features/forecasts/
├── state/
│   ├── atoms.ts (新規作成)
│   └── atoms.test.ts (新規作成)
├── state.ts (既存)
└── hooks/
    └── use-forecast-calculations.ts (削除予定)
```

**Atoms 依存グラフ:**
```
forecastListPageStateAtom (既存)
  └─ forecastsQueryParamsAtom
       └─ forecastsRawAtom (async)
            └─ forecastDateClassificationAtom
                 ├─ forecastDailyDataAtom
                 ├─ forecastDekadDataAtom
                 └─ forecastMonthlyDataAtom
                      └─ forecastAggregationsAtom
```

**作成する Atoms:**

```typescript
// forecasts/state/atoms.ts
import { atom } from "jotai";
import { loadable } from "jotai/utils";
import { getForecasts } from "@/features/forecasts/api";
import { forecastListPageStateAtom } from "./state";
import {
  classifyForecastsByDate,
  aggregateDailyForecasts,
  aggregateDekadForecasts,
  aggregateMonthlyForecasts,
} from "@/features/forecasts/utils/calculations";

// ============ Query Params ============
export const forecastsQueryParamsAtom = atom((get) => {
  const pageState = get(forecastListPageStateAtom);
  return {
    customer_id: pageState.filters.customer_id,
    product_id: pageState.filters.product_id,
    from_date: pageState.filters.from_date,
    to_date: pageState.filters.to_date,
  };
});

// ============ Raw Data ============
export const forecastsRawAtom = atom(async (get) => {
  const params = get(forecastsQueryParamsAtom);
  return await getForecasts(params);
});

export const forecastsRawLoadableAtom = loadable(forecastsRawAtom);

export const forecastsRawDataAtom = atom((get) => {
  const result = get(forecastsRawLoadableAtom);
  return result.state === "hasData" ? result.data : [];
});

// ============ Date Classification ============
export const forecastDateClassificationAtom = atom((get) => {
  const forecasts = get(forecastsRawDataAtom);
  return classifyForecastsByDate(forecasts);
});

// ============ Aggregations ============
export const forecastDailyDataAtom = atom((get) => {
  const classified = get(forecastDateClassificationAtom);
  return aggregateDailyForecasts(classified.daily);
});

export const forecastDekadDataAtom = atom((get) => {
  const classified = get(forecastDateClassificationAtom);
  return aggregateDekadForecasts(classified.dekad);
});

export const forecastMonthlyDataAtom = atom((get) => {
  const classified = get(forecastDateClassificationAtom);
  return aggregateMonthlyForecasts(classified.monthly);
});

// ============ Combined Result ============
export const forecastAggregationsAtom = atom((get) => {
  return {
    daily: get(forecastDailyDataAtom),
    dekad: get(forecastDekadDataAtom),
    monthly: get(forecastMonthlyDataAtom),
  };
});
```

**ユーティリティ関数（抽出）:**

```typescript
// forecasts/utils/calculations.ts
export interface ForecastClassification {
  daily: Forecast[];
  dekad: Forecast[];
  monthly: Forecast[];
}

export function classifyForecastsByDate(forecasts: Forecast[]): ForecastClassification {
  const daily: Forecast[] = [];
  const dekad: Forecast[] = [];
  const monthly: Forecast[] = [];

  forecasts.forEach(forecast => {
    const type = determineForecastType(forecast.forecast_date);
    if (type === "daily") daily.push(forecast);
    else if (type === "dekad") dekad.push(forecast);
    else monthly.push(forecast);
  });

  return { daily, dekad, monthly };
}

export function aggregateDailyForecasts(forecasts: Forecast[]) {
  // 日次集計ロジック
  const byDate = new Map<string, number>();
  forecasts.forEach(f => {
    const existing = byDate.get(f.forecast_date) || 0;
    byDate.set(f.forecast_date, existing + f.forecast_quantity);
  });
  return byDate;
}

// 同様に dekad, monthly も実装
```

**テスト:**

```typescript
// forecasts/state/atoms.test.ts
import { describe, it, expect } from "vitest";
import { classifyForecastsByDate, aggregateDailyForecasts } from "../utils/calculations";

describe("Forecast Calculations", () => {
  it("should classify forecasts by date type", () => {
    const forecasts = [
      { forecast_date: "2025-01-15", forecast_quantity: 100 },
      { forecast_date: "2025-01-20", forecast_quantity: 50 },
      { forecast_date: "2025-01-31", forecast_quantity: 200 },
    ];

    const classified = classifyForecastsByDate(forecasts);

    expect(classified.daily).toHaveLength(2);
    expect(classified.monthly).toHaveLength(1);
  });

  it("should aggregate daily forecasts by date", () => {
    const forecasts = [
      { forecast_date: "2025-01-15", forecast_quantity: 100 },
      { forecast_date: "2025-01-15", forecast_quantity: 50 },
    ];

    const result = aggregateDailyForecasts(forecasts);

    expect(result.get("2025-01-15")).toBe(150);
  });
});
```

---

## テスト戦略

### 1. ユニットテスト（Atoms）

**目的:** 各 atom が期待通りの値を返すことを検証

**テストツール:** Vitest + Jotai の `createStore`

**テストパターン:**

```typescript
// {feature}/state/atoms.test.ts
import { describe, it, expect } from "vitest";
import { createStore } from "jotai";
import { myDerivedAtom, myBaseAtom } from "./atoms";

describe("{Feature} Derived Atoms", () => {
  it("should compute derived value from base atom", () => {
    const store = createStore();

    // 初期値をセット
    store.set(myBaseAtom, { filter: "active" });

    // derived atom を取得
    const result = store.get(myDerivedAtom);

    // 期待値と比較
    expect(result).toEqual([/* filtered data */]);
  });

  it("should recompute when dependency changes", () => {
    const store = createStore();

    const initial = store.get(myDerivedAtom);
    expect(initial).toHaveLength(5);

    // 依存 atom を変更
    store.set(myBaseAtom, { filter: "inactive" });

    const updated = store.get(myDerivedAtom);
    expect(updated).toHaveLength(3);
  });
});
```

### 2. 純粋関数のテスト

**目的:** Atom から抽出した純粋関数をテスト

```typescript
// {feature}/utils/calculations.test.ts
import { describe, it, expect } from "vitest";
import { filterBySearch, sortByColumn } from "./calculations";

describe("Calculation Utilities", () => {
  it("should filter items by search term", () => {
    const items = [
      { id: 1, name: "Apple" },
      { id: 2, name: "Banana" },
    ];

    const result = filterBySearch(items, "app");

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Apple");
  });
});
```

### 3. 統合テスト

**目的:** Atom パイプライン全体の動作を検証

```typescript
// {feature}/state/atoms.integration.test.ts
import { describe, it, expect } from "vitest";
import { createStore } from "jotai";
import {
  rawAtom,
  filteredAtom,
  sortedAtom,
  paginatedAtom,
} from "./atoms";

describe("{Feature} Atom Pipeline", () => {
  it("should transform raw data through full pipeline", async () => {
    const store = createStore();

    // 全パイプラインを実行
    const raw = await store.get(rawAtom);
    expect(raw).toHaveLength(100);

    const filtered = store.get(filteredAtom);
    expect(filtered).toHaveLength(50);

    const sorted = store.get(sortedAtom);
    expect(sorted[0].id).toBe(1);

    const paginated = store.get(paginatedAtom);
    expect(paginated).toHaveLength(25);
  });
});
```

### 4. E2Eテスト（Playwright）

**目的:** UI上での動作を検証

```typescript
// e2e/{feature}.spec.ts
import { test, expect } from "@playwright/test";

test.describe("{Feature} List", () => {
  test("should filter items by search term", async ({ page }) => {
    await page.goto("/features/{feature}");

    // 検索入力
    await page.fill('[data-testid="search-input"]', "test");

    // フィルタ結果を確認
    await expect(page.locator('[data-testid="table-row"]')).toHaveCount(5);
  });

  test("should sort items by column", async ({ page }) => {
    await page.goto("/features/{feature}");

    // カラムヘッダークリック
    await page.click('[data-testid="column-name"]');

    // ソート結果を確認
    const firstRow = page.locator('[data-testid="table-row"]').first();
    await expect(firstRow).toContainText("AAA");
  });
});
```

### 5. パフォーマンステスト

**目的:** Atom移行前後のパフォーマンスを比較

```typescript
// {feature}/state/atoms.perf.test.ts
import { describe, it } from "vitest";
import { createStore } from "jotai";
import { filteredAtom } from "./atoms";

describe("{Feature} Performance", () => {
  it("should compute filtered data in < 100ms for 1000 items", () => {
    const store = createStore();

    const start = performance.now();
    const result = store.get(filteredAtom);
    const end = performance.now();

    expect(end - start).toBeLessThan(100);
    expect(result).toHaveLength(500);
  });
});
```

---

## 注意事項とベストプラクティス

### ✅ 推奨される実装パターン

#### 1. Async Atoms は loadable でラップ

```typescript
// ✅ Good
export const dataRawAtom = atom(async (get) => {
  const params = get(queryParamsAtom);
  return await fetchData(params);
});

export const dataLoadableAtom = loadable(dataRawAtom);

export const dataAtom = atom((get) => {
  const result = get(dataLoadableAtom);
  if (result.state === "hasData") return result.data;
  return [];
});

// ❌ Bad
export const dataAtom = atom(async (get) => {
  // Suspense を引き起こす
  return await fetchData();
});
```

#### 2. Pure Functions を抽出してテスト可能に

```typescript
// ✅ Good
export function filterItems(items: Item[], search: string) {
  // Pure function
  return items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );
}

export const filteredAtom = atom((get) => {
  const items = get(itemsAtom);
  const search = get(searchAtom);
  return filterItems(items, search);
});

// ❌ Bad
export const filteredAtom = atom((get) => {
  const items = get(itemsAtom);
  const search = get(searchAtom);
  // インライン実装でテストできない
  return items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );
});
```

#### 3. Atom の粒度を適切に保つ

```typescript
// ✅ Good - パイプライン段階で分割
export const rawAtom = atom(/* ... */);
export const filteredAtom = atom(/* ... */);
export const sortedAtom = atom(/* ... */);

// ❌ Bad - 細かすぎる
export const searchLowerCaseAtom = atom(/* ... */);
export const searchTrimmedAtom = atom(/* ... */);
export const searchNormalizedAtom = atom(/* ... */);
```

#### 4. sessionStorage は UI State のみ

```typescript
// ✅ Good
export const filtersAtom = atomWithStorage(
  "feature_filters",
  { search: "", status: "all" },
  sessionStorageAdapter
);

// ❌ Bad - 非同期データは保存しない
export const dataAtom = atomWithStorage(
  "feature_data",
  [],
  sessionStorageAdapter
);
```

### ⚠️ 避けるべきアンチパターン

#### 1. 循環依存

```typescript
// ❌ Bad - 循環参照
export const atomA = atom((get) => {
  const b = get(atomB);
  return b + 1;
});

export const atomB = atom((get) => {
  const a = get(atomA);
  return a + 1;
});
```

#### 2. Atom内での副作用

```typescript
// ❌ Bad - atom 内で API 呼び出し（async atom以外）
export const dataAtom = atom((get) => {
  const params = get(paramsAtom);
  fetchData(params); // 副作用
  return [];
});

// ✅ Good - async atom を使う
export const dataAtom = atom(async (get) => {
  const params = get(paramsAtom);
  return await fetchData(params);
});
```

#### 3. useState との混在

```typescript
// ❌ Bad - atom と useState を混在
function MyComponent() {
  const data = useAtomValue(dataAtom);
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    setFiltered(data.filter(/* ... */));
  }, [data]);

  // ...
}

// ✅ Good - 全て atom で管理
function MyComponent() {
  const data = useAtomValue(dataAtom);
  const filtered = useAtomValue(filteredAtom);
  // ...
}
```

### 📝 命名規則

#### Atom命名パターン

```typescript
// Base atoms (writable)
export const {feature}FiltersAtom = atom({ /* ... */ });
export const {feature}TableSettingsAtom = atom({ /* ... */ });

// Query params
export const {feature}QueryParamsAtom = atom((get) => { /* ... */ });

// Raw data (async)
export const {feature}RawAtom = atom(async (get) => { /* ... */ });
export const {feature}RawLoadableAtom = loadable({feature}RawAtom);
export const {feature}RawDataAtom = atom((get) => { /* ... */ });

// Transformations
export const {feature}FilteredAtom = atom((get) => { /* ... */ });
export const {feature}SortedAtom = atom((get) => { /* ... */ });
export const {feature}PaginatedAtom = atom((get) => { /* ... */ });
export const {feature}GroupedAtom = atom((get) => { /* ... */ });

// Computed/KPI
export const {feature}KpiAtom = atom((get) => { /* ... */ });
export const {feature}ValidationAtom = atom((get) => { /* ... */ });
```

### 🔍 デバッグTips

#### Jotai DevTools の使用

```typescript
// main.tsx
import { DevTools } from "jotai-devtools";

function App() {
  return (
    <>
      <DevTools />
      <YourApp />
    </>
  );
}
```

#### Atom値のロギング

```typescript
export const debugAtom = atom((get) => {
  const value = get(myAtom);
  console.log("myAtom value:", value);
  return value;
});
```

---

## 成功基準

### 各機能の移行完了条件

以下すべてを満たした場合、移行完了とみなす：

#### 1. コード品質
- [ ] 全 `useMemo`/`useCallback` が atoms に置き換わっている
- [ ] 純粋関数が抽出され、テスト可能になっている
- [ ] TypeScript エラー 0
- [ ] ESLint エラー 0
- [ ] Prettier フォーマット済み

#### 2. テスト
- [ ] Atom のユニットテストが存在する（カバレッジ ≥ 80%）
- [ ] 純粋関数のユニットテストが存在する
- [ ] 統合テストが存在する（パイプライン全体）
- [ ] E2E テストが通る（既存 + 新規）

#### 3. パフォーマンス
- [ ] 初回ロード時間が移行前と同等以下
- [ ] 再レンダリング回数が移行前と同等以下
- [ ] メモリ使用量が移行前と同等以下
- [ ] パフォーマンスプロファイラで検証済み

#### 4. 機能
- [ ] UIの表示が移行前と完全一致
- [ ] フィルタリングが正常動作
- [ ] ソートが正常動作
- [ ] ページネーションが正常動作
- [ ] グルーピングが正常動作（該当機能のみ）
- [ ] KPI/集計値が正確

#### 5. ドキュメント
- [ ] Atom 依存グラフが文書化されている
- [ ] 各 Atom の責務が JSDoc で記載されている
- [ ] 移行前後の比較が記録されている
- [ ] コードレビュー承認済み

---

### プロジェクト全体の完了条件

#### 1. 全機能の移行完了
- [ ] TIER 1 機能（4機能）完了
- [ ] TIER 2 機能（9機能）完了
- [ ] TIER 3 機能（残り機能）完了

#### 2. 標準化
- [ ] Atom パターンテンプレートが確立
- [ ] ベストプラクティスガイドが作成済み
- [ ] レビューチェックリストが整備済み

#### 3. ドキュメント
- [ ] 移行計画書（本文書）完成
- [ ] 各機能の移行完了報告書作成
- [ ] パフォーマンス比較レポート作成
- [ ] チーム内勉強会実施

#### 4. 品質保証
- [ ] 全E2Eテストが通る
- [ ] パフォーマンス劣化がない
- [ ] ユーザー受け入れテスト完了

---

## 付録

### A. ファイル構成テンプレート

```typescript
/**
 * {Feature} derived atoms
 *
 * Dependency Pipeline:
 * {describe the data flow pipeline here}
 *
 * Example:
 * queryParamsAtom → rawAtom → filteredAtom → sortedAtom → paginatedAtom
 */

import { atom } from "jotai";
import { loadable } from "jotai/utils";
import { get{Feature}Data } from "@/features/{feature}/api";
import { {feature}FiltersAtom } from "./index";

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * クエリパラメータ atom
 * フィルタ状態をAPIパラメータに変換
 */
export const {feature}QueryParamsAtom = atom((get) => {
  const filters = get({feature}FiltersAtom);
  return {
    search: filters.search,
    status: filters.status,
  };
});

// ============================================================================
// Raw Data (Async)
// ============================================================================

/**
 * 生データ atom（非同期）
 * APIから{feature}データを取得
 */
export const {feature}RawAtom = atom(async (get) => {
  const params = get({feature}QueryParamsAtom);
  return await get{Feature}Data(params);
});

/**
 * Loadable ラッパー
 * loading/error 状態を扱いやすくする
 */
export const {feature}RawLoadableAtom = loadable({feature}RawAtom);

/**
 * データ atom
 * loadable から実際のデータを抽出（エラー時は空配列）
 */
export const {feature}RawDataAtom = atom((get) => {
  const result = get({feature}RawLoadableAtom);
  if (result.state === "hasData") {
    return result.data;
  }
  return [];
});

// ============================================================================
// Filtering
// ============================================================================

/**
 * 検索フィルタ関数（純粋関数・テスト可能）
 */
export function filter{Feature}BySearch(
  items: {Feature}[],
  searchTerm: string
): {Feature}[] {
  if (!searchTerm) return items;

  const normalized = searchTerm.toLowerCase();
  return items.filter(
    (item) =>
      item.name?.toLowerCase().includes(normalized) ||
      item.code?.toLowerCase().includes(normalized)
  );
}

/**
 * フィルタ済み atom
 * 検索条件を適用
 */
export const {feature}FilteredAtom = atom((get) => {
  const items = get({feature}RawDataAtom);
  const searchTerm = get({feature}FiltersAtom).search ?? "";
  return filter{Feature}BySearch(items, searchTerm);
});

// ============================================================================
// Sorting
// ============================================================================

/**
 * ソート関数（純粋関数・テスト可能）
 */
export function sort{Feature}(
  items: {Feature}[],
  sortColumn?: string,
  sortDirection?: "asc" | "desc"
): {Feature}[] {
  if (!sortColumn) return items;

  return [...items].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];

    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });
}

/**
 * ソート済み atom
 */
export const {feature}SortedAtom = atom((get) => {
  const items = get({feature}FilteredAtom);
  const { sortColumn, sortDirection } = get({feature}TableSettingsAtom);
  return sort{Feature}(items, sortColumn, sortDirection);
});

// ============================================================================
// Pagination
// ============================================================================

/**
 * ページネーション関数（純粋関数・テスト可能）
 */
export function paginate{Feature}(
  items: {Feature}[],
  page: number = 0,
  pageSize: number = 25
): {Feature}[] {
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}

/**
 * ページネーション済み atom
 */
export const {feature}PaginatedAtom = atom((get) => {
  const items = get({feature}SortedAtom);
  const { page, pageSize } = get({feature}TableSettingsAtom);
  return paginate{Feature}(items, page, pageSize);
});

// ============================================================================
// Grouping (if applicable)
// ============================================================================

/**
 * グルーピング関数（純粋関数・テスト可能）
 */
export function group{Feature}ByCategory(items: {Feature}[]): {Feature}Group[] {
  const groups = new Map<string, {Feature}[]>();

  items.forEach(item => {
    const key = item.category || "未分類";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  });

  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    label: key,
    items,
  }));
}

/**
 * グルーピング済み atom
 */
export const {feature}GroupedAtom = atom((get) => {
  const items = get({feature}PaginatedAtom);
  return group{Feature}ByCategory(items);
});

// ============================================================================
// KPI / Computed Values
// ============================================================================

/**
 * KPI計算関数（純粋関数・テスト可能）
 */
export function calculate{Feature}Kpi(items: {Feature}[]): {Feature}Kpi {
  return {
    totalItems: items.length,
    totalValue: items.reduce((sum, item) => sum + (item.value || 0), 0),
    averageValue: items.length > 0
      ? items.reduce((sum, item) => sum + (item.value || 0), 0) / items.length
      : 0,
  };
}

/**
 * KPI atom
 * ※ フィルタ済みデータから計算（ページネーション前）
 */
export const {feature}KpiAtom = atom((get) => {
  const items = get({feature}FilteredAtom);
  return calculate{Feature}Kpi(items);
});
```

---

### B. テストテンプレート

```typescript
/**
 * {Feature} atoms unit tests
 */

import { describe, it, expect } from "vitest";
import { createStore } from "jotai";
import {
  {feature}RawDataAtom,
  {feature}FilteredAtom,
  {feature}SortedAtom,
  {feature}PaginatedAtom,
  {feature}KpiAtom,
  filter{Feature}BySearch,
  sort{Feature},
  calculate{Feature}Kpi,
} from "./atoms";

// ============================================================================
// Pure Functions Tests
// ============================================================================

describe("{Feature} Pure Functions", () => {
  describe("filter{Feature}BySearch", () => {
    it("should filter items by search term", () => {
      const items = [
        { id: 1, name: "Apple", code: "APL" },
        { id: 2, name: "Banana", code: "BAN" },
      ];

      const result = filter{Feature}BySearch(items, "app");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Apple");
    });

    it("should return all items when search term is empty", () => {
      const items = [
        { id: 1, name: "Apple" },
        { id: 2, name: "Banana" },
      ];

      const result = filter{Feature}BySearch(items, "");

      expect(result).toHaveLength(2);
    });
  });

  describe("sort{Feature}", () => {
    it("should sort items ascending by string column", () => {
      const items = [
        { id: 1, name: "Banana" },
        { id: 2, name: "Apple" },
      ];

      const result = sort{Feature}(items, "name", "asc");

      expect(result[0].name).toBe("Apple");
      expect(result[1].name).toBe("Banana");
    });

    it("should sort items descending by number column", () => {
      const items = [
        { id: 1, value: 10 },
        { id: 2, value: 20 },
      ];

      const result = sort{Feature}(items, "value", "desc");

      expect(result[0].value).toBe(20);
      expect(result[1].value).toBe(10);
    });
  });

  describe("calculate{Feature}Kpi", () => {
    it("should calculate KPI values correctly", () => {
      const items = [
        { id: 1, value: 100 },
        { id: 2, value: 200 },
      ];

      const kpi = calculate{Feature}Kpi(items);

      expect(kpi.totalItems).toBe(2);
      expect(kpi.totalValue).toBe(300);
      expect(kpi.averageValue).toBe(150);
    });
  });
});

// ============================================================================
// Derived Atoms Tests
// ============================================================================

describe("{Feature} Derived Atoms", () => {
  it("should filter items based on search atom", () => {
    const store = createStore();

    // Setup: set raw data
    // Note: この例では直接データをセットできないため、実際にはモックが必要

    const filtered = store.get({feature}FilteredAtom);

    expect(filtered).toHaveLength(5);
  });

  it("should recompute when dependency changes", () => {
    const store = createStore();

    const initial = store.get({feature}FilteredAtom);

    // Change filter
    // store.set({feature}FiltersAtom, { search: "new" });

    const updated = store.get({feature}FilteredAtom);

    expect(updated).not.toEqual(initial);
  });
});
```

---

### C. レビューチェックリスト

移行PR作成時に使用するチェックリスト：

#### コード品質
- [ ] `useMemo`/`useCallback` が atoms に置き換わっている
- [ ] 純粋関数が抽出されている
- [ ] Atom の命名規則に従っている
- [ ] JSDoc コメントが記載されている
- [ ] TypeScript エラー 0
- [ ] ESLint エラー 0

#### テスト
- [ ] 純粋関数のユニットテストが存在する
- [ ] Atom のユニットテストが存在する
- [ ] テストカバレッジ ≥ 80%
- [ ] E2E テストが通る

#### ドキュメント
- [ ] Atom 依存グラフが文書化されている
- [ ] 変更内容がコミットメッセージに記載されている
- [ ] 移行前後の比較が記録されている

#### 機能
- [ ] UIの表示が変更前と一致
- [ ] フィルタリングが正常動作
- [ ] ソートが正常動作
- [ ] ページネーションが正常動作
- [ ] パフォーマンス劣化がない

#### セキュリティ
- [ ] 機密情報が sessionStorage に保存されていない
- [ ] API パラメータが適切にサニタイズされている

---

## まとめ

この移行計画書は、Lot Management System 全体の `useMemo`/`useCallback` ベースのロジックを Jotai derived atoms に移行するための包括的なガイドです。

**キーポイント:**
1. **段階的移行:** 4フェーズに分けて優先度順に実施
2. **参照実装:** Inventory を Gold Standard として活用
3. **テストファースト:** 各段階でテストを書いて品質保証
4. **標準化:** パターンテンプレートとベストプラクティスを確立

**期待される成果:**
- コードの再利用性・テスト性・保守性の向上
- パフォーマンスの改善（30-50% 再レンダリング削減）
- 開発者体験の向上（宣言的で見通しの良いコード）

**総工数見積もり:** 32-44営業日（9-10週間、1人フルタイム換算）

---

**ドキュメントバージョン:** 1.0
**最終更新日:** 2026-01-18
**作成者:** Claude Code
**レビュー:** 未実施
