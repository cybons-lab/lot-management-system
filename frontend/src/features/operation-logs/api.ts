/**
 * Operation Logs API Client (v2.2 - Phase H-1)
 * 操作ログ管理
 */

import { fetchApi } from "@/shared/libs/http";

// ===== Types =====

/**
 * Operation Log
 */
export interface OperationLog {
  log_id: number;
  user_id: number | null;
  operation_type: string;
  target_table: string;
  target_id: number | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

/**
 * Operation Log List Response
 */
export interface OperationLogListResponse {
  logs: OperationLog[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * Request types
 */
export interface OperationLogsListParams {
  skip?: number;
  limit?: number;
  user_id?: number;
  operation_type?: string;
  target_table?: string;
  start_date?: string;
  end_date?: string;
}

// ===== API Functions =====

/**
 * Get operation logs list
 * @endpoint GET /operation-logs
 */
export const getOperationLogs = (params?: OperationLogsListParams) => {
  const searchParams = new URLSearchParams();
  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
  if (params?.user_id) searchParams.append("user_id", params.user_id.toString());
  if (params?.operation_type) searchParams.append("operation_type", params.operation_type);
  if (params?.target_table) searchParams.append("target_table", params.target_table);
  if (params?.start_date) searchParams.append("start_date", params.start_date);
  if (params?.end_date) searchParams.append("end_date", params.end_date);

  const queryString = searchParams.toString();
  return fetchApi.get<OperationLogListResponse>(
    `/operation-logs${queryString ? "?" + queryString : ""}`,
  );
};

/**
 * Get operation log detail
 * @endpoint GET /operation-logs/{log_id}
 */
export const getOperationLog = (logId: number) => {
  return fetchApi.get<OperationLog>(`/operation-logs/${logId}`);
};
