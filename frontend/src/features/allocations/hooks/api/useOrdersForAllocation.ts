/**
 * Hook for fetching orders list for allocation
 */

import { useQuery } from "@tanstack/react-query";

import { getOrders } from "@/features/orders/api";
import type { OrderWithLinesResponse } from "@/shared/types/aliases";

export const useOrdersForAllocation = () => {
  return useQuery<OrderWithLinesResponse[]>({
    queryKey: ["orders", "for-allocation"],
    queryFn: () => getOrders(),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 30_000, // 30秒
  });
};
