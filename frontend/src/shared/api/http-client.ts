/**
 * Modern HTTP client using ky
 *
 * Replaces axios with a lighter, more modern alternative.
 * Ky is built on fetch API with TypeScript-first design.
 *
 * 【設計判断】なぜaxiosからkyに移行したのか:
 * 1. バンドルサイズの削減
 *    - axios: ~13KB (minified + gzipped)
 *    - ky: ~3KB (minified + gzipped)
 *    → 初期ロード時間の短縮
 *
 * 2. TypeScript ファーストの設計
 *    - kyは最初からTypeScriptで書かれている
 *    - 型推論がより正確、型定義のメンテナンス不要
 *
 * 3. モダンなAPI
 *    - fetch APIベース（ブラウザ標準）
 *    - Promise/async-awaitに最適化
 *    - より直感的なエラーハンドリング
 */

import ky, { type KyInstance, type Options, type HTTPError } from "ky";

import { logError } from "@/services/error-logger";
import { getAuthToken } from "@/shared/auth/token";
import { createRequestId } from "@/shared/utils/request-id";
import { AuthorizationError, createApiError, NetworkError } from "@/utils/errors/custom-errors";

/**
 * Base API configuration
 *
 * 【設計根拠】
 * - API_TIMEOUT: 30秒
 *   理由: 自動車部品の在庫検索など、大量データの処理に時間がかかる可能性
 *   -> 通常のAPI呼び出しは5秒以内だが、複雑なレポート生成等を考慮
 *   -> ただし、30秒を超える処理は非同期バッチ処理に移行すべき
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const API_TIMEOUT = 30000; // 30 seconds

/**
 * Custom event for authentication errors (401)
 * Components can listen for this event to handle session expiration
 *
 * 【設計意図】なぜカスタムイベントを使うのか:
 * 1. グローバルな認証エラーハンドリング
 *    - どのコンポーネントからAPIを呼んでも、401エラーを一元的に処理
 *    - 例: 営業が在庫照会中にセッション切れ → ログイン画面に自動遷移
 *
 * 2. コンポーネント間の疎結合
 *    - HTTP clientが直接ルーティングライブラリに依存しない
 *    - イベントリスナーを持つコンポーネント（App.tsx等）が自由に対応を決定
 *
 * 3. 複数箇所での同時対応
 *    - ログイン画面へのリダイレクト
 *    - トースト通知表示
 *    - ローカルストレージのクリア
 *    → 各コンポーネントが独立してイベントを購読・処理
 */
export const AUTH_ERROR_EVENT = "auth:unauthorized";
export const FORBIDDEN_ERROR_EVENT = "auth:forbidden";

/**
 * Dispatch authentication error event
 * This allows React components to react to 401 errors globally
 */
function dispatchAuthError(message: string = "セッションの有効期限が切れました"): void {
  window.dispatchEvent(
    new CustomEvent(AUTH_ERROR_EVENT, {
      detail: { message },
    }),
  );
}

/**
 * Dispatch authorization error event (403)
 */
function dispatchForbiddenError(message: string = "この操作を行う権限がありません"): void {
  window.dispatchEvent(
    new CustomEvent(FORBIDDEN_ERROR_EVENT, {
      detail: { message },
    }),
  );
}

/**
 * Custom event for mock data detection
 * Components can listen for this event to show mock indicator
 */
export const MOCK_STATUS_EVENT = "api:mock-status";

/**
 * Dispatch mock status event
 */
function dispatchMockStatus(isMock: boolean): void {
  window.dispatchEvent(
    new CustomEvent(MOCK_STATUS_EVENT, {
      detail: { isMock },
    }),
  );
}

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
    request_id: request?.headers.get("X-Request-ID") || undefined,
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
 * Check if request is to a login-related endpoint
 */
function isLoginEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes("/auth/login") || url.includes("/auth/me");
}

/**
 * Handle 401 Unauthorized errors
 */
function handleUnauthorizedError(request: Request, errorMessage: string): void {
  if (!isLoginEndpoint(request?.url)) {
    dispatchAuthError(errorMessage || "セッションの有効期限が切れました");
  }
}

/**
 * Handle 403 Forbidden errors
 */
function handleForbiddenError(request: Request, errorMessage: string): void {
  if (!isLoginEndpoint(request?.url)) {
    dispatchForbiddenError(errorMessage || "この操作を行う権限がありません");
  }
}

/**
 * Log API error in development mode
 * Note: 認証エラー(401/403)はログイン前のページアクセス等で頻発するため抑制
 */
function logApiErrorDev(
  status: number,
  url: string | undefined,
  message: string,
  body: unknown,
): void {
  // 認証エラーはログインしていない状態で発生するのは想定内なのでログ抑制
  if (status === 401 || status === 403) {
    return;
  }

  if (import.meta.env.DEV) {
    console.groupCollapsed(`[HTTP] Error: ${status} ${url}`);
    console.error("Message:", message);
    console.error("Status:", status);
    console.error("Body:", body);
    console.groupEnd();
  }
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

  // Handle 401 Unauthorized - session expired or invalid token
  if (status === 401) {
    handleUnauthorizedError(request, error.message);
  }
  if (status === 403) {
    handleForbiddenError(request, error.message);
  }

  logApiErrorDev(status, request?.url, error.message, body);

  // 認証エラー(401/403)はログイン前のページアクセス等で頻発するため、エラーログ送信を抑制
  if (status !== 401 && status !== 403) {
    const apiError = createApiError(status, error.message, body);
    logError("HTTP", apiError, {
      url: request?.url,
      method: request?.method,
      status,
      response: body,
      request_id: request?.headers.get("X-Request-ID") || undefined,
    });
  }

  return error;
}

