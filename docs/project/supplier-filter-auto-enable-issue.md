# 仕入先フィルタ自動適用の不具合調査

## 📋 現状

### 実装済み
- ✅ Phase 1: DB制約削除（複数担当者対応）
- ✅ Phase 2: 共通フック `useSupplierFilter` 作成
- ✅ Phase 2: 全8ページへの適用完了
  - Orders（受注管理）
  - Inbound Plans（入荷予定）
  - Intake History（入庫履歴）
  - Withdrawals（出庫登録）
  - UOM Conversions（UOM変換）
  - Inventory（在庫・ロット管理）
  - ExcelPortal（Excelビュー入口）
  - ExcelView（Excelビュー詳細）

### 🔴 **CRITICAL BUG: 自動有効化が動作していない**

**ユーザー報告:**
> 担当仕入先のみがデフォルトでオフなのはなんで？？デフォルトでこのフラグはオンじゃないと変じゃない？0件なんだったらアラートが出るんじゃなかったの？結局ページによってバラバラの実装ってこと？警告出てオフになるなら分かる。でも警告なしでオフだと結局担当者を設定してもオフのままなんじゃないの？実装漏れなんじゃないの？って言われるだけだと思うんだけど

**スクリーンショット分析:**
1. **OrdersListPage**: 警告表示「担当仕入先が設定されていません」→ チェックボックスOFF（正常動作）
2. **InventoryPage**: 警告なし → チェックボックスOFF（**不正動作**: 担当仕入先があるのにOFFのまま）

**期待動作:**
- 担当仕入先が1つ以上ある → チェックボックス自動ON
- 担当仕入先が0件 → チェックボックスOFF + 警告バナー表示

**実際の動作:**
- InventoryPageで担当仕入先がある場合でもチェックボックスがOFFのまま

---

## 🔍 原因分析

### useSupplierFilter の実装

**ファイル:** `frontend/src/features/assignments/hooks/useSupplierFilter.ts`

```typescript
export function useSupplierFilter(options: UseSupplierFilterOptions = {}) {
  const { disableAutoFilter = false } = options;
  const { data: mySuppliers } = useMySuppliers();
  const primarySupplierIds = useMemo(
    () => mySuppliers?.primary_supplier_ids || [],
    [mySuppliers?.primary_supplier_ids]
  );
  const hasAssignedSuppliers = primarySupplierIds.length > 0;

  // Auto-enable when assigned suppliers exist
  const [filterEnabled, setFilterEnabled] = useState(
    disableAutoFilter ? false : hasAssignedSuppliers  // ← 初期化時
  );

  useEffect(() => {
    if (!disableAutoFilter && hasAssignedSuppliers && !filterEnabled) {
      setFilterEnabled(true);  // ← 後から自動ON
    }
  }, [disableAutoFilter, hasAssignedSuppliers, filterEnabled]);

  // ...
}
```

**問題点:**
1. `useState` の初期値は **初回レンダリング時のみ** 評価される
2. `useMySuppliers()` は非同期クエリなので、初回は `data = undefined`
3. 初回: `hasAssignedSuppliers = false` → `filterEnabled = false`
4. データ取得後: `hasAssignedSuppliers = true` に変わるが、`useEffect` が発火するかは不確実

**useEffect の問題:**
- `hasAssignedSuppliers` が `false → true` に変わった時に発火するはず
- しかし、`filterEnabled` が既に `false` なので、条件 `!filterEnabled` は満たす
- では何が問題か？ → **ページ側の状態同期が原因**

---

### InventoryPage の実装

**ファイル:** `frontend/src/features/inventory/pages/InventoryPage.tsx`

```typescript
const { filterEnabled, toggleFilter } = useSupplierFilter();

useEffect(() => {
  updateFilter("primary_staff_only", filterEnabled);
}, [filterEnabled, updateFilter]);
```

**ファイル:** `frontend/src/features/inventory/state.ts`

```typescript
export const inventoryPageStateAtom = atomWithStorage<{
  overviewMode: OverviewMode;
  filters: InventoryItemFilters;
}>(
  "inv:pageState",
  {
    overviewMode: "items",
    filters: {
      // ...
      primary_staff_only: false,  // ← sessionStorageに保存されるデフォルト値
      // ...
    },
  },
  createSessionStorageAdapter<{...}>(),
  { getOnInit: true },
);
```

**問題の流れ:**

1. **初回ページ読み込み:**
   - sessionStorage `inv:pageState` から `primary_staff_only: false` を読み込み
   - `useSupplierFilter()` は `filterEnabled = false` で初期化（非同期データ未取得）

