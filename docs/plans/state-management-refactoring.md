# フロントエンド状態管理リファクタリング計画

## 進捗状況

| フェーズ | ステータス | 完了日 |
|---------|----------|--------|
| Phase 1: Allocation Context導入 | ✅ 完了 | 2025-12-18 |
| Phase 2: AllocationInputSection最適化 | ✅ 完了 | 2025-12-18 |
| Phase 3: InventoryPage状態管理改善 | 🔲 未着手 | - |
| Phase 4: ForecastDetailCard分割 | 🔲 未着手 | - |
| Phase 5: WithdrawalForm react-hook-form移行 | 🔲 未着手 | - |
| Phase 6: AdhocLotCreateForm react-hook-form移行 | 🔲 未着手 | - |
| Phase 7: 共通ダイアログ管理hook作成 | 🔲 未着手 | - |
| Phase 8: AllocationInput状態同期修正 | 🔲 未着手 | - |

---

## 1. 現状分析サマリー

### 1.1 既存のJotai Atoms (6個)
| Atom名 | 用途 | ストレージ |
|--------|------|-----------|
| `authAtom` | 認証情報 | localStorage |
| `selectedOrderIdAtom` | 選択中の受注ID | memory |
| `selectedLineIdAtom` | 選択中の受注明細ID | memory |
| `lotFiltersAtom` | ロット一覧フィルタ | sessionStorage |
| `lotTableSettingsAtom` | テーブル設定 | sessionStorage |
| `summarySettingsAtom` | サマリビュー設定 | sessionStorage |

### 1.2 TanStack Query
- 76ファイル以上で使用中
- `/src/shared/constants/query-keys.ts` でキー一元管理済み
- cache invalidationパターン確立済み

### 1.3 問題構造 (Allocation機能の階層)
```
LineBasedAllocationList
  └→ AllocationListContent (logic + 14 props)
       └→ AllocationListRow (18 props)
            └→ LineItem (18 props)
                 └→ AllocationRowContainer (12 props)
                      └→ LotAllocationPanel (33 props)
                           └→ LotAllocationList (10 props)
                                └→ LotListCard (11 props)
                                     └→ AllocationInputSection (14 props)
```
**合計: 7-8階層、最大49個のProps伝達**

---

## 2. jotai-tanstack-queryライブラリの導入判断

### 結論: **導入不要**

### 理由
1. **問題の本質がProp Drilling**: 現在の問題はサーバー状態管理ではなく、UIコンテキストの伝達
2. **TanStack Queryは効果的に機能中**: cache invalidation, staleTime設定が適切
3. **複雑性の増加**: 追加の抽象化レイヤーは学習コストと保守コストを増加
4. **既存パターンで解決可能**: Jotaiのatomとカスタムフックの組み合わせで対応可能

### 代替アプローチ
- **Jotai atom + Provider pattern**: 機能単位でContextの代わりにatomを使用
- **Compound Components**: 関連コンポーネントをグループ化
- **Custom hooks**: ロジックを再利用可能なフックに抽出

---

## 3. 段階的リファクタリング計画

### フェーズ1: Allocation Context導入 ✅ 完了

#### 実装済みの内容

**新規作成ファイル:**
- `src/features/allocations/store/allocation-context.ts` - 共有atoms定義
- `src/features/allocations/hooks/useAllocationContext.ts` - 型安全なhooks
- `src/features/allocations/components/AllocationProvider.tsx` - Providerコンポーネント

**修正ファイル:**
- `LineBasedAllocationList.tsx` - AllocationProviderでラップ
- `AllocationListContent.tsx` - props削減 (AllocationListProps → { logic: LogicResult })
- `AllocationListRow.tsx` - props削減 (30 → 11)
- `LineItem.tsx` - props削減 (17 → 6)、useAllocationContextData()使用
- `OrderGroup.tsx` - props削減 (14 → 4)
- `OrderGroupLineItem.tsx` - props削減 (14 → 3)、useAllocationContextData()使用
- `AllocationRowContainer.tsx` - props削減 (13 → 5)、useAllocationContext()使用

#### 成果
- Props数: 60-79%削減
- 82行のコード削減（net）
- 中間コンポーネントからhandler propsを完全除去

---

### フェーズ2: AllocationInputSection最適化 ✅ 完了

