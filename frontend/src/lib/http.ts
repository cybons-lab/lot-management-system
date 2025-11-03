// frontend/src/lib/http.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * JWT の取得方法：
 * - 既定は localStorage の "access_token" または "jwt" を探す
 * - 必要なら setAuthToken(...) で明示設定してもOK
 */
let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

function resolveAuthToken(): string | null {
  if (_authToken) return _authToken;
  try {
    const byAccess = localStorage.getItem("access_token");
    if (byAccess) return byAccess;
    const byJwt = localStorage.getItem("jwt");
    if (byJwt) return byJwt;
  } catch {
    /* SSRやブラウザ外は無視 */
  }
  return null;
}

export class ApiError extends Error {
  status: number;
  detail?: unknown;
  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

export async function fetchApi<T>(
  endpoint: string,
  init: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = resolveAuthToken();

  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    baseHeaders["Authorization"] = `Bearer ${token}`;
  }

  const resp = await fetch(url, {
    headers: { ...baseHeaders, ...(init.headers ?? {}) },
    ...init,
  });

  if (!resp.ok) {
    let detail: unknown = undefined;
    try {
      detail = await resp.json();
    } catch {
      /* no body */
    }
    throw new ApiError(
      `HTTP ${resp.status} on ${endpoint}`,
      resp.status,
      detail
    );
  }
  if (resp.status === 204) return null as T;
  return (await resp.json()) as T;
}

export const http = {
  get: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, body?: unknown) =>
    fetchApi<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown) =>
    fetchApi<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  del: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: "DELETE" }),
};
