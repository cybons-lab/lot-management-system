import type { UseQueryOptions } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/AuthContext";
import { httpAuth } from "@/shared/api/http-client";
import { useAuthenticatedQuery } from "@/shared/hooks/useAuthenticatedQuery";
import { authAwareRefetchInterval } from "@/shared/libs/query-utils";
import { formatOrderCode } from "@/shared/utils/order";

export interface ConfirmedOrderLine {
  line_id: number;
  order_id: number;
  customer_order_no?: string | null;
  order_code: string;
  customer_id: number;
  customer_name: string;
  supplier_item_id: number;
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
    const data = await httpAuth.get<ConfirmedOrderLine[]>("orders/confirmed-order-lines");
    return data.map((line) => ({ ...line, order_code: formatOrderCode(line) }));
  },
} satisfies UseQueryOptions<
  ConfirmedOrderLine[],
  Error,
  ConfirmedOrderLine[],
  typeof confirmedOrderLinesQueryKey
>;

export function useConfirmedOrderLines() {
  const { isLoading: isAuthLoading } = useAuth();

  return useAuthenticatedQuery<ConfirmedOrderLine[]>({
    ...confirmedOrderLinesQueryOptions,
    // 認証状態読み込み完了後にポーリングを開始
    refetchInterval: isAuthLoading
      ? false
      : authAwareRefetchInterval<ConfirmedOrderLine[], Error, ConfirmedOrderLine[]>(30000),
  });
}
