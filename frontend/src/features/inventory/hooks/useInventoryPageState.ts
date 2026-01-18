/**
 * useInventoryPageState.ts
 *
 * 在庫ページの状態管理フック
 * - ビューモードとフィルタをsessionStorageで永続化
 * - リロード後も状態が復元される
 */

import { useAtom, useAtomValue } from "jotai";
import { useCallback } from "react";

import {
  inventoryPageQueryParamsAtom,
  inventoryPageStateAtom,
  type InventoryItemFilters,
  type OverviewMode,
} from "../state";

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

  const resetFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      filters: {
        product_id: "",
        warehouse_id: "",
        supplier_id: "",
        tab: "all",
        primary_staff_only: false,
        candidate_mode: "stock",
        group_by: "supplier_product_warehouse",
      },
    }));
  }, [setState]);

  // queryParams変換（API用）
  const queryParams = useAtomValue(inventoryPageQueryParamsAtom);

  return {
    overviewMode: state.overviewMode,
    filters: state.filters,
    queryParams,
    setOverviewMode,
    setFilters,
    updateFilter,
    resetFilters,
  };
}
