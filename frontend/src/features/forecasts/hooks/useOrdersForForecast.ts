/**
 * useOrdersForForecast Hook
 * フォーキャストグループに関連する受注を取得するhook
 */

import { useQuery } from "@tanstack/react-query";

import { getOrders } from "@/features/orders/api";
import type { OrderWithLinesResponse } from "@/shared/types/aliases";

export const ordersForForecastKeys = {
  all: ["orders", "for-forecast"] as const,
  byGroup: (params: { customer_id: number; delivery_place_id: number; product_group_id: number }) =>
    [...ordersForForecastKeys.all, params] as const,
};

/**
 * フォーキャストグループに関連する受注を取得
 * customer_id、delivery_place_id、product_group_id で受注をフィルタリング
 */
export const useOrdersForForecast = (params: {
  customer_id: number;
  delivery_place_id: number;
  product_group_id: number;
  enabled?: boolean;
}) => {
  const { customer_id, delivery_place_id, product_group_id, enabled = true } = params;

  return useQuery<OrderWithLinesResponse[]>({
    queryKey: ordersForForecastKeys.byGroup({ customer_id, delivery_place_id, product_group_id }),
    queryFn: async () => {
      const orders = await getOrders();

      // フィルタリング: 受注明細の中に該当する製品と納入先を持つ受注を抽出
      return orders.filter((order) => {
        // 得意先が一致
        if (order.customer_id !== customer_id) return false;

        // 受注明細の中に該当する製品と納入先を持つ行があるか確認
        return (
          order.lines?.some(
            (line) =>
              line.product_group_id === product_group_id &&
              line.delivery_place_id === delivery_place_id,
          ) ?? false
        );
      });
    },
    enabled: enabled && customer_id > 0 && delivery_place_id > 0 && product_group_id > 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 30_000, // 30秒
  });
};
