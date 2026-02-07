import { useQuery } from "@tanstack/react-query";

import { getOrderLines } from "../api";

import type { OrderLine } from "@/shared/types/aliases";

export type OrderLineRow = OrderLine;

export function useOrderLines(params?: {
  customer_code?: string;
  status?: string;
  product_code?: string;
  order_type?: string;
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
        ...(params?.customer_code && { customer_code: params.customer_code! }),
        ...(params?.status && { status: params.status! }),
        ...(params?.product_code && { product_code: params.product_code! }),
        ...(params?.order_type && { order_type: params.order_type! }),
      }),
  });

  return {
    data: orderLines,
    isLoading,
    error,
    refetch,
  };
}
