import type { OrderLineRow } from "@/features/orders/hooks/useOrderLines";
import { formatOrderCode } from "@/shared/utils/order";

export interface GroupedOrderLine {
  deliveryPlaceCode?: string;
  deliveryPlaceName?: string;
  orderNumber?: string;
  customerName?: string;
  orderDate?: string;
  status?: string;
  lines: OrderLineRow[];
}

/**
 * 納入先単位でグループ化
 */
export function groupByDelivery(lines: OrderLineRow[]): GroupedOrderLine[] {
  const grouped = lines.reduce<Record<string, GroupedOrderLine>>((acc, line) => {
    const key = line.delivery_place_code || "unknown";
    if (!acc[key]) {
      acc[key] = {
        deliveryPlaceCode: line.delivery_place_code || undefined,
        deliveryPlaceName: line.delivery_place_name || undefined,
        lines: [],
      };
    }
    acc[key].lines.push(line);
    return acc;
  }, {});

  return Object.values(grouped);
}

/**
 * 受注単位でグループ化
 */
export function groupByOrder(lines: OrderLineRow[]): GroupedOrderLine[] {
  const grouped = lines.reduce<Record<string, GroupedOrderLine>>((acc, line) => {
    const code = formatOrderCode(line);
    const key = code || "unknown";
    if (!acc[key]) {
      acc[key] = {
        orderNumber: code || undefined,
        customerName: line.customer_name || undefined,
        orderDate: line.order_date || undefined,
        status: line.order_status || undefined,
        lines: [],
      };
    }
    acc[key].lines.push(line);
    return acc;
  }, {});

  return Object.values(grouped);
}
