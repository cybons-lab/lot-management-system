// frontend/src/lib/admin-api.ts
import { fetchApi } from "@/lib/http";
import type { DashboardStats, ResetResponse } from "@/types";

/**
 * 管理ダッシュボード等「自分だけが触れる」前提のエンドポイント群。
 * JWT は lib/http.ts 側で自動付与されます（localStorage "access_token" or "jwt"）。
 */

export const getStats = () =>
  fetchApi<DashboardStats>("/admin/stats", { method: "GET" });

export const resetDatabase = () =>
  fetchApi<ResetResponse>("/admin/reset-database", { method: "POST" });
