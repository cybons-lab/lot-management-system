/**
 * SmartRead State Management (Jotai)
 *
 * SmartRead OCR機能の状態管理
 * - sessionStorageベースで状態を永続化
 * - ページ間での状態共有を実現
 */

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// ============================================
// 型定義
// ============================================

/**
 * アクティブタブ
 */
export type SmartReadTab = "import" | "tasks" | "detail" | "saved";

/**
 * 処理状態
 */
export type ProcessingState = "idle" | "processing" | "completed" | "error";

/**
 * タスクフィルタ
 */
export interface SmartReadTaskFilters {
  /** 状態フィルタ */
  state?: string;
  /** スキップ済みを除外 */
  excludeSkipped?: boolean;
  /** 日付範囲 (開始) */
  dateFrom?: string;
  /** 日付範囲 (終了) */
  dateTo?: string;
}

/**
 * ページ設定
 */
export interface SmartReadPageSettings {
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
 * 選択中の設定ID
 * キー: smartread:selectedConfigId
 */
export const selectedConfigIdAtom = atomWithStorage<number | null>(
  "smartread:selectedConfigId",
  null,
  createSessionStorageAdapter<number | null>(),
  { getOnInit: true },
);

/**
 * 選択中のタスクID
 * キー: smartread:selectedTaskId
 */
export const selectedTaskIdAtom = atomWithStorage<string | null>(
  "smartread:selectedTaskId",
  null,
  createSessionStorageAdapter<string | null>(),
  { getOnInit: true },
);

/**
 * アクティブタブ
 * キー: smartread:activeTab
 */
export const activeTabAtom = atomWithStorage<SmartReadTab>(
  "smartread:activeTab",
  "import",
  createSessionStorageAdapter<SmartReadTab>(),
  { getOnInit: true },
);

/**
 * 選択中の監視フォルダファイル
 * NOTE: sessionStorageには保存しない（一時的な選択状態）
 */
export const selectedWatchFilesAtom = atom<string[]>([]);

/**
 * 処理状態
 * NOTE: sessionStorageには保存しない
 */
export const processingStateAtom = atom<ProcessingState>("idle");

/**
 * タスクフィルタ
 * キー: smartread:taskFilters
 */
export const taskFiltersAtom = atomWithStorage<SmartReadTaskFilters>(
  "smartread:taskFilters",
  {
    excludeSkipped: false,
  },
  createSessionStorageAdapter<SmartReadTaskFilters>(),
  { getOnInit: true },
);

/**
 * ページ設定
 * キー: smartread:pageSettings
 */
export const pageSettingsAtom = atomWithStorage<SmartReadPageSettings>(
  "smartread:pageSettings",
  {
    pageSize: 50,
    autoRefreshInterval: 30,
    autoRefreshEnabled: false,
  },
  createSessionStorageAdapter<SmartReadPageSettings>(),
  { getOnInit: true },
);

// ============================================
// 派生Atoms
// ============================================

/**
 * 設定が選択されているかどうか
 */
export const hasSelectedConfigAtom = atom((get) => get(selectedConfigIdAtom) !== null);

/**
 * タスクが選択されているかどうか
 */
export const hasSelectedTaskAtom = atom((get) => get(selectedTaskIdAtom) !== null);

/**
 * ファイルが選択されているかどうか
 */
export const hasSelectedFilesAtom = atom((get) => get(selectedWatchFilesAtom).length > 0);

/**
 * 処理中かどうか
 */
export const isProcessingAtom = atom((get) => get(processingStateAtom) === "processing");
