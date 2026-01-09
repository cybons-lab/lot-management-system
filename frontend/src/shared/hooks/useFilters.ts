/**
 * useFilters フック
 *
 * フィルター状態管理のための統一されたフック
 * - ジェネリック型対応
 * - クリア/リセット機能
 * - デフォルト値管理
 * - フィルター状態の検出
 */

import { useCallback, useMemo, useState } from "react";

/**
 * useFilters の戻り値型
 */
export interface UseFiltersReturn<T extends Record<string, any>> {
  /** 現在のフィルター値 */
  filters: T;

  /** 単一フィルター値の更新 */
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;

  /** 複数フィルター値の一括更新 */
  setFilters: (newFilters: Partial<T>) => void;

  /** 全フィルターをクリア（空値に設定） */
  clearFilters: () => void;

  /** 全フィルターをデフォルト値にリセット */
  resetFilters: () => void;

  /** デフォルト値から変更があるか */
  isActive: boolean;

  /** アクティブ（非デフォルト値）なフィルターの数 */
  activeCount: number;
}

/**
 * フィルター状態管理フック
 *
 * @template T - フィルター値の型
 * @param defaultFilters - デフォルトフィルター値
 * @returns フィルター状態と操作関数
 *
 * @example
 * ```tsx
 * interface ProductFilters {
 *   search: string;
 *   category: string;
 *   inStock: boolean;
 * }
 *
 * function ProductList() {
 *   const {
 *     filters,
 *     setFilter,
 *     clearFilters,
 *     isActive
 *   } = useFilters<ProductFilters>({
 *     search: '',
 *     category: 'all',
 *     inStock: false,
 *   });
 *
 *   return (
 *     <div>
 *       <input
 *         value={filters.search}
 *         onChange={(e) => setFilter('search', e.target.value)}
 *       />
 *       {isActive && <button onClick={clearFilters}>クリア</button>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFilters<T extends Record<string, any>>(
  defaultFilters: T,
): UseFiltersReturn<T> {
  const [filters, setFiltersState] = useState<T>(defaultFilters);

  // 単一フィルター値の更新
  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFiltersState((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // 複数フィルター値の一括更新
  const setFilters = useCallback((newFilters: Partial<T>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  // 全フィルターをクリア（空値に設定）
  const clearFilters = useCallback(() => {
    const clearedFilters = Object.keys(defaultFilters).reduce((acc, key) => {
      const value = defaultFilters[key];
      // 型に応じて適切な空値を設定
      if (typeof value === 'string') {
        acc[key] = '' as T[Extract<keyof T, string>];
      } else if (typeof value === 'boolean') {
        acc[key] = false as T[Extract<keyof T, string>];
      } else if (typeof value === 'number') {
        acc[key] = 0 as T[Extract<keyof T, string>];
      } else if (value === null || value === undefined) {
        acc[key] = undefined as T[Extract<keyof T, string>];
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as T);

    setFiltersState(clearedFilters);
  }, [defaultFilters]);

  // 全フィルターをデフォルト値にリセット
  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, [defaultFilters]);

  // デフォルト値から変更があるか
  const isActive = useMemo(() => {
    return Object.keys(filters).some((key) => {
      const current = filters[key];
      const defaultValue = defaultFilters[key];

      // 型に応じた比較
      if (typeof current === 'string') {
        return current !== defaultValue && current !== '';
      }
      if (typeof current === 'boolean') {
        return current !== defaultValue;
      }
      if (typeof current === 'number') {
        return current !== defaultValue && current !== 0;
      }
      return current !== defaultValue;
    });
  }, [filters, defaultFilters]);

  // アクティブなフィルターの数
  const activeCount = useMemo(() => {
    return Object.keys(filters).filter((key) => {
      const current = filters[key];
      const defaultValue = defaultFilters[key];

      if (typeof current === 'string') {
        return current !== defaultValue && current !== '';
      }
      if (typeof current === 'boolean') {
        return current !== defaultValue;
      }
      if (typeof current === 'number') {
        return current !== defaultValue && current !== 0;
      }
      return current !== defaultValue;
    }).length;
  }, [filters, defaultFilters]);

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    resetFilters,
    isActive,
    activeCount,
  };
}
