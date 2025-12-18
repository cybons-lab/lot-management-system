/**
 * Withdrawals Feature State (Jotai atoms)
 *
 * 出庫機能の状態管理
 * - リストページのフィルタ状態をsessionStorageで永続化
 */

import { atomWithStorage, createJSONStorage } from "jotai/utils";

import type { WithdrawalType } from "./api";

const storage = createJSONStorage<WithdrawalsPageState>(() => sessionStorage);

export interface WithdrawalsPageState {
  page: number;
  filterType: WithdrawalType | "all";
}

const INITIAL_STATE: WithdrawalsPageState = {
  page: 1,
  filterType: "all",
};

/**
 * 出庫ページ状態atom
 * キー: withdrawals:pageState
 */
export const withdrawalsPageStateAtom = atomWithStorage<WithdrawalsPageState>(
  "withdrawals:pageState",
  INITIAL_STATE,
  storage,
  { getOnInit: true },
);
