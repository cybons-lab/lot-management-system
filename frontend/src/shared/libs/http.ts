// frontend/src/lib/http.ts
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from "axios";

/** 基底URL: .env がなければ /api/ にフォールバック */
const RAW_BASE = import.meta.env.VITE_API_BASE ?? "/api/";

/** 末尾スラッシュを必ず付与 */
function ensureTrailingSlash(u: string) {
  return u.endsWith("/") ? u : u + "/";
}

/** 先頭スラッシュを剥がす */
function stripLeadingSlash(p: string) {
  return p.replace(/^\/+/, "");
}

/** 絶対URLへ安全結合（/api/ + admin/seeds → http://localhost/api/admin/seeds） */
export function toApiUrl(path: string): string {
  const base = ensureTrailingSlash(RAW_BASE);
  const clean = stripLeadingSlash(path);

  // ベースが絶対URLなら new URL() を使用
  if (/^https?:\/\//i.test(base)) {
    return new URL(clean, base).toString();
  }

  // ベースが相対パス（/api/等）の場合
  // ブラウザ環境なら origin を付与して完全URLに
  if (typeof window !== "undefined" && window.location) {
    return new URL(clean, window.location.origin + base).toString();
  }

  // SSR/テスト環境等では単純結合（この場合interceptorで絶対化される前提）
  return base + clean;
}

/** 素のaxiosインスタンス（baseURLは使わず、常にtoApiUrlで解決） */
const client: AxiosInstance = axios.create({
  // baseURLは設定しない（結合は常にtoApiUrlで行う）
  timeout: 15000,
  withCredentials: false,
});

/** リクエスト共通ヘッダとログ（必要なら調整） */
client.interceptors.request.use((cfg) => {
  // 相対指定なら必ずAPI絶対URLへ変換
  if (cfg.url && !/^https?:\/\//i.test(cfg.url)) {
    cfg.url = toApiUrl(cfg.url);
  }
  cfg.headers.Accept = cfg.headers.Accept ?? "application/json";
  cfg.headers["Content-Type"] = cfg.headers["Content-Type"] ?? "application/json";
  return cfg;
});

/** レスポンスは data をそのまま返し、エラーは握りつぶさず投げる */
client.interceptors.response.use(
  (res: AxiosResponse) => res,
  (err) => Promise.reject(err),
);

/** 呼び出し側が使う薄いラッパ。既存の http.post("admin/seeds") と互換 */
export const http = {
  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await client.get<T>(path, config);
    return res.data;
  },
  async post<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await client.post<T>(path, data, config);
    return res.data;
  },
  async put<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await client.put<T>(path, data, config);
    return res.data;
  },
  async patch<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await client.patch<T>(path, data, config);
    return res.data;
  },
  async delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await client.delete<T>(path, config);
    return res.data;
  },
};

/** テストやデバッグ用に露出しておく */
export const API_BASE = ensureTrailingSlash(RAW_BASE);
export const axiosClient = client;
export const fetchApi = {
  get: http.get,
  post: http.post,
  put: http.put,
  patch: http.patch,
  delete: http.delete,
};
