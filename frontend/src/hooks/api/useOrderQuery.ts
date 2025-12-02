/**
 * 受注取得用のカスタムフック
 */

import { useQuery } from "@tanstack/react-query";

import { http } from "@/shared/api/http-client";

// 受注明細の型定義
export interface OrderLine {
  id: number;
  line_no: number;
  product_code: string;
  quantity: number;
  unit: string;
  allocated_qty?: number;
  allocations?: Array<{
    id: number;
    lot_id: number;
    allocated_qty: number;
  }>;
}

// 受注詳細の型定義
export interface OrderDetail {
  id: number;
  order_no: string;
  customer_code: string;
  customer_name?: string | null;
  order_date: string;
  status?: string;
  lines: OrderLine[];
}

/**
 * 受注詳細を取得
 * @param orderId 受注ID
 */
export const useOrderQuery = (orderId?: number) => {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (!orderId) throw new Error("Order ID is required");
      return http.get<OrderDetail>(`orders/${orderId}`);
    },
    enabled: !!orderId, // 受注IDがある場合のみクエリを実行
  });
};
