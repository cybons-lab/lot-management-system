/**
 * 汎用フィルター状態管理フック
 */

import { useState, useCallback, useMemo } from "react";

/**
 * フィルター値の型
 */
export type FilterValue = string | number | boolean | Date | null | undefined;

/**
 * フィルター状態の型
 */
export type FilterState = Record<string, FilterValue>;

/**
 * フィルター状態管理フック
 *
 * @param initialFilters - 初期フィルター状態
 * @returns フィルター状態と操作関数
 *
 * @example
 * ```tsx
 * const filters = useFilters({
 *   productCode: '',
 *   warehouseCode: '',
 *   status: 'active',
 * });
 *
 * return (
 *   <div>
 *     <input
 *       value={filters.values.productCode}
 *       onChange={(e) => filters.set('productCode', e.target.value)}
 *     />
 *     <button onClick={filters.reset}>クリア</button>
 *   </div>
 * );
 * ```
 */
export function useFilters<T extends FilterState>(initialFilters: T) {
  const [filters, setFilters] = useState<T>(initialFilters);

  // 単一フィルターの値を設定
  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // 複数フィルターの値を一括設定
  const setMultiple = useCallback((updates: Partial<T>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  // フィルターをリセット
  const reset = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  // 特定のフィルターをリセット
  const resetKey = useCallback(
    <K extends keyof T>(key: K) => {
      setFilters((prev) => ({ ...prev, [key]: initialFilters[key] }));
    },
    [initialFilters],
  );

  // フィルターが初期状態かどうか
  const isDefault = useMemo(() => {
    return Object.keys(filters).every((key) => filters[key] === initialFilters[key]);
  }, [filters, initialFilters]);

  // アクティブなフィルター数
  const activeCount = useMemo(() => {
    return Object.keys(filters).filter((key) => {
      const value = filters[key];
      const initialValue = initialFilters[key];

      // 空文字、null、undefined は非アクティブとみなす
      if (value === "" || value == null) return false;

      // 初期値と異なる場合はアクティブ
      return value !== initialValue;
    }).length;
  }, [filters, initialFilters]);

  return {
    values: filters,
    set,
    setMultiple,
    reset,
    resetKey,
    isDefault,
    activeCount,
  };
}
