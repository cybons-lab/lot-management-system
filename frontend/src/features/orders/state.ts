/**
 * Orders Feature State (Jotai atoms)
 *
 * 受注機能の状態管理
 * - リストページのフィルタ状態をsessionStorageで永続化
 */

import { atomWithStorage, createJSONStorage } from "jotai/utils";

import type { OrdersListParams } from "@/shared/types/aliases";

const storage = createJSONStorage<OrdersPageState>(() => sessionStorage);

export interface OrdersPageState {
  filters: OrdersListParams;
}

const INITIAL_STATE: OrdersPageState = {
  filters: {
    limit: 20,
    skip: 0,
  },
};

/**
 * 受注ページ状態atom
 * キー: orders:pageState
 */
export const ordersPageStateAtom = atomWithStorage<OrdersPageState>(
  "orders:pageState",
  INITIAL_STATE,
  storage,
  { getOnInit: true },
);