#### 実装済みの内容

**追加atom:**
- `currentLineContextAtom` - ForecastTooltip用のコンテキスト（customerId, deliveryPlaceId, productId）

**追加hooks:**
- `useCurrentLineContext()` - コンテキスト取得
- `useSetCurrentLineContext()` - コンテキスト設定

**修正ファイル:**
- `LotAllocationPanel.tsx` - useEffectでcurrentLineContextを設定
- `LotAllocationList.tsx` - props削減 (10 → 7)
- `LotListCard.tsx` - props削減 (10 → 7)
- `AllocationInputSection.tsx` - props削減 (18 → 12)、InputWithForecastがuseCurrentLineContext()を使用

#### 成果
- Props: customerId/deliveryPlaceId/productIdの伝達が不要に
- ForecastTooltipが必要なデータをcontextから直接取得

---

### フェーズ3: InventoryPage状態管理改善 🔲 未着手

#### 目的
- useState/useQuery混在の整理
- フィルタ状態のJotai化
- ページリロード時の状態復元

#### 現状の問題点
`InventoryPage.tsx` (328行) には以下のuseStateがある：
```typescript
const [overviewMode, setOverviewMode] = useState<OverviewMode>("items");
const [filters, setFilters] = useState({
  product_id: "",
  warehouse_id: "",
  supplier_id: "",
});
```
→ リロード時に状態がリセットされる

#### 変更するファイル
1. **修正**: `src/features/inventory/state.ts`
2. **修正**: `src/features/inventory/pages/InventoryPage.tsx`
3. **新規作成**: `src/features/inventory/hooks/useInventoryPageState.ts`

#### 具体的な実装手順

**Step 1: state.tsに新しいatomを追加**

```typescript
// src/features/inventory/state.ts に追加

/**
 * ページビューモード
 */
export type OverviewMode = "items" | "product" | "supplier" | "warehouse";

/**
 * アイテムビュー用フィルタ
 */
export interface InventoryItemFilters {
  product_id: string;
  warehouse_id: string;
  supplier_id: string;
}

/**
 * 在庫ページの状態
 * キー: inv:pageState
 */
export const inventoryPageStateAtom = atomWithStorage<{
  overviewMode: OverviewMode;
  filters: InventoryItemFilters;
}>(
  "inv:pageState",
  {
    overviewMode: "items",
    filters: {
      product_id: "",
      warehouse_id: "",
      supplier_id: "",
    },
  },
  createSessionStorageAdapter<{
    overviewMode: OverviewMode;
    filters: InventoryItemFilters;
  }>(),
  { getOnInit: true },
);
```

**Step 2: カスタムhookの作成**

```typescript
// src/features/inventory/hooks/useInventoryPageState.ts

import { useAtom } from "jotai";
import { useCallback, useMemo } from "react";
import { inventoryPageStateAtom, type OverviewMode, type InventoryItemFilters } from "../state";

export function useInventoryPageState() {
  const [state, setState] = useAtom(inventoryPageStateAtom);

  const setOverviewMode = useCallback(
    (mode: OverviewMode) => {
      setState((prev) => ({ ...prev, overviewMode: mode }));
    },
    [setState],
  );

  const setFilters = useCallback(
    (filters: InventoryItemFilters) => {
      setState((prev) => ({ ...prev, filters }));
    },
    [setState],
  );

  const updateFilter = useCallback(
    <K extends keyof InventoryItemFilters>(key: K, value: InventoryItemFilters[K]) => {
      setState((prev) => ({
        ...prev,
        filters: { ...prev.filters, [key]: value },
      }));
    },
    [setState],
  );

  // queryParams変換
  const queryParams = useMemo(() => ({
    product_id: state.filters.product_id ? Number(state.filters.product_id) : undefined,
    warehouse_id: state.filters.warehouse_id ? Number(state.filters.warehouse_id) : undefined,
    supplier_id: state.filters.supplier_id ? Number(state.filters.supplier_id) : undefined,
  }), [state.filters]);

  return {
    overviewMode: state.overviewMode,
    filters: state.filters,
    queryParams,
    setOverviewMode,
    setFilters,
    updateFilter,
  };
}
```

**Step 3: InventoryPage.tsxの修正**

