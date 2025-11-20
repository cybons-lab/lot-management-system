/**
 * useAllocationCandidates Hook (v2.2 - Phase E-4)
 * Hook for getting allocation candidates
 */

import { useQuery } from "@tanstack/react-query";
import { getAllocationCandidates } from "../api";

export const allocationCandidatesKeys = {
  all: ["allocationCandidates"] as const,
  list: (params: { order_line_id: number; strategy?: string; limit?: number }) =>
    [...allocationCandidatesKeys.all, params] as const,
};

/**
 * Get allocation candidates for an order line
 */
export const useAllocationCandidates = (params: {
  order_line_id: number;
  strategy?: "fefo" | "fifo" | "custom";
  limit?: number;
}) => {
  return useQuery({
    queryKey: allocationCandidatesKeys.list(params),
    queryFn: () => getAllocationCandidates(params),
    enabled: params.order_line_id > 0,
    staleTime: 1000 * 60, // 1 minute (candidates change frequently)
  });
};
