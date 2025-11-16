/**
 * 日付範囲フィルター状態管理フック
 */

import { useState, useCallback } from "react";

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
export function useDateRangeFilter(initialFrom?: string, initialTo?: string) {
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
