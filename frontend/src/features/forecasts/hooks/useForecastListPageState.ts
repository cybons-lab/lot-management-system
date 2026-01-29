/**
 * useForecastListPageState.ts
 *
 * フォーキャストリストページの状態管理フック
 * - フィルタとグループ展開状態をsessionStorageで永続化
 * - リロード後も状態が復元される
 */

import { useAtom } from "jotai";
import { useCallback, useMemo } from "react";

import { forecastListPageStateAtom, type ForecastListFilters } from "../state";

export function useForecastListPageState() {
  const [state, setState] = useAtom(forecastListPageStateAtom);

  const setFilters = useCallback(
    (filters: ForecastListFilters) => {
      setState((prev) => ({ ...prev, filters }));
    },
    [setState],
  );

  const updateFilter = useCallback(
    <K extends keyof ForecastListFilters>(key: K, value: ForecastListFilters[K]) => {
      setState((prev) => ({
        ...prev,
        filters: { ...prev.filters, [key]: value },
      }));
    },
    [setState],
  );

  const setOpenGroupKeys = useCallback(
    (keys: string[] | ((prev: string[]) => string[])) => {
      setState((prev) => ({
        ...prev,
        openGroupKeys: typeof keys === "function" ? keys(prev.openGroupKeys) : keys,
      }));
    },
    [setState],
  );

  const toggleGroupKey = useCallback(
    (groupKey: string) => {
      setState((prev) => {
        const keys = new Set(prev.openGroupKeys);
        if (keys.has(groupKey)) {
          keys.delete(groupKey);
        } else {
          keys.add(groupKey);
        }
        return { ...prev, openGroupKeys: Array.from(keys) };
      });
    },
    [setState],
  );

  // queryParams変換（API用）
  const queryParams = useMemo(
    () => ({
      customer_id: state.filters.customer_id ? Number(state.filters.customer_id) : undefined,
      delivery_place_id: state.filters.delivery_place_id
        ? Number(state.filters.delivery_place_id)
        : undefined,
      product_group_id: state.filters.product_group_id
        ? Number(state.filters.product_group_id)
        : undefined,
    }),
    [state.filters],
  );

  // openGroupKeysをSetとして返す
  const openGroupKeysSet = useMemo(() => new Set(state.openGroupKeys), [state.openGroupKeys]);

  return {
    filters: state.filters,
    openGroupKeys: openGroupKeysSet,
    queryParams,
    setFilters,
    updateFilter,
    setOpenGroupKeys,
    toggleGroupKey,
  };
}
