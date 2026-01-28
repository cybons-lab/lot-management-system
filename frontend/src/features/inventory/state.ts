/**
 * state.ts
 *
 * 在庫管理機能の状態管理（Jotai）
 * - sessionStorageベースで状態を永続化
 * - URLにクエリパラメータは出さない
 */

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// ============================================
// 型定義
// ============================================

/**
 * ロット一覧のフィルタ条件
 */
export interface LotFilters {
  /** 検索テキスト */
  search?: string;
  /** 製品コード */
  productCode?: string | null;
  /** 倉庫コード */
  warehouseCode?: string | null;
  /** ステータス */
  status?: string;
  /** 在庫ありのみ表示 */
  inStockOnly?: boolean;
}

/**
 * ロット一覧のテーブル設定
 */
export interface LotTableSettings {
  /** 現在のページ（0始まり） */
  page?: number;
  /** ページサイズ */
  pageSize?: number;
  /** ソートカラム */
  sortColumn?: string;
  /** ソート方向 */
  sortDirection?: "asc" | "desc";
}

/**
 * サマリビューの設定
 */
export interface SummarySettings {
  /** 表示する統計期間（日数） */
  periodDays?: number;
}

/**
 * ロット検索の一覧状態
 */
export interface LotSearchState {
  q: string;
  page: number;
  size: number;
  sort_by: string;
  sort_order: "asc" | "desc";
  status: string;
}

// ============================================
// Custom Storage（sessionStorage）
// ============================================

/**
 * sessionStorage用のカスタムストレージ
 * JotaiのデフォルトはlocalStorageなので、sessionStorageに変更
 */
function createSessionStorageAdapter<T>() {
  return {
    getItem: (key: string, initialValue: T): T => {
      try {
        const item = sessionStorage.getItem(key);
        if (item) {
          return JSON.parse(item) as T;
        }
        return initialValue;
      } catch {
        return initialValue;
      }
    },
    setItem: (key: string, value: T): void => {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch {
        // sessionStorageが使えない環境ではスキップ
      }
    },
    removeItem: (key: string): void => {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // sessionStorageが使えない環境ではスキップ
      }
    },
  };
}

// ============================================
// Atoms
// ============================================

/**
 * ロット一覧のフィルタ条件
 * キー: inv:lotFilters
 */
export const lotFiltersAtom = atomWithStorage<LotFilters>(
  "inv:lotFilters",
  {
    search: "",
    productCode: null,
    warehouseCode: null,
    status: "all",
    inStockOnly: false,
  },
  createSessionStorageAdapter<LotFilters>(),
  { getOnInit: true },
);

/**
 * ロット一覧のテーブル設定
 * キー: inv:lotTableSettings
 */
export const lotTableSettingsAtom = atomWithStorage<LotTableSettings>(
  "inv:lotTableSettings",
  {
    page: 0,
    pageSize: 25,
    sortColumn: "receipt_date",
    sortDirection: "desc",
  },
  createSessionStorageAdapter<LotTableSettings>(),
  { getOnInit: true },
);

/**
 * サマリビューの設定
 * キー: inv:summarySettings
 */
export const summarySettingsAtom = atomWithStorage<SummarySettings>(
  "inv:summarySettings",
  {
    periodDays: 30,
  },
  createSessionStorageAdapter<SummarySettings>(),
  { getOnInit: true },
);

/**
 * ロット検索パネルの状態
 * キー: inv:lotSearchState
 */
export const lotSearchStateAtom = atomWithStorage<LotSearchState>(
  "inv:lotSearchState",
  {
    q: "",
    page: 1,
    size: 20,
    sort_by: "expiry_date",
    sort_order: "asc",
    status: "active",
  },
  createSessionStorageAdapter<LotSearchState>(),
  { getOnInit: true },
);

// ============================================
// Inventory Page State
// ============================================

/**
 * ページビューモード
 */
export type OverviewMode = "items" | "supplier" | "warehouse" | "product" | "lots";

/**
 * タブフィルタタイプ
 */
export type InventoryTab = "all" | "in_stock" | "no_stock";

/**
 * アイテムビュー用フィルタ
 */
export interface InventoryItemFilters {
  product_group_id: string;
  warehouse_id: string;
  supplier_id: string;
  tab: InventoryTab;
  primary_staff_only: boolean;
  candidate_mode: "stock" | "master";
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
      product_group_id: "",
      warehouse_id: "",
      supplier_id: "",
      tab: "all",
      primary_staff_only: false,
      candidate_mode: "stock",
    },
  },
  createSessionStorageAdapter<{
    overviewMode: OverviewMode;
    filters: InventoryItemFilters;
  }>(),
  { getOnInit: true },
);

/**
 * 在庫ページのAPIクエリパラメータ（派生）
 */
export const inventoryPageQueryParamsAtom = atom((get) => {
  const { filters } = get(inventoryPageStateAtom);

  return {
    product_group_id: filters.product_group_id ? Number(filters.product_group_id) : undefined,
    warehouse_id: filters.warehouse_id ? Number(filters.warehouse_id) : undefined,
    supplier_id: filters.supplier_id ? Number(filters.supplier_id) : undefined,
    tab: filters.tab,
    primary_staff_only: filters.primary_staff_only,
  };
});
