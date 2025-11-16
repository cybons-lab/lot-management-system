/**
 * 検索フィルター状態管理フック
 * (検索キーワード特化版)
 */

import { useState, useCallback } from "react";

/**
 * 検索フィルター状態管理フック
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
export function useSearchFilter(initialValue = "") {
  const [value, setValue] = useState(initialValue);
  const [searchTerm, setSearchTerm] = useState(initialValue);

  // 検索実行
  const handleSearch = useCallback(() => {
    setSearchTerm(value);
  }, [value]);

  // クリア
  const clear = useCallback(() => {
    setValue("");
    setSearchTerm("");
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