/**
 * Default ky instance with common configuration
 */
/**
 * 【リトライ設定の設計意図】
 *
 * limit: 2回まで
 * - 理由: ネットワーク一時的な不安定性に対応（瞬断等）
 * - トレードオフ: リトライ回数が多すぎるとレスポンス遅延
 *   → 2回（初回 + リトライ2回 = 最大3回試行）で十分
 *
 * methods: POSTを除外
 * - 【重要な判断】なぜPOSTをリトライしないのか:
 *   1. 冪等性の問題
 *      - GET/PUT/DELETE: 何度実行しても結果が同じ（冪等）
 *      - POST: 実行するたびに新しいリソースが作成される（非冪等）
 *   2. 二重登録のリスク
 *      - 受注登録APIでリトライすると、同じ受注が2重登録される
 *      - → 在庫引当の重複、顧客への二重請求などの深刻な問題
 *   3. 運用判断
 *      - ネットワークエラー時は、ユーザーに明示的にエラー表示
 *      - → ユーザーが画面を確認してから手動で再実行
 *      - → 「登録済みかどうか不明」な状態を避ける
 *
 * statusCodes: 一時的なエラーのみリトライ
 * - 408 Request Timeout: タイムアウト → リトライ可能
 * - 413 Payload Too Large: データ量が多すぎる → リトライしても無駄だが、一時的な制限の可能性
 * - 429 Too Many Requests: レート制限 → 時間をおいてリトライすれば成功する可能性
 * - 5xx Server Error: サーバー側の一時的な障害 → リトライで回復する可能性
 * - 4xx Client Error（400, 401, 403, 404等）: クライアントのミス → リトライしても無駄なので除外
 */
type AuthMode = "public" | "auth";

function ensureAuthToken(): string {
  const token = getAuthToken();
  if (!token) {
    throw new AuthorizationError("認証トークンがありません");
  }
  return token;
}

function createApiClient(authMode: AuthMode): KyInstance {
  return ky.create({
    prefixUrl: API_BASE_URL,
    timeout: API_TIMEOUT,
    retry: {
      limit: 2,
      methods: ["get", "put", "head", "delete", "options", "trace"], // POST除外: 冪等性
      statusCodes: [408, 413, 429, 500, 502, 503, 504],
    },
    hooks: {
      beforeRequest: [
        (request) => {
          if (authMode === "auth") {
            const token = ensureAuthToken();
            request.headers.set("Authorization", `Bearer ${token}`);
          }
          request.headers.set("X-Request-ID", createRequestId());
          // Note: Request logging removed to reduce console noise
          // Enable by setting VITE_HTTP_DEBUG=true if needed
        },
      ],
      afterResponse: [
        async (_request, _options, response) => {
          // Check for mock status header
          const isMock = response.headers.get("X-Mock-Status") === "true";
          if (isMock) {
            dispatchMockStatus(true);
          }

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
}

export const apiClientPublic: KyInstance = createApiClient("public");
export const apiClientAuth: KyInstance = createApiClient("auth");
export const apiClient: KyInstance = apiClientAuth;

/**
 * HTTP client with common methods
 *
 * Provides a consistent interface for API calls with automatic JSON handling.
 */
function createHttpClient(client: KyInstance) {
  return {
    /**
     * GET request
     */
    async get<T>(url: string, options?: Options): Promise<T> {
      return client.get(url, options).json<T>();
    },

    /**
     * POST request
     */
    async post<T>(url: string, data?: unknown, options?: Options): Promise<T> {
      return client.post(url, { json: data, ...options }).json<T>();
    },

    /**
     * POST request with FormData
     */
    async postFormData<T>(url: string, formData: FormData, options?: Options): Promise<T> {
      return client.post(url, { body: formData, ...options }).json<T>();
    },

    /**
     * PUT request
     */
    async put<T>(url: string, data?: unknown, options?: Options): Promise<T> {
      return client.put(url, { json: data, ...options }).json<T>();
    },

    /**
     * PATCH request
     */
    async patch<T>(url: string, data?: unknown, options?: Options): Promise<T> {
      return client.patch(url, { json: data, ...options }).json<T>();
    },

    /**
     * DELETE request
     */
    async delete<T>(url: string, options?: Options): Promise<T> {
      return client.delete(url, options).json<T>();
    },

    /**
     * DELETE request without response body
     */
    async deleteVoid(url: string, options?: Options): Promise<void> {
      await client.delete(url, options);
    },

    /**
     * Download file
     */
    async download(url: string, filename: string, options?: Options): Promise<void> {
      const response = await client.get(url, options);
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
}

export const httpPublic = createHttpClient(apiClientPublic);
export const httpAuth = createHttpClient(apiClientAuth);

// Backwards compatibility: default to auth-required client
export const http = httpAuth;

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

export default apiClientAuth;
