/**
 * useWithdrawalsPageState.ts
 *
 * 出庫ページの状態管理フック
 */

import { useAtom } from "jotai";
import { useCallback } from "react";

import type { WithdrawalType } from "../api";
import { withdrawalsPageStateAtom } from "../state";

export function useWithdrawalsPageState() {
  const [state, setState] = useAtom(withdrawalsPageStateAtom);

  const setPage = useCallback(
    (page: number | ((prev: number) => number)) => {
      setState((prev) => ({
        ...prev,
        page: typeof page === "function" ? page(prev.page) : page,
      }));
    },
    [setState],
  );

  const setFilterType = useCallback(
    (filterType: WithdrawalType | "all") => {
      setState((prev) => ({
        ...prev,
        filterType,
        page: 1, // フィルタ変更時はページを1にリセット
      }));
    },
    [setState],
  );

  return {
    page: state.page,
    filterType: state.filterType,
    setPage,
    setFilterType,
  };
}
