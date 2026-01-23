import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { authAwareRefetchInterval } from "@/shared/libs/query-utils";
import { formatOrderCode } from "@/shared/utils/order";

export interface ConfirmedOrderLine {
  line_id: number;
  order_id: number;
  customer_order_no?: string | null;
  order_code: string;
  customer_id: number;
  customer_name: string;
  product_id: number;
  product_code: string;
  product_name: string;
  order_quantity: number;
  allocated_quantity: number;
  unit: string;
  delivery_date: string;
  sap_order_no?: string | null;
}

const confirmedOrderLinesQueryKey = ["confirmed-order-lines"] as const;

const confirmedOrderLinesQueryOptions = {
  queryKey: confirmedOrderLinesQueryKey,
  queryFn: async (): Promise<ConfirmedOrderLine[]> => {
    const response = await fetch("/api/orders/confirmed-order-lines");
    if (!response.ok) throw new Error("Failed to fetch confirmed lines");
    const data = (await response.json()) as ConfirmedOrderLine[];
    return data.map((line) => ({ ...line, order_code: formatOrderCode(line) }));
  },
} satisfies UseQueryOptions<
  ConfirmedOrderLine[],
  Error,
  ConfirmedOrderLine[],
  typeof confirmedOrderLinesQueryKey
>;

export function useConfirmedOrderLines() {
  return useQuery<ConfirmedOrderLine[]>({
    ...confirmedOrderLinesQueryOptions,
    refetchInterval: authAwareRefetchInterval<ConfirmedOrderLine[], Error, ConfirmedOrderLine[]>(
      30000,
    ),
  });
}