```typescript
// src/features/inventory/pages/InventoryPage.tsx

// 変更前:
// const [overviewMode, setOverviewMode] = useState<OverviewMode>("items");
// const [filters, setFilters] = useState({...});
// const queryParams = {...};

// 変更後:
import { useInventoryPageState } from "../hooks/useInventoryPageState";

export function InventoryPage() {
  const {
    overviewMode,
    filters,
    queryParams,
    setOverviewMode,
    updateFilter,
  } = useInventoryPageState();

  // ... 残りのコードは変更なし
  // ただし setFilters({ ...filters, product_id: value }) のような箇所は
  // updateFilter("product_id", value) に変更
}
```

#### 期待される効果
- コンポーネント内のuseState: 2個 → 0個
- リロード後の状態復元（sessionStorage）
- フィルタ設定がビューモード切替後も維持

#### 注意点
- `useInventoryItems(queryParams)` の呼び出しは変更なし
- queryParamsの計算はhook内でメモ化済み

---

### フェーズ4: ForecastDetailCard分割 🔲 未着手

#### 目的
- 309行のコンポーネントを分割
- 4つのmutation定義を外部化して再利用可能に

#### 現状の問題点
`ForecastDetailCard.tsx` (309行) には以下の4つのmutationが定義されている：
- `autoAllocateMutation` (L56-95) - グループ自動引当
- `updateForecastMutation` (L98-141) - フォーキャスト更新/削除
- `createForecastMutation` (L144-184) - フォーキャスト新規作成
- invalidateQueries処理が各mutationで重複（約40行×3）

#### 変更するファイル
1. **新規作成**: `src/features/forecasts/hooks/useForecastMutations.ts`
2. **修正**: `src/features/forecasts/components/ForecastDetailCard/ForecastDetailCard.tsx`

#### 具体的な実装手順

**Step 1: useForecastMutationsの作成**

```typescript
// src/features/forecasts/hooks/useForecastMutations.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { bulkAutoAllocate } from "@/features/allocations/api";
import { createForecast, deleteForecast, updateForecast } from "@/features/forecasts/api";

interface ForecastGroupKey {
  customer_id: number;
  delivery_place_id: number;
  product_id: number;
}

/**
 * フォーキャスト関連の共通クエリ無効化
 */
function useInvalidateForecastQueries() {
  const queryClient = useQueryClient();

  return (groupKey: ForecastGroupKey) => {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["forecasts"],
        exact: false,
        refetchType: "all",
      }),
      queryClient.invalidateQueries({
        queryKey: ["allocations"],
        exact: false,
        refetchType: "all",
      }),
      queryClient.invalidateQueries({
        queryKey: [
          "planning-allocation-summary",
          groupKey.customer_id,
          groupKey.delivery_place_id,
          groupKey.product_id,
        ],
      }),
    ]);
  };
}

/**
 * フォーキャストCRUD操作のmutations
 */
export function useForecastMutations(groupKey: ForecastGroupKey, unit: string) {
  const invalidateQueries = useInvalidateForecastQueries();

  // グループ自動引当
  const autoAllocate = useMutation({
    mutationFn: () => bulkAutoAllocate({
      product_id: groupKey.product_id,
      customer_id: groupKey.customer_id,
      delivery_place_id: groupKey.delivery_place_id,
    }),
    onSuccess: (result) => {
      if (result.allocated_lines > 0) {
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
      invalidateQueries(groupKey);
    },
    onError: (error) => {
      console.error("Auto-allocate failed:", error);
      toast.error("自動引当に失敗しました");
    },
  });

  // フォーキャスト更新（0なら削除）
  const update = useMutation({
    mutationFn: async ({ forecastId, quantity }: { forecastId: number; quantity: number }) => {
      if (quantity === 0) {
        await deleteForecast(forecastId);
        return null;
      }
      return updateForecast(forecastId, { forecast_quantity: quantity });
    },
    onSuccess: (_, variables) => {
      toast.success(variables.quantity === 0 ? "フォーキャストを削除しました" : "フォーキャストを更新しました");
      invalidateQueries(groupKey);
    },
    onError: (error) => {
      console.error("Update/Delete forecast failed:", error);
      toast.error("フォーキャストの操作に失敗しました");
    },
  });

  // フォーキャスト新規作成
  const create = useMutation({
    mutationFn: (data: { dateKey: string; quantity: number }) =>
      createForecast({
        customer_id: groupKey.customer_id,
        delivery_place_id: groupKey.delivery_place_id,
        product_id: groupKey.product_id,
        forecast_date: data.dateKey,
        forecast_quantity: data.quantity,
        unit: unit,
        forecast_period: data.dateKey.slice(0, 7),
      }),
    onSuccess: () => {
      toast.success("フォーキャストを作成しました");
      invalidateQueries(groupKey);
    },
    onError: (error) => {
      console.error("Create forecast failed:", error);
      toast.error("フォーキャストの作成に失敗しました");
    },
  });

  return {
    autoAllocate,
    update,
    create,
    // ヘルパー関数
    handleUpdateQuantity: (forecastId: number, newQuantity: number) =>
      update.mutateAsync({ forecastId, quantity: newQuantity }),
    handleCreateForecast: (dateKey: string, quantity: number) =>
      create.mutateAsync({ dateKey, quantity }),
  };
}
```

