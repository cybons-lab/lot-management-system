import { useMemo } from "react";

import type { OrderUI } from "@/shared/libs/normalize";

export function useOrderStats(orders: OrderUI[]) {
  return useMemo(
    () => ({
      totalOrders: orders.length,
      openOrders: orders.filter((o) => o.status === "open" || o.status === "pending" || o.status === "draft").length,
      allocatedOrders: orders.filter((o) => o.status === "allocated").length,
      allocationRate:
        orders.length > 0
          ? (orders.filter((o) => o.status === "allocated").length / orders.length) * 100
          : 0,
    }),
    [orders],
  );
}
