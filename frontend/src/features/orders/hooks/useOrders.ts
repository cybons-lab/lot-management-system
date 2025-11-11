// src/features/orders/hooks/useOrders.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import * as ordersApi from "@/features/orders/api";
import { normalizeOrder, type OrderUI } from "@/shared/libs/normalize";
import type { OrderResponse, OrdersListParams } from "@/shared/types/aliases";

export const queryKeys = {
  orders: (params: OrdersListParams) => ["orders", params] as const,
  order: (id: number) => ["orders", "detail", id] as const,
  withAlloc: () => ["orders", "with-alloc"] as const,
};

export function useOrdersList(params: OrdersListParams) {
  return useQuery<OrderResponse[], Error, OrderUI[]>({
    queryKey: queryKeys.orders(params),
    queryFn: () => ordersApi.getOrders(params),
    initialData: [],
    select: (data) => (data ?? []).map(normalizeOrder),
  });
}

export const useOrders = () =>
  useQuery<OrderResponse[], Error, OrderUI[]>({
    queryKey: ["orders"],
    queryFn: () => ordersApi.getOrders(),
    initialData: [],
    select: (data) => (data ?? []).map(normalizeOrder),
  });
/** 受注明細（行）の配列を返す */
export function useOrdersWithAllocations() {
  return useQuery<OrderResponse[], Error, OrderUI[]>({
    queryKey: ["orders"],
    queryFn: () => ordersApi.getOrders(),
    initialData: [],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    // ここで常に「配列」に正規化して返し、normalize も適用
    select: (raw: OrderResponse[] | { items?: OrderResponse[] }) => {
      const rawArray = Array.isArray(raw) ? raw : (raw?.items ?? []);
      return (rawArray ?? []).map(normalizeOrder);
    },
  });
}
export function useOrderDetail(orderId?: number) {
  return useQuery({
    queryKey: ["orders", "detail", orderId ?? "none"],
    queryFn: async () => {
      const data = await ordersApi.getOrder(Number(orderId));
      return data as OrderResponse;
    },
    enabled: !!orderId,
    select: (data: OrderResponse) => normalizeOrder(data),
  });
}

/**
 * 注文ステータス更新のmutation hook
 */
export function useUpdateOrderStatus(orderId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newStatus: string) => ordersApi.updateOrderStatus(orderId, newStatus),
    onSuccess: () => {
      // 注文詳細とリストのキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ["orders", "detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", String(orderId)] });
    },
  });
}
