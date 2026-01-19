/**
 * Client Logs API Client
 * クライアントログ管理（フロントエンドエラーログ）
 */

import { http } from "@/shared/api/http-client";

// ===== Types =====

/**
 * Client Log
 */
export interface ClientLog {
  id: number;
  user_id: number | null;
  username: string | null;
  level: "info" | "warning" | "error";
  message: string;
  user_agent: string | null;
  request_id: string | null;
  created_at: string;
}

/**
 * Request types
 */
export interface ClientLogsListParams {
  limit?: number;
}

// ===== API Functions =====

/**
 * Get recent client logs
 * @endpoint GET /system/logs/recent
 */
export const getClientLogs = (params?: ClientLogsListParams) => {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());

  const queryString = searchParams.toString();
  return http.get<ClientLog[]>(`system/logs/recent${queryString ? "?" + queryString : ""}`);
};
