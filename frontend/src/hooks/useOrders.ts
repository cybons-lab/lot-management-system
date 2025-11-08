// src/hooks/useOrders.ts
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/apiClient";
import type { paths } from "@/types/api";

type OrdersList = paths["/api/orders"]["get"]["responses"]["200"]["content"]["application/json"];
type OrdersQuery = paths["/api/orders"]["get"]["parameters"]["query"];
type OrderDetail =
  paths["/api/orders/{order_id}"]["get"]["responses"]["200"]["content"]["application/json"];

export function useOrders(params?: OrdersQuery) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => get<OrdersList>("/orders", params),
  });
}
export function useOrder(orderId: number | string) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => get<OrderDetail>(`/orders/${orderId}`),
    enabled: !!orderId,
  });
}