2. **useMySuppliers データ取得完了:**
   - `hasAssignedSuppliers = true` になる
   - `useSupplierFilter` の useEffect が発火 → `setFilterEnabled(true)`
   - `filterEnabled` が `false → true` に変わる

3. **InventoryPage の useEffect 発火:**
   ```typescript
   useEffect(() => {
     updateFilter("primary_staff_only", filterEnabled);  // true を書き込み
   }, [filterEnabled, updateFilter]);
   ```
   - `primary_staff_only` が `true` になる... **はず**

4. **しかし、実際には動作していない理由:**
   - タイミング問題: Jotai の atomWithStorage は `getOnInit: true` で初期化時に sessionStorage を読み込む
   - その後の `updateFilter` が正しく反映されていない可能性
   - または、別のコンポーネントが `resetFilters()` を呼んでリセットしている可能性

---

## 🐛 具体的な問題箇所

### 1. useSupplierFilter の初期化タイミング

**現在のコード:**
```typescript
const [filterEnabled, setFilterEnabled] = useState(
  disableAutoFilter ? false : hasAssignedSuppliers  // ← 初回は必ず false
);
```

**問題:**
- `useMySuppliers()` が非同期なので、初回は `hasAssignedSuppliers = false`
- つまり `filterEnabled` は常に `false` で初期化される

**改善案:**
- sessionStorage にフィルタ状態を保存しているページでは、そちらを優先する
- または、`useMySuppliers()` のローディング状態を待つ

### 2. InventoryPage の状態同期

**現在のコード:**
```typescript
useEffect(() => {
  updateFilter("primary_staff_only", filterEnabled);
}, [filterEnabled, updateFilter]);
```

**問題:**
- `filterEnabled` が変わっても、Jotai の atom 更新が正しく反映されていない可能性
- または、他の場所で `setFilters` や `resetFilters` が呼ばれて上書きされている

---

## 🎯 解決方針

### Option A: useSupplierFilter 側で sessionStorage を尊重

**メリット:**
- ページ側の実装を変更しなくて済む
- 一度ユーザーがOFFにしたら、次回もOFFのまま

**デメリット:**
- sessionStorage のキーをページごとに管理する必要がある
- フック側が肥大化

### Option B: ページ側の初期化を修正

**メリット:**
- シンプル
- `useSupplierFilter` の責務が明確

**デメリット:**
- 全ページで修正が必要

### **推奨: Option C - Hybrid Approach**

**方針:**
1. `useSupplierFilter` は自動有効化のみに専念
2. ページ側で sessionStorage との同期を管理
3. ただし、**初回訪問時は必ず自動ON**（sessionStorage が空の場合）

**実装:**
```typescript
// InventoryPage.tsx
const { filterEnabled, toggleFilter, hasAssignedSuppliers } = useSupplierFilter();
const { filters, updateFilter } = useInventoryPageState();

// 初回マウント時のみ、担当仕入先がある場合は強制的にON
useEffect(() => {
  if (hasAssignedSuppliers && !filters.primary_staff_only) {
    updateFilter("primary_staff_only", true);
  }
}, []);  // ← 空の依存配列で初回のみ実行

// filterEnabled と filters.primary_staff_only を双方向同期
useEffect(() => {
  updateFilter("primary_staff_only", filterEnabled);
}, [filterEnabled, updateFilter]);

useEffect(() => {
  if (filters.primary_staff_only !== filterEnabled) {
    toggleFilter(filters.primary_staff_only);
  }
}, [filters.primary_staff_only]);
```

**問題点:**
- 循環更新の可能性がある
- 複雑になりすぎる

---

## ✅ 最終推奨案: **sessionStorage の初期値を動的に決定**

**方針:**
- sessionStorage にフィルタ状態を保存するページでは、初期値を動的に決定
- 担当仕入先がある場合、デフォルトを `true` にする

**実装:**

### 1. state.ts の修正

```typescript
// BEFORE
export const inventoryPageStateAtom = atomWithStorage<{
  overviewMode: OverviewMode;
  filters: InventoryItemFilters;
}>(
  "inv:pageState",
  {
    overviewMode: "items",
    filters: {
      // ...
      primary_staff_only: false,  // ← 固定値
      // ...
    },
  },
  createSessionStorageAdapter<{...}>(),
  { getOnInit: true },
);

// AFTER
// 初期値生成関数を作成
export function getDefaultInventoryPageState(): {
  overviewMode: OverviewMode;
  filters: InventoryItemFilters;
} {
  return {
    overviewMode: "items",
    filters: {
      product_group_id: "",
      warehouse_id: "",
      supplier_id: "",
      tab: "all",
      primary_staff_only: false,  // デフォルトは false
      candidate_mode: "stock",
    },
  };
}

export const inventoryPageStateAtom = atomWithStorage<{
  overviewMode: OverviewMode;
  filters: InventoryItemFilters;
}>(
  "inv:pageState",
  getDefaultInventoryPageState(),
  createSessionStorageAdapter<{...}>(),
  { getOnInit: true },
);
```

