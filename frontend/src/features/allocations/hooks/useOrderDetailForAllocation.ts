/**
 * Hook for fetching order detail for allocation
 */

import { useQuery } from "@tanstack/react-query";
import { getOrder } from "@/features/orders/api";
import type { OrderWithLinesResponse } from "@/shared/types/aliases";

export const useOrderDetailForAllocation = (orderId: number | null) => {
  return useQuery<OrderWithLinesResponse>({
    queryKey: ["order-detail", orderId],
    queryFn: () => getOrder(orderId!),
    enabled: orderId !== null && orderId > 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000, // 30秒
  });
};
