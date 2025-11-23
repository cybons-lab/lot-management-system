/**
 * Operation Logs Hooks (v2.2 - Phase H-1)
 * TanStack Query hooks for operation logs
 */

import { useQuery } from "@tanstack/react-query";

import type { OperationLogsListParams } from "../api";
import { getOperationLogs, getOperationLog } from "../api";

// ===== Query Keys =====

export const operationLogKeys = {
  all: ["operationLogs"] as const,
  lists: () => [...operationLogKeys.all, "list"] as const,
  list: (params?: OperationLogsListParams) => [...operationLogKeys.lists(), params] as const,
  details: () => [...operationLogKeys.all, "detail"] as const,
  detail: (id: number) => [...operationLogKeys.details(), id] as const,
};

// ===== Query Hooks =====

/**
 * Get operation logs list
 */
export const useOperationLogs = (params?: OperationLogsListParams) => {
  return useQuery({
    queryKey: operationLogKeys.list(params),
    queryFn: () => getOperationLogs(params),
    staleTime: 1000 * 60, // 1 minute (logs are frequently updated)
  });
};

/**
 * Get operation log detail
 */
export const useOperationLog = (logId: number) => {
  return useQuery({
    queryKey: operationLogKeys.detail(logId),
    queryFn: () => getOperationLog(logId),
    enabled: logId > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
