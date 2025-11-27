import { useMemo } from "react";

import { useOrdersQuery } from "@/hooks/api";
import { normalizeOrder } from "@/shared/libs/normalize";
import type { OrderLine, OrderResponse } from "@/shared/types/aliases";

export interface OrderLineRow extends OrderLine {
  // Order Header Info
  order_id: number;
  order_number: string;
  customer_id: number;
  customer_name: string;
  customer_code: string;
  order_date: string;
  due_date: string;
  delivery_place_id: number;
  delivery_place_name: string;
  order_status: string;
  [key: string]: unknown;
}

export function useOrderLines(params?: { customer_code?: string; status?: string }) {
  const {
    data: orders = [],
    isLoading,
    error,
    refetch,
  } = useOrdersQuery({
    customer_code: params?.customer_code,
    status: params?.status,
  });

  const orderLines = useMemo(() => {
    if (!orders) return [];

    const lines: OrderLineRow[] = [];

    orders.forEach((order: OrderResponse) => {
      const normalizedOrder = normalizeOrder(order);

      if (normalizedOrder.lines) {
        normalizedOrder.lines.forEach((line) => {
          lines.push({
            ...line,
            // Header Info
            order_id: normalizedOrder.id,
            order_number: normalizedOrder.order_number,
            customer_id: normalizedOrder.customer_id,
            customer_name: normalizedOrder.customer_name,
            customer_code: normalizedOrder.customer_code ?? "",
            order_date: normalizedOrder.order_date,
            due_date: normalizedOrder.due_date ?? "",
            delivery_place_id: Number(normalizedOrder.delivery_place_id ?? 0),
            delivery_place_name: String(normalizedOrder.delivery_place_name ?? ""),
            order_status: normalizedOrder.status,
          });
        });
      }
    });

    return lines;
  }, [orders]);

  return {
    data: orderLines,
    isLoading,
    error,
    refetch,
  };
}
