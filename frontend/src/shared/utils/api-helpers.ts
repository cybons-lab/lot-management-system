/**
 * Shared API utility functions
 *
 * These utilities eliminate common duplication patterns in API calls.
 * Using 'qs' library for robust query string handling.
 */

import qs from "qs";

/**
 * Build URL search params from object using qs library
 *
 * Automatically filters out undefined/null values and handles complex structures.
 * Supports nested objects, arrays, and special characters.
 *
 * @example
 * ```ts
 * const params = buildSearchParams({ skip: 0, limit: 100, filter: "active" });
 * // Returns: "?skip=0&limit=100&filter=active"
 *
 * const params2 = buildSearchParams({ skip: undefined, limit: 100 });
 * // Returns: "?limit=100"
 *
 * const params3 = buildSearchParams({ filters: { status: ["active", "pending"] } });
 * // Returns: "?filters[status][0]=active&filters[status][1]=pending"
 *
 * const params4 = buildSearchParams({});
 * // Returns: ""
 * ```
 *
 * @param params - Object with query parameters
 * @returns Query string with leading "?" or empty string
 */
export function buildSearchParams(params?: Record<string, unknown>): string {
  if (!params) return "";

  // Filter out undefined and null values
  const filtered = Object.entries(params).reduce(
    (acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, unknown>
  );

  const queryString = qs.stringify(filtered, {
    skipNulls: true, // Skip null values
    arrayFormat: "brackets", // Use brackets for arrays: foo[0]=bar&foo[1]=baz
    encode: true, // URL encode
  });

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

/**
 * Parse query string to object
 *
 * Useful for reading URL parameters.
 *
 * @example
 * ```ts
 * const params = parseQueryString("?skip=0&limit=100&filter=active");
 * // Returns: { skip: "0", limit: "100", filter: "active" }
 * ```
 */
export function parseQueryString(queryString: string): Record<string, unknown> {
  const cleanString = queryString.startsWith("?") ? queryString.slice(1) : queryString;
  return qs.parse(cleanString) as Record<string, unknown>;
}
