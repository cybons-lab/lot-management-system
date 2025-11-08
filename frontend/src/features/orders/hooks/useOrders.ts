// src/features/orders/hooks/useOrders.ts
import { useQuery } from "@tanstack/react-query";
import * as ordersApi from "@/features/orders/api";
import { api } from "@/lib/api-client";

import type { OrdersListParams, OrderWithLinesResponse } from "@/types/legacy";

export const queryKeys = {
  orders: (params: OrdersListParams) => ["orders", params] as const,
  order: (id: number) => ["orders", "detail", id] as const,
  withAlloc: () => ["orders", "with-alloc"] as const,
};

export function useOrdersList(params: OrdersListParams) {
  return useQuery({
    queryKey: queryKeys.orders(params),
    queryFn: () => ordersApi.getOrders(params),
  });
}

export function useOrder(orderId: number | undefined) {
  return useQuery<OrderWithLinesResponse>({
    queryKey: queryKeys.order(orderId ?? 0),
    queryFn: () => ordersApi.getOrder(orderId as number),
    enabled: !!orderId,
  });
}

/** 受注明細（行）の配列を返す */
export function useOrdersWithAllocations() {
  return useQuery({
    queryKey: queryKeys.withAlloc(),
    queryFn: () => api.getOrdersWithAllocations(), // { items:[...] } or [...]
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    // ここで常に「配列」に正規化して返す
    select: (raw: any) => (Array.isArray(raw) ? raw : (raw?.items ?? [])),
  });
}
