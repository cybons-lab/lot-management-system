/**
 * フィルタリング・検索ヘルパー関数
 */

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
export function filterData<T>(data: T[], filters: Record<string, (item: T) => boolean>): T[] {
  return data.filter((item) => Object.values(filters).every((filterFn) => filterFn(item)));
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
  searchKeys: (keyof T)[],
): T[] {
  if (!searchTerm) return data;

  const lowerSearchTerm = searchTerm.toLowerCase();

  return data.filter((item) =>
    searchKeys.some((key) => {
      const value = item[key];
      if (value == null) return false;
      return String(value).toLowerCase().includes(lowerSearchTerm);
    }),
  );
}