**Step 2: ForecastDetailCardの修正**

```typescript
// src/features/forecasts/components/ForecastDetailCard/ForecastDetailCard.tsx

// 変更前（L56-192の削除）:
// const autoAllocateMutation = useMutation({...});
// const updateForecastMutation = useMutation({...});
// const createForecastMutation = useMutation({...});
// const handleUpdateQuantity = ...
// const handleCreateForecast = ...

// 変更後:
import { useForecastMutations } from "@/features/forecasts/hooks/useForecastMutations";

export function ForecastDetailCard({ group, ... }: ForecastDetailCardProps) {
  const { group_key, forecasts = [] } = group;
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const { dailyData, dailyForecastIds, unit, ... } = useForecastCalculations(group);

  // 4つのmutationを1行で取得
  const {
    autoAllocate,
    handleUpdateQuantity,
    handleCreateForecast,
  } = useForecastMutations(group_key, unit);

  // ... 残りのJSXは変更なし
  // autoAllocateMutation.mutate() → autoAllocate.mutate()
  // autoAllocateMutation.isPending → autoAllocate.isPending
}
```

#### 期待される効果
- ForecastDetailCard: 309行 → 約180行（130行削減）
- mutation定義の重複排除（invalidateQueries処理を一箇所に）
- 他コンポーネントでの再利用が可能

#### 追加リファクタリング候補（任意）
- `ForecastCardBody.tsx`への表示部分分離（さらに50行程度削減可能）
- テストの追加（`useForecastMutations.test.ts`）

---

### フェーズ5: WithdrawalForm react-hook-form移行 🔲 未着手

#### 目的
- 手動フォーム状態管理をreact-hook-form + Zodに移行
- 100行以上のコード削減
- バリデーション処理の改善

#### 現状の問題点
`WithdrawalForm.tsx` (388行) には以下の問題がある：

```typescript
// 手動フォーム状態（L64-82）
const [formData, setFormData] = useState({
  lot_id: preselectedLot?.id.toString() || "",
  customer_id: "",
  warehouse_id: "",
  quantity: "",
  withdrawal_date: format(new Date(), "yyyy-MM-dd"),
  notes: "",
  delivery_place_id: "",
  order_line_id: "",
});
const [error, setError] = useState<string | null>(null);

// useEffectで状態同期（L87-116）
useEffect(() => {
  if (preselectedLot) {
    setFormData((prev) => ({
      ...prev,
      lot_id: preselectedLot.id.toString(),
      warehouse_id: preselectedLot.warehouse_id?.toString() || "",
    }));
  }
}, [preselectedLot]);

// 配送先取得のuseEffect（L97-116）
useEffect(() => {
  const fetchDeliveryPlaces = async () => {
    if (formData.customer_id) {
      setIsLoadingDeliveryPlaces(true);
      // fetch logic...
    }
  };
  fetchDeliveryPlaces();
}, [formData.customer_id]);
```

#### 変更するファイル
1. **修正**: `src/features/withdrawals/components/WithdrawalForm.tsx`

#### 具体的な実装手順

**Step 1: Zodスキーマの定義**

