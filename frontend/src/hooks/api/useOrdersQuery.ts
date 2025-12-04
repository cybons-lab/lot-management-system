// src/hooks/api/useOrdersQuery.ts
import { useQuery } from "@tanstack/react-query";

import { getOrders } from "@/features/orders/api";
import { normalizeOrder, type OrderUI } from "@/shared/libs/normalize";
import type { OrderResponse } from "@/shared/types/schema";
import type { operations } from "@/types/api";

type OrdersQuery = operations["list_orders_api_orders_get"]["parameters"]["query"];
export const useOrdersQuery = (params?: OrdersQuery) =>
  useQuery<OrderResponse[], Error, OrderUI[]>({
    queryKey: ["orders", params],
    queryFn: () => getOrders(params),
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    select: (data) => (data ?? []).map(normalizeOrder),
  });
