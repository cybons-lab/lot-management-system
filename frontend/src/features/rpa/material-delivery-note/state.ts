/**
 * Material Delivery Note State Management (Jotai)
 *
 * 素材納品書発行機能の状態管理
 * - sessionStorageベースで状態を永続化
 * - ステップ間での状態共有を実現
 */

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// ============================================
// 型定義
// ============================================

/**
 * Run Status (Backend定義と同期)
 */
export const RPA_RUN_STATUS = {
  STEP1_DONE: "step1_done",
  STEP2_CONFIRMED: "step2_confirmed",
  STEP3_RUNNING: "step3_running",
  STEP3_DONE: "step3_done",
  STEP4_CHECKING: "step4_checking",
  STEP4_NG_RETRY: "step4_ng_retry",
  STEP4_REVIEW: "step4_review",
  DONE: "done",
} as const;

export type RpaRunStatus = (typeof RPA_RUN_STATUS)[keyof typeof RPA_RUN_STATUS];

/**
 * Step2フィルタ
 */
export interface Step2Filters {
  /** issue_flag=trueのみ表示 */
  issueOnly?: boolean;
  /** 検索テキスト */
  search?: string;
  /** 層別コード */
  layerCode?: string;
}

/**
 * Step3グルーピング設定
 */
export interface Step3GroupingSettings {
  /** グルーピング方式 */
  groupingMethod: "supplier" | "period" | "user" | "none";
  /** 最大アイテム数/Run */
  maxItemsPerRun: number;
}

/**
 * Step4フィルタ
 */
export interface Step4Filters {
  /** match_result=falseのみ表示 */
  unmatchedOnly?: boolean;
  /** エラーのみ表示 */
  errorOnly?: boolean;
}

/**
 * ページ設定
 */
export interface MaterialDeliveryPageSettings {
  /** 1ページあたりの行数 */
  pageSize: number;
  /** 自動更新間隔 (秒) */
  autoRefreshInterval: number;
  /** 自動更新を有効にするか */
  autoRefreshEnabled: boolean;
}

// ============================================
// Custom Storage (sessionStorage)
// ============================================

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
 * 選択中のRun ID
 * キー: rpa:selectedRunId
 */
export const selectedRunIdAtom = atomWithStorage<number | null>(
  "rpa:selectedRunId",
  null,
  createSessionStorageAdapter<number | null>(),
  { getOnInit: true },
);

/**
 * 選択中のItem IDs (複数選択)
 * NOTE: sessionStorageには保存しない
 */
export const selectedItemIdsAtom = atom<number[]>([]);

/**
 * Step2フィルタ
 * キー: rpa:step2Filters
 */
export const step2FiltersAtom = atomWithStorage<Step2Filters>(
  "rpa:step2Filters",
  {
    search: "",
  },
  createSessionStorageAdapter<Step2Filters>(),
  { getOnInit: true },
);

/**
 * Step3グルーピング設定
 * キー: rpa:step3GroupingSettings
 */
export const step3GroupingSettingsAtom = atomWithStorage<Step3GroupingSettings>(
  "rpa:step3GroupingSettings",
  {
    groupingMethod: "supplier",
    maxItemsPerRun: 50,
  },
  createSessionStorageAdapter<Step3GroupingSettings>(),
  { getOnInit: true },
);

/**
 * Step4フィルタ
 * キー: rpa:step4Filters
 */
export const step4FiltersAtom = atomWithStorage<Step4Filters>(
  "rpa:step4Filters",
  {
    unmatchedOnly: false,
    errorOnly: false,
  },
  createSessionStorageAdapter<Step4Filters>(),
  { getOnInit: true },
);

/**
 * ページ設定
 * キー: rpa:pageSettings
 */
export const pageSettingsAtom = atomWithStorage<MaterialDeliveryPageSettings>(
  "rpa:pageSettings",
  {
    pageSize: 50,
    autoRefreshInterval: 10,
    autoRefreshEnabled: true,
  },
  createSessionStorageAdapter<MaterialDeliveryPageSettings>(),
  { getOnInit: true },
);

/**
 * PAD実行中かどうか
 * NOTE: sessionStorageには保存しない
 */
export const isPadRunningAtom = atom<boolean>(false);

/**
 * PADロック残り時間 (秒)
 * NOTE: sessionStorageには保存しない
 */
export const padLockRemainingAtom = atom<number>(0);

// ============================================
// 派生Atoms
// ============================================

/**
 * Runが選択されているかどうか
 */
export const hasSelectedRunAtom = atom((get) => get(selectedRunIdAtom) !== null);

/**
 * Itemが選択されているかどうか
 */
export const hasSelectedItemsAtom = atom((get) => get(selectedItemIdsAtom).length > 0);

/**
 * 選択中のItem数
 */
export const selectedItemCountAtom = atom((get) => get(selectedItemIdsAtom).length);

/**
 * Step2でissueOnlyフィルタが有効かどうか
 */
export const isStep2FilteredAtom = atom((get) => {
  const filters = get(step2FiltersAtom);
  return filters.issueOnly || !!filters.search || !!filters.layerCode;
});

/**
 * Step4でフィルタが有効かどうか
 */
export const isStep4FilteredAtom = atom((get) => {
  const filters = get(step4FiltersAtom);
  return filters.unmatchedOnly || filters.errorOnly;
});