```typescript
// src/features/withdrawals/components/WithdrawalForm.tsx 冒頭に追加

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const withdrawalFormSchema = z.object({
  lot_id: z.string().min(1, "ロットを選択してください"),
  customer_id: z.string().min(1, "顧客を選択してください"),
  warehouse_id: z.string().min(1, "倉庫を選択してください"),
  quantity: z.string()
    .min(1, "数量を入力してください")
    .refine((val) => Number(val) > 0, "数量は1以上を入力してください"),
  withdrawal_date: z.string().min(1, "出庫日を選択してください"),
  notes: z.string().optional(),
  delivery_place_id: z.string().optional(),
  order_line_id: z.string().optional(),
});

type WithdrawalFormData = z.infer<typeof withdrawalFormSchema>;
```

**Step 2: useFormへの移行**

```typescript
// 変更前:
const [formData, setFormData] = useState({...});
const [error, setError] = useState<string | null>(null);

// 変更後:
const form = useForm<WithdrawalFormData>({
  resolver: zodResolver(withdrawalFormSchema),
  defaultValues: {
    lot_id: preselectedLot?.id.toString() || "",
    customer_id: "",
    warehouse_id: preselectedLot?.warehouse_id?.toString() || "",
    quantity: "",
    withdrawal_date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
    delivery_place_id: "",
    order_line_id: "",
  },
});

const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
const customerId = watch("customer_id");
```

**Step 3: useEffectの簡素化**

```typescript
// preselectedLot変更時の同期
useEffect(() => {
  if (preselectedLot) {
    setValue("lot_id", preselectedLot.id.toString());
    setValue("warehouse_id", preselectedLot.warehouse_id?.toString() || "");
  }
}, [preselectedLot, setValue]);

// 配送先取得（customerIdをwatchで監視）
const { data: deliveryPlaces, isLoading: isLoadingDeliveryPlaces } = useQuery({
  queryKey: ["deliveryPlaces", customerId],
  queryFn: () => fetchDeliveryPlaces(Number(customerId)),
  enabled: !!customerId,
});
```

**Step 4: フォームフィールドの修正**

```typescript
// 変更前:
<Input
  value={formData.quantity}
  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
/>
{error && <p className="text-red-500">{error}</p>}

// 変更後:
<Input {...register("quantity")} />
{errors.quantity && <p className="text-red-500">{errors.quantity.message}</p>}
```

#### 期待される効果
- 行数: 388行 → 約280行（100行以上削減）
- useState: 5個 → 0個
- useEffect: 3個 → 1個
- 型安全なバリデーション

---

### フェーズ6: AdhocLotCreateForm react-hook-form移行 🔲 未着手

#### 目的
- Phase 5と同様のパターンで移行
- 手動フォーム状態をreact-hook-formに統一

#### 現状の問題点
```typescript
// 手動フォーム状態（L77-80）
const [productId, setProductId] = useState<string>("");
const [warehouseId, setWarehouseId] = useState<string>("");
const [supplierId, setSupplierId] = useState<string>("");
const [quantity, setQuantity] = useState<string>("");
```

#### 変更するファイル
1. **修正**: `src/features/inventory/components/AdhocLotCreateForm.tsx`

#### 具体的な実装手順

**Step 1: Zodスキーマ**

```typescript
const adhocLotSchema = z.object({
  product_id: z.string().min(1, "製品を選択してください"),
  warehouse_id: z.string().min(1, "倉庫を選択してください"),
  supplier_id: z.string().min(1, "仕入先を選択してください"),
  quantity: z.string()
    .min(1, "数量を入力してください")
    .refine((val) => Number(val) > 0, "数量は1以上を入力してください"),
  expiry_date: z.string().optional(),
  lot_number: z.string().optional(),
});
```

**Step 2: useFormへの移行**

```typescript
const form = useForm<z.infer<typeof adhocLotSchema>>({
  resolver: zodResolver(adhocLotSchema),
  defaultValues: {
    product_id: "",
    warehouse_id: "",
    supplier_id: "",
    quantity: "",
    expiry_date: "",
    lot_number: "",
  },
});
```

#### 期待される効果
- useState: 4個 → 0個
- フォームバリデーションの統一

---

### フェーズ7: 共通ダイアログ管理hook作成 🔲 未着手

