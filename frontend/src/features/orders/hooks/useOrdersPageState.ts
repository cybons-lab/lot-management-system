/**
 * useOrdersPageState.ts
 *
 * 受注ページの状態管理フック
 */

import { useAtom } from "jotai";
import { useCallback } from "react";

import { ordersPageStateAtom } from "../state";

import type { OrdersListParams } from "@/shared/types/aliases";

export function useOrdersPageState() {
  const [state, setState] = useAtom(ordersPageStateAtom);

  const setFilters = useCallback(
    (filters: OrdersListParams) => {
      setState((prev) => ({ ...prev, filters }));
    },
    [setState],
  );

  const resetFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      filters: { limit: 20, skip: 0 },
    }));
  }, [setState]);

  return {
    filters: state.filters,
    setFilters,
    resetFilters,
  };
}
