/**
 * フィルター状態管理フック
 * 
 * 検索フィルターの状態を管理
 */

import { useState, useCallback, useMemo } from 'react';

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
  const resetKey = useCallback(<K extends keyof T>(key: K) => {
    setFilters((prev) => ({ ...prev, [key]: initialFilters[key] }));
  }, [initialFilters]);
  
  // フィルターが初期状態かどうか
  const isDefault = useMemo(() => {
    return Object.keys(filters).every(
      (key) => filters[key] === initialFilters[key]
    );
  }, [filters, initialFilters]);
  
  // アクティブなフィルター数
  const activeCount = useMemo(() => {
    return Object.keys(filters).filter((key) => {
      const value = filters[key];
      const initialValue = initialFilters[key];
      
      // 空文字、null、undefined は非アクティブとみなす
      if (value === '' || value == null) return false;
      
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

/**
 * 検索フィルター状態管理フック
 * (検索キーワード特化版)
 * 
 * @param initialValue - 初期値
 * @returns 検索状態と操作関数
 * 
 * @example
 * ```tsx
 * const search = useSearchFilter();
 * 
 * return (
 *   <input
 *     value={search.value}
 *     onChange={(e) => search.setValue(e.target.value)}
 *     onKeyDown={(e) => e.key === 'Enter' && search.handleSearch()}
 *   />
 * );
 * ```
 */
export function useSearchFilter(initialValue = '') {
  const [value, setValue] = useState(initialValue);
  const [searchTerm, setSearchTerm] = useState(initialValue);
  
  // 検索実行
  const handleSearch = useCallback(() => {
    setSearchTerm(value);
  }, [value]);
  
  // クリア
  const clear = useCallback(() => {
    setValue('');
    setSearchTerm('');
  }, []);
  
  // リセット
  const reset = useCallback(() => {
    setValue(initialValue);
    setSearchTerm(initialValue);
  }, [initialValue]);
  
  return {
    value,
    setValue,
    searchTerm,
    handleSearch,
    clear,
    reset,
    isActive: searchTerm !== initialValue,
  };
}

/**
 * 日付範囲フィルター状態管理フック
 * 
 * @param initialFrom - 開始日初期値
 * @param initialTo - 終了日初期値
 * @returns 日付範囲状態と操作関数
 * 
 * @example
 * ```tsx
 * const dateRange = useDateRangeFilter();
 * 
 * return (
 *   <div>
 *     <input
 *       type="date"
 *       value={dateRange.from || ''}
 *       onChange={(e) => dateRange.setFrom(e.target.value)}
 *     />
 *     <input
 *       type="date"
 *       value={dateRange.to || ''}
 *       onChange={(e) => dateRange.setTo(e.target.value)}
 *     />
 *   </div>
 * );
 * ```
 */
export function useDateRangeFilter(
  initialFrom?: string,
  initialTo?: string
) {
  const [from, setFrom] = useState<string | undefined>(initialFrom);
  const [to, setTo] = useState<string | undefined>(initialTo);
  
  const reset = useCallback(() => {
    setFrom(initialFrom);
    setTo(initialTo);
  }, [initialFrom, initialTo]);
  
  const clear = useCallback(() => {
    setFrom(undefined);
    setTo(undefined);
  }, []);
  
  const isActive = from !== initialFrom || to !== initialTo;
  
  return {
    from,
    to,
    setFrom,
    setTo,
    reset,
    clear,
    isActive,
  };
}

/**
 * データをフィルタリングするヘルパー関数
 * 
 * @param data - フィルタリング対象のデータ
 * @param filters - フィルター条件
 * @returns フィルタリングされたデータ
 * 
 * @example
 * ```tsx
 * const filteredData = filterData(lots, {
 *   productCode: (lot) => !productCode || lot.product_code === productCode,
 *   hasStock: (lot) => lot.current_quantity > 0,
 * });
 * ```
 */
export function filterData<T>(
  data: T[],
  filters: Record<string, (item: T) => boolean>
): T[] {
  return data.filter((item) =>
    Object.values(filters).every((filterFn) => filterFn(item))
  );
}

/**
 * 検索キーワードでデータをフィルタリングするヘルパー関数
 *
 * @param data - フィルタリング対象のデータ
 * @param searchTerm - 検索キーワード
 * @param searchKeys - 検索対象のキー
 * @returns フィルタリングされたデータ
 *
 * @example
 * ```tsx
 * const filtered = searchData(lots, searchTerm, ['lot_no', 'product_code', 'product_name']);
 * ```
 */
export function searchData<T extends Record<string, unknown>>(
  data: T[],
  searchTerm: string,
  searchKeys: (keyof T)[]
): T[] {
  if (!searchTerm) return data;

  const lowerSearchTerm = searchTerm.toLowerCase();

  return data.filter((item) =>
    searchKeys.some((key) => {
      const value = item[key];
      if (value == null) return false;
      return String(value).toLowerCase().includes(lowerSearchTerm);
    })
  );
}
