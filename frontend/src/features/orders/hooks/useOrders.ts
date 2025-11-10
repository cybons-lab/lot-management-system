// src/features/orders/hooks/useOrders.ts
import { useQuery } from "@tanstack/react-query";

import * as ordersApi from "@/features/orders/api";
import type { OrderResponse, OrdersListParams } from "@/shared/types/aliases";

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

export const useOrders = () =>
  useQuery<OrderResponse[]>({
    queryKey: ["orders"],
    queryFn: () => ordersApi.getOrders(), // 無引数クロージャに
  });
/** 受注明細（行）の配列を返す */
export function useOrdersWithAllocations() {
  useQuery<OrderResponse[]>({
    queryKey: ["orders"],
    queryFn: () => ordersApi.getOrders(),

    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    // ここで常に「配列」に正規化して返す
    select: (raw: OrderResponse[] | { items?: OrderResponse[] }) =>
      Array.isArray(raw) ? raw : (raw?.items ?? []),
  });
}
export function useOrderDetail(orderId?: number) {
  return useQuery<ordersApi.OrderResponse>({
    queryKey: ["orders", "detail", orderId ?? "none"],
    queryFn: () => ordersApi.getOrder(Number(orderId)),
    enabled: !!orderId,
  });
}
