/**
 * Operation Logs API Client (v2.2 - Phase H-1)
 * 操作ログ管理
 */

import { http } from "@/shared/api/http-client";

// ===== Types =====

/**
 * Operation Log
 */
export interface OperationLog {
  log_id: number;
  user_id: number | null;
  user_name: string | null;
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

export interface FilterOption {
  label: string;
  value: string;
}

export interface OperationLogFiltersResponse {
  users: FilterOption[];
  operation_types: FilterOption[];
  target_tables: FilterOption[];
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
 * クエリパラメータを構築するヘルパー
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value.toString());
    }
  });
  const queryString = searchParams.toString();
  return queryString ? "?" + queryString : "";
}

/**
 * Get operation logs list
 * @endpoint GET /operation-logs
 */
export const getOperationLogs = (params?: OperationLogsListParams) => {
  const queryString = buildQueryParams(params ?? {});
  return http.get<OperationLogListResponse>(`operation-logs${queryString}`);
};

/**
 * Get operation log filters
 * @endpoint GET /operation-logs/filters
 */
export const getOperationLogFilters = () => {
  return http.get<OperationLogFiltersResponse>(`operation-logs/filters`);
};

/**
 * Get operation log detail
 * @endpoint GET /operation-logs/{log_id}
 */
export const getOperationLog = (logId: number) => {
  return http.get<OperationLog>(`operation-logs/${logId}`);
};
