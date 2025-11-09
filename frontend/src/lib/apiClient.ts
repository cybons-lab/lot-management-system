// src/lib/apiClient.ts
import axios from "axios";
import type { paths } from "@/types/api";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";
export const http = axios.create({ baseURL, withCredentials: false });

http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const msg =
      err.response?.data?.detail ?? err.response?.data?.message ?? err.message ?? "Request failed";
    return Promise.reject(new Error(msg));
  },
);

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await http.get<T>(url, { params });
  return res.data;
}

export async function post<T>(url: string, data?: unknown): Promise<T> {
  const res = await http.post<T>(url, data);
  return res.data;
}

// 必要に応じて put/delete も追加
type GetForecastList = paths["/api/forecast/list"]["get"];
export async function getForecastList(signal?: AbortSignal) {
  const res = await fetch("/api/forecast/list", { signal });
  if (!res.ok) throw new Error(`forecast/list ${res.status}`);
  return (await res.json()) as GetForecastList["responses"]["200"]["content"]["application/json"];
}