#### 目的
- リストページで繰り返されるダイアログ状態管理を共通化
- 4ページ × 9 useState → 4ページ × 1 hook

#### 現状の問題点
以下のページで同じパターンのuseStateが9個ずつ存在：
- `WarehousesListPage.tsx` (379行)
- `SuppliersListPage.tsx` (365行)
- `ProductsListPage.tsx` (387行)
- `CustomersListPage.tsx`

```typescript
// 各ページで繰り返されるパターン
const [isCreateOpen, setIsCreateOpen] = useState(false);
const [isEditOpen, setIsEditOpen] = useState(false);
const [isDeleteOpen, setIsDeleteOpen] = useState(false);
const [isImportOpen, setIsImportOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState<T | null>(null);
const [itemToDelete, setItemToDelete] = useState<T | null>(null);
// ... さらに続く
```

#### 変更するファイル
1. **新規作成**: `src/hooks/ui/useListPageDialogs.ts`
2. **修正**: 上記4ページ

#### 具体的な実装手順

**Step 1: 共通hookの作成**

```typescript
// src/hooks/ui/useListPageDialogs.ts

import { useState, useCallback, useMemo } from "react";

type DialogType = "create" | "edit" | "delete" | "import" | "detail";

interface DialogState<T> {
  type: DialogType | null;
  item: T | null;
}

export function useListPageDialogs<T>() {
  const [state, setState] = useState<DialogState<T>>({
    type: null,
    item: null,
  });

  const openCreate = useCallback(() => {
    setState({ type: "create", item: null });
  }, []);

  const openEdit = useCallback((item: T) => {
    setState({ type: "edit", item });
  }, []);

  const openDelete = useCallback((item: T) => {
    setState({ type: "delete", item });
  }, []);

  const openImport = useCallback(() => {
    setState({ type: "import", item: null });
  }, []);

  const openDetail = useCallback((item: T) => {
    setState({ type: "detail", item });
  }, []);

  const close = useCallback(() => {
    setState({ type: null, item: null });
  }, []);

  const dialogs = useMemo(() => ({
    isCreateOpen: state.type === "create",
    isEditOpen: state.type === "edit",
    isDeleteOpen: state.type === "delete",
    isImportOpen: state.type === "import",
    isDetailOpen: state.type === "detail",
    selectedItem: state.item,
  }), [state]);

  return {
    ...dialogs,
    openCreate,
    openEdit,
    openDelete,
    openImport,
    openDetail,
    close,
  };
}
```

**Step 2: リストページでの使用**

```typescript
// 変更前（WarehousesListPage.tsx）:
const [isCreateOpen, setIsCreateOpen] = useState(false);
const [isEditOpen, setIsEditOpen] = useState(false);
const [isDeleteOpen, setIsDeleteOpen] = useState(false);
const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
// ... 他のuseState

// 変更後:
import { useListPageDialogs } from "@/hooks/ui/useListPageDialogs";

const {
  isCreateOpen,
  isEditOpen,
  isDeleteOpen,
  selectedItem: selectedWarehouse,
  openCreate,
  openEdit,
  openDelete,
  close,
} = useListPageDialogs<Warehouse>();
```

#### 期待される効果
- 各ページでuseState: 9個 → 1個（hook呼び出し）
- 4ページで約100行削減
- ダイアログ状態管理の一貫性向上

---

### フェーズ8: AllocationInput状態同期修正 🔲 未着手

#### 目的
- 状態同期のアンチパターンを修正
- 循環依存リスクを排除

#### 現状の問題点
`AllocationInput.tsx` (L15-22):

```typescript
const [inputValue, setInputValue] = useState(value.toString());

useEffect(() => {
  if (Number(inputValue) !== value) {
    setInputValue(value.toString());  // 循環依存のリスク
  }
}, [inputValue, value]);  // inputValueが依存配列にある
```

**問題点:**
- `inputValue`が依存配列にあるため、`setInputValue`が呼ばれるとuseEffectが再実行される
- 不要な再レンダリングの可能性
- 状態の不整合が起きやすい

#### 変更するファイル
1. **修正**: `src/features/allocations/components/shared/AllocationInput.tsx`

#### 具体的な実装手順

**Option A: 依存配列から除外**

