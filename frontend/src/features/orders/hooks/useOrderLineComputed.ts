import React from "react";

import { buildOrderLineComputed } from "./orderLineUtils";

import type { OrderLine, OrderLineComputed, OrderResponse } from "@/shared/types/aliases";

export type OrderLineSource = Partial<OrderLine> & {
  order_id?: number;
  product_name?: string | null;
  customer_code?: string | null;
  customer_name?: string | null;
  order_date?: string | null;
  ship_date?: string | null;
  planned_ship_date?: string | null;
  delivery_places?: string[];
};

export type OrderSource = Partial<OrderResponse>;

export function useOrderLineComputed(
  line: OrderLineSource | null | undefined,
  order?: OrderSource,
): OrderLineComputed {
  return React.useMemo(() => buildOrderLineComputed(line, order), [line, order]);
}
