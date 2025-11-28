/**
 * HTTP Client
 * エラーハンドリングを統合したHTTP通信クライアント
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from "axios";

import { logError } from "@/services/error-logger";
import { createApiError, NetworkError } from "@/utils/errors/custom-errors";

/**
 * Axiosインスタンスの作成
 */
const createHttpClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || "/api",
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // リクエストインターセプター
  client.interceptors.request.use(
    (config) => {
      // 認証トークンの追加（必要に応じて）
      // const token = localStorage.getItem('auth_token');
      // if (token) {
      //   config.headers.Authorization = `Bearer ${token}`;
      // }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  // レスポンスインターセプター
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      // ネットワークエラー
      if (!error.response) {
        const networkError = new NetworkError("ネットワークエラーが発生しました");

        // Log network error
        logError("HTTP", networkError, {
          url: error.config?.url,
          method: error.config?.method,
        });

        throw networkError;
      }

      // APIエラー
      const { status, data } = error.response;
      const message = data?.detail || data?.message || "エラーが発生しました";
      const apiError = createApiError(status, message, data);

      // Log API error
      logError("HTTP", apiError, {
        url: error.config?.url,
        method: error.config?.method,
        status,
        response: data,
      });

      throw apiError;
    },
  );

  return client;
};

/**
 * HTTPクライアントインスタンス
 */
export const http = createHttpClient();

/**
 * 型付きGETリクエスト
 */
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return http.get<T>(url, config);
}

/**
 * 型付きPOSTリクエスト
 */
export async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  return http.post<T>(url, data, config);
}

/**
 * 型付きPUTリクエスト
 */
export async function put<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  return http.put<T>(url, data, config);
}

/**
 * 型付きPATCHリクエスト
 */
export async function patch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  return http.patch<T>(url, data, config);
}

/**
 * 型付きDELETEリクエスト
 */
export async function del(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<void>> {
  return http.delete(url, config);
}

// http.delete は予約語なので別名でエクスポート
// 型安全性のため、オブジェクトプロパティとして再代入
Object.assign(http, { delete: del });

export default http;
