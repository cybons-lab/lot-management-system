/**
 * URL/Query Parameter Utilities
 */

/**
 * クエリパラメータを構築するヘルパー
 *
 * オブジェクトを受け取り、空でない値のみを含むクエリ文字列を返します。
 * - `undefined`, `null`, `""` (空文字) は除外されます。
 * - 値は文字列に変換されます。
 *
 * @param params クエリパラメータのオブジェクト
 * @returns クエリ文字列（例: "?key=value&foo=bar"）または空文字列
 */
export function buildQueryParams(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? "?" + queryString : "";
}
