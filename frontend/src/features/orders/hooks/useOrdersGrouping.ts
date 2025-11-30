import { useMemo } from "react";

import type { OrderLineRow } from "@/features/orders/hooks/useOrderLines";
import {
  groupByDelivery,
  groupByOrder,
  type GroupedOrderLine,
} from "@/features/orders/utils/groupOrders";

type GroupMode = "delivery" | "order";

/**
 * 受注明細のグループ化を管理するカスタムフック
 */
export function useOrdersGrouping(lines: OrderLineRow[], mode: GroupMode): GroupedOrderLine[] {
  return useMemo(() => {
    if (mode === "delivery") {
      return groupByDelivery(lines);
    } else {
      return groupByOrder(lines);
    }
  }, [lines, mode]);
}
