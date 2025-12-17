# フロントエンド状態管理リファクタリング計画

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

### フェーズ1: Allocation Context導入 (最優先)

#### 目的
- 7階層のProp Drillingを解消
- ハンドラと状態を一括管理

#### 変更するファイル
1. **新規作成**: `src/features/allocations/store/allocation-context.ts`
2. **新規作成**: `src/features/allocations/components/AllocationProvider.tsx`
3. **新規作成**: `src/features/allocations/hooks/useAllocationContext.ts`
4. **修正**: `src/features/allocations/components/allocation-list/LineBasedAllocationList.tsx`
5. **修正**: `src/features/allocations/components/allocation-list/line-based/AllocationListContent.tsx`
6. **修正**: `src/features/allocations/components/allocation-list/line-based/AllocationListRow.tsx`
7. **修正**: `src/features/allocations/components/allocation-list/line-based/LineItem.tsx`
8. **修正**: `src/features/allocations/components/lots/AllocationRowContainer.tsx`
9. **修正**: `src/features/allocations/components/lots/LotAllocationPanel.tsx`
10. **修正**: `src/features/allocations/components/lots/LotAllocationList.tsx`
11. **修正**: `src/features/allocations/components/lots/LotListCard.tsx`

#### 具体的な実装内容

**Step 1: Allocation Context Atomsの作成**

```typescript
// src/features/allocations/store/allocation-context.ts
import { atom } from "jotai";
import type { CandidateLotItem } from "../api";
import type { LineStatus, AllocationsByLine } from "../types";

// ========== State Atoms ==========
export const allocationsByLineAtom = atom<AllocationsByLine>({});
export const lineStatusesAtom = atom<Record<number, LineStatus>>({});
export const activeLineIdAtom = atom<number | null>(null);

// ========== Context Data Atoms ==========
export const allocationContextDataAtom = atom<{
  productMap: Record<number, string>;
  customerMap: Record<number, string>;
}>({
  productMap: {},
  customerMap: {},
});

// ========== Handler Atoms (write-only) ==========
export const allocationHandlersAtom = atom<{
  onLotAllocationChange: (lineId: number, lotId: number, quantity: number) => void;
  onAutoAllocate: (lineId: number) => void;
  onClearAllocations: (lineId: number) => void;
  onSaveAllocations: (lineId: number) => void;
  getLineAllocations: (lineId: number) => Record<number, number>;
  isOverAllocated: (lineId: number) => boolean;
} | null>(null);
```

**Step 2: Context Hook作成**

```typescript
// src/features/allocations/hooks/useAllocationContext.ts
import { useAtomValue } from "jotai";
import {
  allocationHandlersAtom,
  allocationContextDataAtom,
  lineStatusesAtom,
  activeLineIdAtom,
} from "../store/allocation-context";

export function useAllocationContext() {
  const handlers = useAtomValue(allocationHandlersAtom);
  const contextData = useAtomValue(allocationContextDataAtom);
  const lineStatuses = useAtomValue(lineStatusesAtom);
  const activeLineId = useAtomValue(activeLineIdAtom);

  if (!handlers) {
    throw new Error("useAllocationContext must be used within AllocationProvider");
  }

  return {
    ...handlers,
    ...contextData,
    lineStatuses,
    activeLineId,
  };
}
```

**Step 3: Provider層の実装**

