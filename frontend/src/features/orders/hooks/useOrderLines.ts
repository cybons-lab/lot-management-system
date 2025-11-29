import { useQuery } from "@tanstack/react-query";

import { getOrderLines } from "../api";

import type { OrderLine } from "@/shared/types/aliases";

export type OrderLineRow = OrderLine;

export function useOrderLines(params?: {
  customer_code?: string;
  status?: string;
  product_code?: string;
}) {
  const {
    data: orderLines = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["orderLines", params],
    queryFn: () =>
      getOrderLines({
        customer_code: params?.customer_code,
        status: params?.status,
        product_code: params?.product_code,
      }),
  });

  return {
    data: orderLines,
    isLoading,
    error,
    refetch,
  };
}
