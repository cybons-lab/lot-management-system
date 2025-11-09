// src/hooks/api/useOrdersQuery.ts
import { useQuery } from "@tanstack/react-query";

import { getOrders } from "@/features/orders/api";
import type { paths } from "@/types/api";

type OrdersQuery = paths["/api/orders"]["get"]["parameters"]["query"];
export const useOrdersQuery = (params?: OrdersQuery) =>
  useQuery({
    queryKey: ["orders", params],
    queryFn: () => getOrders(params),
    staleTime: 30_000,
  });
