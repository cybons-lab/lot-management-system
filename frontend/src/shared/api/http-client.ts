/**
 * Modern HTTP client using ky
 *
 * Replaces axios with a lighter, more modern alternative.
 * Ky is built on fetch API with TypeScript-first design.
 */

import ky, { type HTTPError, type KyInstance, type Options } from "ky";

/**
 * Base API configuration
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const API_TIMEOUT = 30000; // 30 seconds

/**
 * Default ky instance with common configuration
 */
export const apiClient: KyInstance = ky.create({
  prefixUrl: API_BASE_URL,
  timeout: API_TIMEOUT,
  retry: {
    limit: 2,
    methods: ["get", "put", "head", "delete", "options", "trace"],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
  },
  hooks: {
    beforeRequest: [
      (request: Request) => {
        // Add common headers
        request.headers.set("Content-Type", "application/json");

        // Add auth token if available
        const token = localStorage.getItem("auth_token");
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    beforeError: [
      async (error: HTTPError) => {
        const { response } = error;

        if (response) {
          // Try to parse error response
          try {
            const body = await response.json();
            error.message = body.message || body.detail || error.message;
          } catch {
            // If not JSON, use status text
            error.message = response.statusText || error.message;
          }
        }

        return error;
      },
    ],
  },
});

/**
 * HTTP client with common methods
 *
 * Provides a consistent interface for API calls with automatic JSON handling.
 */
export const http = {
  /**
   * GET request
   */
  async get<T>(url: string, options?: Options): Promise<T> {
    return apiClient.get(url, options).json<T>();
  },

  /**
   * POST request
   */
  async post<T>(url: string, data?: unknown, options?: Options): Promise<T> {
    return apiClient.post(url, { json: data, ...options }).json<T>();
  },

  /**
   * PUT request
   */
  async put<T>(url: string, data?: unknown, options?: Options): Promise<T> {
    return apiClient.put(url, { json: data, ...options }).json<T>();
  },

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: unknown, options?: Options): Promise<T> {
    return apiClient.patch(url, { json: data, ...options }).json<T>();
  },

  /**
   * DELETE request
   */
  async delete<T>(url: string, options?: Options): Promise<T> {
    return apiClient.delete(url, options).json<T>();
  },

  /**
   * DELETE request without response body
   */
  async deleteVoid(url: string, options?: Options): Promise<void> {
    await apiClient.delete(url, options);
  },
};

/**
 * API response wrapper type
 *
 * For endpoints that return { data, message, success } pattern
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  page_size?: number;
}

/**
 * Helper to unwrap API response
 */
export function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.message || "API request failed");
  }
  return response.data;
}

/**
 * Create a typed API client for a specific resource
 *
 * @example
 * ```ts
 * const customersApi = createResourceClient<Customer>('/customers');
 *
 * const customers = await customersApi.list();
 * const customer = await customersApi.get('CUST001');
 * await customersApi.create({ customer_code: 'CUST002', ... });
 * ```
 */
export function createResourceClient<T>(basePath: string) {
  return {
    list: (params?: Record<string, unknown>) => {
      const searchParams = params
        ? new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
        : undefined;
      return http.get<T[]>(`${basePath}${searchParams ? "?" + searchParams : ""}`);
    },

    get: (id: string | number) => http.get<T>(`${basePath}/${id}`),

    create: (data: Partial<T>) => http.post<T>(basePath, data),

    update: (id: string | number, data: Partial<T>) => http.put<T>(`${basePath}/${id}`, data),

    delete: (id: string | number) => http.deleteVoid(`${basePath}/${id}`),
  };
}

export default apiClient;