```typescript
// src/features/allocations/components/AllocationProvider.tsx
import { useSetAtom } from "jotai";
import { useEffect } from "react";
import {
  allocationContextDataAtom,
  allocationHandlersAtom,
  lineStatusesAtom,
  activeLineIdAtom,
} from "../store/allocation-context";

interface AllocationProviderProps {
  children: React.ReactNode;
  productMap: Record<number, string>;
  customerMap: Record<number, string>;
  handlers: { /* handler types */ };
  lineStatuses: Record<number, LineStatus>;
  activeLineId: number | null;
}

export function AllocationProvider({
  children,
  productMap,
  customerMap,
  handlers,
  lineStatuses,
  activeLineId,
}: AllocationProviderProps) {
  const setContextData = useSetAtom(allocationContextDataAtom);
  const setHandlers = useSetAtom(allocationHandlersAtom);
  const setStatuses = useSetAtom(lineStatusesAtom);
  const setActiveLineId = useSetAtom(activeLineIdAtom);

  useEffect(() => {
    setContextData({ productMap, customerMap });
  }, [productMap, customerMap, setContextData]);

  useEffect(() => {
    setHandlers(handlers);
  }, [handlers, setHandlers]);

  useEffect(() => {
    setStatuses(lineStatuses);
  }, [lineStatuses, setStatuses]);

  useEffect(() => {
    setActiveLineId(activeLineId);
  }, [activeLineId, setActiveLineId]);

  return <>{children}</>;
}
```

#### 期待される効果
- Props数: 49個 → 約10個 (80%削減)
- 中間コンポーネントからhandler propsを完全除去
- コンポーネントの責務が明確化

#### リスクと対策
| リスク | 対策 |
|--------|------|
| Atom更新タイミングの不整合 | useEffect依存配列を慎重に設定 |
| パフォーマンス低下 | atom selectorsで不要な再レンダリング防止 |
| 既存機能の破壊 | 段階的移行、既存propsを一時的に維持 |

---

### フェーズ2: AllocationInputSection最適化

#### 目的
- 18個のPropsを削減
- コンポーネントの責務を分離

#### 変更するファイル
1. **修正**: `src/features/allocations/components/lots/AllocationInputSection.tsx`
2. **修正**: `src/features/allocations/components/lots/LotListCard.tsx`
3. **新規作成**: `src/features/allocations/hooks/useLotInputState.ts`

#### 期待される効果
- Props: 18個 → 3-4個
- 柔軟なレイアウト変更が可能

---

### フェーズ3: InventoryPage状態管理改善

#### 目的
- useState/useQuery混在の整理
- フィルタ状態のJotai化

#### 変更するファイル
1. **修正**: `src/features/inventory/state.ts`
2. **修正**: `src/features/inventory/pages/InventoryPage.tsx`
3. **新規作成**: `src/features/inventory/hooks/useInventoryPageState.ts`

#### 具体的な実装内容

```typescript
// src/features/inventory/state.ts に追加
export const inventoryPageStateAtom = atomWithStorage<{
  overviewMode: "items" | "product" | "supplier" | "warehouse";
}>(
  "inv:pageState",
  { overviewMode: "items" },
  createSessionStorageAdapter(),
  { getOnInit: true },
);
```

#### 期待される効果
- コンポーネント内のuseState: 2個 → 0個
- ブラウザタブ間での状態共有
- リロード後の状態復元

---

### フェーズ4: ForecastDetailCard分割

#### 目的
- 300行超えのコンポーネントを分割
- 4つのmutation定義を外部化

#### 変更するファイル
1. **修正**: `src/features/forecasts/components/ForecastDetailCard/ForecastDetailCard.tsx`
2. **新規作成**: `src/features/forecasts/hooks/useForecastMutations.ts`
3. **新規作成**: `src/features/forecasts/components/ForecastDetailCard/ForecastCardBody.tsx`

#### 期待される効果
- ForecastDetailCard: 300行 → 約80行
- mutation定義の再利用可能化

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

| フェーズ | 所要時間目安 | 依存関係 |
|---------|-------------|---------|
| フェーズ1: Allocation Context | 2-3日 | なし |
| フェーズ2: AllocationInputSection | 1日 | フェーズ1完了後 |
| フェーズ3: InventoryPage | 1日 | フェーズ1と並行可能 |
| フェーズ4: ForecastDetailCard | 1日 | フェーズ1と並行可能 |
| テスト・検証 | 1-2日 | 全フェーズ完了後 |

**合計: 6-8日**

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
