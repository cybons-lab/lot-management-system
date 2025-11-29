// src/hooks/useOrders.ts
import { useQuery } from "@tanstack/react-query";

import { http as fetchApi } from "@/shared/api/http-client";
import type { paths } from "@/types/api";

type OrdersList = paths["/api/orders"]["get"]["responses"]["200"]["content"]["application/json"];
type OrdersQuery = paths["/api/orders"]["get"]["parameters"]["query"];
type OrderDetail =
  paths["/api/orders/{order_id}"]["get"]["responses"]["200"]["content"]["application/json"];

export function useOrders(params?: OrdersQuery) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => fetchApi.get<OrdersList>("/orders", { searchParams: params as any }),
  });
}
export function useOrder(orderId: number | string) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchApi.get<OrderDetail>(`/orders/${orderId}`),
    enabled: !!orderId,
  });
}
export function useOrderDetail(_orderId?: number) {
  return { data: undefined, isLoading: false } as const;
}
export function useDragAssign() {
  return { assign: () => { }, isPending: false } as const;
}