### 2. InventoryPage.tsx の修正

```typescript
const { filterEnabled, toggleFilter, hasAssignedSuppliers } = useSupplierFilter();
const { filters, updateFilter } = useInventoryPageState();

// 初回マウント時: 担当仕入先がある & sessionStorage に値がない場合、自動ON
useEffect(() => {
  const hasSessionStorage = sessionStorage.getItem("inv:pageState");
  if (!hasSessionStorage && hasAssignedSuppliers) {
    updateFilter("primary_staff_only", true);
  }
}, [hasAssignedSuppliers, updateFilter]);

// filterEnabled と filters.primary_staff_only を同期
useEffect(() => {
  if (filterEnabled !== filters.primary_staff_only) {
    updateFilter("primary_staff_only", filterEnabled);
  }
}, [filterEnabled, filters.primary_staff_only, updateFilter]);
```

**問題:**
- まだ複雑
- `useSupplierFilter` の `filterEnabled` と `filters.primary_staff_only` の二重管理

---

## 🔧 **FINAL SOLUTION: useSupplierFilter を状態管理の唯一の真実の源に**

**方針:**
- sessionStorage で `primary_staff_only` を保存するのをやめる
- `useSupplierFilter` の `filterEnabled` だけを使う
- これにより、状態の二重管理を解消

**実装:**

### 1. state.ts の修正

```typescript
export interface InventoryItemFilters {
  product_group_id: string;
  warehouse_id: string;
  supplier_id: string;
  tab: InventoryTab;
  // primary_staff_only: boolean;  // ← 削除（useSupplierFilter で管理）
  candidate_mode: "stock" | "master";
}
```

### 2. InventoryPage.tsx の修正

```typescript
const { filterEnabled, toggleFilter, filterSuppliers, hasAssignedSuppliers } = useSupplierFilter();
const { filters, queryParams } = useInventoryPageState();

// primary_staff_only は useSupplierFilter の filterEnabled を直接使う
const effectiveQueryParams = {
  ...queryParams,
  primary_staff_only: filterEnabled,  // ← useSupplierFilter から取得
};

// フィルタリング
const filteredItems = useMemo(() => {
  let result = items;
  result = filterSuppliers(result, (item) => item.supplier_id);
  return result;
}, [items, filterSuppliers]);
```

### 3. inventoryPageQueryParamsAtom の修正

**問題:**
- atom は `filters.primary_staff_only` を参照している
- これを削除すると、atom が壊れる

**解決策:**
- `primary_staff_only` はページ側で動的に追加する
- atom からは削除

```typescript
// state.ts
export const inventoryPageQueryParamsAtom = atom((get) => {
  const { filters } = get(inventoryPageStateAtom);

  return {
    product_group_id: filters.product_group_id ? Number(filters.product_group_id) : undefined,
    warehouse_id: filters.warehouse_id ? Number(filters.warehouse_id) : undefined,
    supplier_id: filters.supplier_id ? Number(filters.supplier_id) : undefined,
    tab: filters.tab,
    // primary_staff_only: filters.primary_staff_only,  // ← 削除
  };
});
```

```typescript
// InventoryPage.tsx
const baseParams = useAtomValue(inventoryPageQueryParamsAtom);
const { filterEnabled } = useSupplierFilter();

const queryParams = useMemo(() => ({
  ...baseParams,
  primary_staff_only: filterEnabled,
}), [baseParams, filterEnabled]);
```

---

## 📝 修正対象ファイル

1. `frontend/src/features/inventory/state.ts`
   - `InventoryItemFilters` から `primary_staff_only` を削除
   - `inventoryPageStateAtom` のデフォルト値から削除
   - `inventoryPageQueryParamsAtom` から削除

2. `frontend/src/features/inventory/hooks/useInventoryPageState.ts`
   - `resetFilters` から `primary_staff_only: false` を削除

3. `frontend/src/features/inventory/pages/InventoryPage.tsx`
   - `useSupplierFilter` の `filterEnabled` を直接使用
   - 同期用の useEffect を削除
   - `queryParams` に `primary_staff_only` を動的に追加

4. 他のページも同様に確認（sessionStorage で primary_staff_only を管理しているページ）

---

## 🎯 次のアクション

1. ✅ 上記のドキュメント作成
2. ⏸️ 修正実装（トークン消費を抑えるため、一旦保留）
3. ⏸️ 全ページでの動作確認
4. ⏸️ Phase 3（ユーザー設定画面）の実装
