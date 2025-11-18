/**
 * Hook for fetching orders list for allocation
 */

import { useQuery } from "@tanstack/react-query";
import { getOrders } from "@/features/orders/api";
import type { components } from "@/types/api";

type OrderWithLinesResponse = components["schemas"]["OrderWithLinesResponse"];

export const useOrdersForAllocation = () => {
  return useQuery<OrderWithLinesResponse[]>({
    queryKey: ["orders", "for-allocation"],
    queryFn: () => getOrders(),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 30_000, // 30秒
  });
};