```typescript
const [inputValue, setInputValue] = useState(value.toString());

// valueのみを依存配列に
useEffect(() => {
  setInputValue(value.toString());
}, [value]);  // inputValueを除外
```

**Option B: 制御コンポーネントパターン（推奨）**

```typescript
// 内部状態を持たず、親からの値を直接使用
interface AllocationInputProps {
  value: number;
  onChange: (value: number) => void;
  // ...
}

export function AllocationInput({ value, onChange, ...props }: AllocationInputProps) {
  const [localValue, setLocalValue] = useState(value.toString());

  // フォーカスが外れた時のみ親に通知
  const handleBlur = () => {
    const numValue = Number(localValue);
    if (!isNaN(numValue) && numValue !== value) {
      onChange(numValue);
    }
  };

  // 親の値が変わった時のみ同期（refを使って比較）
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (prevValueRef.current !== value) {
      setLocalValue(value.toString());
      prevValueRef.current = value;
    }
  }, [value]);

  return (
    <Input
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      {...props}
    />
  );
}
```

#### 期待される効果
- 循環依存リスクの排除
- 予測可能な状態更新
- パフォーマンス改善

---

## 4. テスト戦略

### 4.1 ユニットテスト

```typescript
// src/features/allocations/store/allocation-context.test.ts
describe("allocation-context atoms", () => {
  it("handlers atom provides all required functions", () => {
    // Test implementation
  });
});
```

### 4.2 統合テスト

```typescript
// src/features/allocations/components/AllocationProvider.test.tsx
describe("AllocationProvider integration", () => {
  it("child components can access handlers via context", () => {
    // Test implementation
  });
});
```

---

## 5. 実装スケジュール

| フェーズ | 所要時間目安 | 依存関係 | ステータス | 優先度 |
|---------|-------------|---------|----------|-------|
| フェーズ1: Allocation Context | 2-3日 | なし | ✅ 完了 | - |
| フェーズ2: AllocationInputSection | 1日 | フェーズ1完了後 | ✅ 完了 | - |
| フェーズ3: InventoryPage | 1日 | なし（独立） | 🔲 未着手 | 中 |
| フェーズ4: ForecastDetailCard | 1日 | なし（独立） | 🔲 未着手 | 中 |
| フェーズ5: WithdrawalForm | 1日 | なし（独立） | 🔲 未着手 | 高 |
| フェーズ6: AdhocLotCreateForm | 0.5日 | なし（独立） | 🔲 未着手 | 高 |
| フェーズ7: 共通ダイアログhook | 1日 | なし（独立） | 🔲 未着手 | 中 |
| フェーズ8: AllocationInput修正 | 0.5日 | なし（独立） | 🔲 未着手 | 中 |
| テスト・検証 | 1-2日 | 全フェーズ完了後 | 🔲 未着手 | - |

**残り作業: 約7-8日（フェーズ3-8, テスト）**

### 推奨実装順序

1. **フェーズ5-6** (高優先度): react-hook-form移行 → コード削減効果が大きい
2. **フェーズ8** (中優先度): AllocationInput修正 → バグリスク排除
3. **フェーズ3-4** (中優先度): Jotai/mutation整理 → 保守性向上
4. **フェーズ7** (中優先度): 共通ダイアログhook → 4ページに影響

---

## 6. 移行方針

### 段階的移行
1. 新しいatom/contextを作成し、既存propsと並行運用
2. 子コンポーネントを1つずつ新方式に移行
3. 全移行完了後、古いpropsを削除

### Feature Flag (推奨)
```typescript
const USE_NEW_ALLOCATION_CONTEXT = true;

function LotListCard(props) {
  const handlers = USE_NEW_ALLOCATION_CONTEXT
    ? useAtomValue(allocationHandlersAtom)
    : props;
}
```

---

## 7. Critical Files

| ファイル | 役割 |
|----------|------|
| `src/features/allocations/store/atoms.ts` | 既存atom、拡張基盤 |
| `src/features/allocations/components/allocation-list/line-based/types.ts` | 型定義、リファクタリング起点 |
| `src/features/allocations/hooks/useLotAllocationActions.ts` | 既存actionパターン |
| `src/features/allocations/components/lots/LotAllocationPanel.tsx` | 最多Props、最優先対象 |
| `src/features/inventory/state.ts` | 既存Jotai atomパターン参考 |
