/**
 * Forecast Feature State (Jotai atoms)
 *
 * フォーキャスト機能の状態管理
 * - リストページのフィルタ状態をsessionStorageで永続化
 */

import { atomWithStorage } from "jotai/utils";

/**
 * sessionStorage用のカスタムストレージアダプター
 */
function createSessionStorageAdapter<T>() {
  return {
    getItem: (key: string, initialValue: T): T => {
      if (typeof window === "undefined") return initialValue;
      try {
        const item = window.sessionStorage.getItem(key);
        return item ? (JSON.parse(item) as T) : initialValue;
      } catch {
        return initialValue;
      }
    },
    setItem: (key: string, value: T): void => {
      if (typeof window === "undefined") return;
      try {
        window.sessionStorage.setItem(key, JSON.stringify(value));
      } catch {
        // ignore
      }
    },
    removeItem: (key: string): void => {
      if (typeof window === "undefined") return;
      window.sessionStorage.removeItem(key);
    },
  };
}

/**
 * フォーキャストリストページのフィルタ
 */
export interface ForecastListFilters {
  customer_id: string;
  delivery_place_id: string;
  product_id: string;
}

/**
 * フォーキャストリストページの状態
 */
export interface ForecastListPageState {
  filters: ForecastListFilters;
  openGroupKeys: string[];
}

const INITIAL_STATE: ForecastListPageState = {
  filters: {
    customer_id: "",
    delivery_place_id: "",
    product_id: "",
  },
  openGroupKeys: [],
};

/**
 * フォーキャストリストページ状態atom
 * キー: fc:listPageState
 */
export const forecastListPageStateAtom = atomWithStorage<ForecastListPageState>(
  "fc:listPageState",
  INITIAL_STATE,
  createSessionStorageAdapter<ForecastListPageState>(),
  { getOnInit: true },
);
