import React from "react";

import type { OrderLineSource, OrderSource } from "./orderLineUtils";
import { buildOrderLineComputed } from "./orderLineUtils";

import type { OrderLineComputed } from "@/shared/types/aliases";

export type { OrderLineSource, OrderSource } from "./orderLineUtils";

export function useOrderLineComputed(
  line: OrderLineSource | null | undefined,
  order?: OrderSource,
): OrderLineComputed {
  return React.useMemo(() => buildOrderLineComputed(line, order), [line, order]);
}
