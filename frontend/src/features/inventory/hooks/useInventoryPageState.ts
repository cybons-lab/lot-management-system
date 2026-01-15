/**
 * useInventoryPageState.ts
 *
 * 在庫ページの状態管理フック
 * - ビューモードとフィルタをsessionStorageで永続化
 * - リロード後も状態が復元される
 */

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

  // queryParams変換（API用）
  const queryParams = useMemo(
    () => ({
      product_id: state.filters.product_id ? Number(state.filters.product_id) : undefined,
      warehouse_id: state.filters.warehouse_id ? Number(state.filters.warehouse_id) : undefined,
      supplier_id: state.filters.supplier_id ? Number(state.filters.supplier_id) : undefined,
      tab: state.filters.tab,
    }),
    [state.filters],
  );

  return {
    overviewMode: state.overviewMode,
    filters: state.filters,
    queryParams,
    setOverviewMode,
    setFilters,
    updateFilter,
  };
}
