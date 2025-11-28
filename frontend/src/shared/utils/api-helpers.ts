/**
 * Shared API utility functions
 *
 * These utilities eliminate common duplication patterns in API calls.
 */

/**
 * Build URL search params from object
 *
 * Automatically filters out undefined/null values and converts all values to strings.
 *
 * @example
 * ```ts
 * const params = buildSearchParams({ skip: 0, limit: 100, filter: "active" });
 * // Returns: "?skip=0&limit=100&filter=active"
 *
 * const params2 = buildSearchParams({ skip: undefined, limit: 100 });
 * // Returns: "?limit=100"
 *
 * const params3 = buildSearchParams({});
 * // Returns: ""
 * ```
 *
 * @param params - Object with query parameters
 * @returns Query string with leading "?" or empty string
 */
export function buildSearchParams(params?: Record<string, unknown>): string {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    // Skip undefined and null values
    if (value !== undefined && value !== null) {
      // Convert booleans and numbers to strings
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

/**
 * Build search params from object (alternative syntax)
 *
 * Same as buildSearchParams but returns query string without leading "?".
 * Useful when you need to manually construct the URL.
 *
 * @example
 * ```ts
 * const qs = toQueryString({ skip: 0, limit: 100 });
 * const url = `/api/items${qs ? "?" + qs : ""}`;
 * ```
 */
export function toQueryString(params?: Record<string, unknown>): string {
  const result = buildSearchParams(params);
  return result.startsWith("?") ? result.slice(1) : result;
}
