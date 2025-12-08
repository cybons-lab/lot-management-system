/**
 * Modern HTTP client using ky
 *
 * Replaces axios with a lighter, more modern alternative.
 * Ky is built on fetch API with TypeScript-first design.
 */

import ky, { type KyInstance, type Options, type HTTPError } from "ky";

import { logError } from "@/services/error-logger";
import { createApiError, NetworkError } from "@/utils/errors/custom-errors";

/**
 * Base API configuration
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const API_TIMEOUT = 30000; // 30 seconds

/**
 * Handle network errors (no response)
 */
function handleNetworkError(error: HTTPError, request: Request): HTTPError {
  const networkError = new NetworkError("ネットワークエラーが発生しました");

  if (import.meta.env.DEV) {
    console.error(`[HTTP] Network Error: ${request?.method} ${request?.url}`, error);
  }

  logError("HTTP", networkError, {
    url: request?.url,
    method: request?.method,
  });

  error.message = networkError.message;
  return error;
}

/**
 * Extract error message from response body
 */
function extractErrorMessage(body: unknown, defaultMessage: string): string {
  if (body && typeof body === "object") {
    const errorBody = body as { message?: string; detail?: string };
    return errorBody.message || errorBody.detail || defaultMessage;
  }
  return defaultMessage;
}

/**
 * Handle API errors (with response)
 */
async function handleApiError(
  error: HTTPError,
  request: Request,
  response: Response,
): Promise<HTTPError> {
  const { status } = response;
  let body: unknown;

  try {
    body = await response.json();
    error.message = extractErrorMessage(body, error.message);
  } catch {
    error.message = response.statusText || error.message;
  }

  if (import.meta.env.DEV) {
    console.groupCollapsed(`[HTTP] Error: ${status} ${request?.url}`);
    console.error("Message:", error.message);
    console.error("Status:", status);
    console.error("Body:", body);
    console.groupEnd();
  }

  const apiError = createApiError(status, error.message, body);
  logError("HTTP", apiError, {
    url: request?.url,
    method: request?.method,
    status,
    response: body,
  });

  return error;
}

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
      (request) => {
        // Add auth token if available
        const token = localStorage.getItem("token");
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
        // Note: Request logging removed to reduce console noise
        // Enable by setting VITE_HTTP_DEBUG=true if needed
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        // Note: Response logging removed to reduce console noise
        // Enable by setting VITE_HTTP_DEBUG=true if needed
        return response;
      },
    ],
    beforeError: [
      async (error) => {
        const { response, request } = error;

        if (!response) {
          return handleNetworkError(error, request);
        }

        return handleApiError(error, request, response);
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

  /**
   * Download file
   */
  async download(url: string, filename: string, options?: Options): Promise<void> {
    const response = await apiClient.get(url, options);
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
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
