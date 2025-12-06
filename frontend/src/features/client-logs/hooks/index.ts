/**
 * Client Logs Hooks
 * TanStack Query hooks for client logs
 */

import { useQuery } from "@tanstack/react-query";

import type { ClientLogsListParams } from "../api";
import { getClientLogs } from "../api";

// ===== Query Keys =====

export const clientLogKeys = {
  all: ["clientLogs"] as const,
  lists: () => [...clientLogKeys.all, "list"] as const,
  list: (params?: ClientLogsListParams) => [...clientLogKeys.lists(), params] as const,
};

// ===== Query Hooks =====

/**
 * Get recent client logs
 */
export const useClientLogs = (params?: ClientLogsListParams) => {
  return useQuery({
    queryKey: clientLogKeys.list(params),
    queryFn: () => getClientLogs(params),
    staleTime: 1000 * 60, // 1 minute
  });
};
