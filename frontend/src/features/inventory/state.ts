/**
 * state.ts
 *
 * 在庫管理機能の状態管理（Jotai）
 * - sessionStorageベースで状態を永続化
 * - URLにクエリパラメータは出さない
 */

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
