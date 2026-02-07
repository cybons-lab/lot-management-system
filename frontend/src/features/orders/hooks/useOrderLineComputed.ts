// frontend/src/features/orders/hooks/useOrderLineComputed.ts
import React from "react";

import { coerceAllocatedLots } from "@/shared/libs/allocations";
import { formatCodeAndName } from "@/shared/libs/utils";
import type { OrderLine, OrderLineComputed, OrderResponse } from "@/shared/types/aliases";
import { diffDays, isValidDate } from "@/shared/utils/date";

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

const resolveIdInfo = (line: OrderLineSource | null | undefined, order?: OrderSource) => ({
  lineId: typeof line?.id === "number" ? line.id : undefined,
  orderId: typeof order?.id === "number" ? order.id : line?.order_id,
  productId: typeof line?.supplier_item_id === "number" ? line.supplier_item_id : null,
});

const resolveProductStatus = (line: OrderLineSource | null | undefined, order?: OrderSource) => ({
  productCode: line?.product_code ?? null,
  productName: line?.product_name ?? "",
  status: line?.status ?? order?.status ?? "draft",
});

const resolveOrderDates = (line: OrderLineSource | null | undefined, order?: OrderSource) => ({
  orderDate: line?.order_date ?? order?.order_date ?? null,
  dueDate: line?.due_date ?? order?.due_date ?? null,
});

const resolveShipDates = (line: OrderLineSource | null | undefined) => ({
  shipDate: line?.ship_date ?? null,
  plannedShipDate: line?.planned_ship_date ?? null,
});

const resolveCustomerInfo = (line: OrderLineSource | null | undefined, order?: OrderSource) => ({
  customerCode: line?.customer_code ?? order?.customer_code ?? "",
  customerName: line?.customer_name ?? order?.customer_name ?? "",
  customerId: typeof order?.customer_id === "number" ? order.customer_id : null,
});

const calculateAllocationStats = (line: OrderLineSource | null | undefined) => {
  const totalQty = Number(line?.quantity ?? 0);
  const allocatedLots = coerceAllocatedLots(line?.allocated_lots);
  const allocatedTotal = allocatedLots.reduce(
    (sum, allocated) => sum + Number(allocated.allocated_qty ?? 0),
    0,
  );
  return {
    totalQty,
    allocatedLots,
    allocatedTotal,
    remainingQty: Math.max(0, totalQty - allocatedTotal),
    progressPct: totalQty > 0 ? Math.round((allocatedTotal / totalQty) * 100) : 0,
  };
};

function calculateShippingLeadTime(
  dueDate: string | null,
  shipBase: string | null,
): string | undefined {
  if (dueDate && shipBase && isValidDate(dueDate) && isValidDate(shipBase)) {
    const days = diffDays(dueDate, shipBase);
    return days >= 0 ? `${days}日` : `遅延${Math.abs(days)}日`;
  }
  return undefined;
}

function aggregateDeliveryPlaces(
  line: OrderLineSource | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- allocatedLotsの型がOpenAPI生成型と不一致のため暫定
  allocatedLots: any[],
): string[] {
  const linePlaces = Array.isArray(line?.delivery_places)
    ? (line?.delivery_places ?? []).filter(Boolean)
    : [];
  const allocationPlaces = allocatedLots
    .map((a) => formatCodeAndName(a.delivery_place_code ?? "", a.delivery_place_name ?? ""))
    .filter(Boolean);
  return Array.from(new Set([...linePlaces, ...allocationPlaces]));
}

export function useOrderLineComputed(
  line: OrderLineSource | null | undefined,
  order?: OrderSource,
): OrderLineComputed {
  return React.useMemo(() => {
    const ids = resolveIdInfo(line, order);
    const prod = resolveProductStatus(line, order);
    const oDates = resolveOrderDates(line, order);
    const sDates = resolveShipDates(line);
    const customer = resolveCustomerInfo(line, order);
    const stats = calculateAllocationStats(line);
    const shipBase = sDates.shipDate ?? sDates.plannedShipDate;

    const result: OrderLineComputed = {
      ...ids,
      ...prod,
      ...oDates,
      ...sDates,
      ...customer,
      ...stats,
      ids: { lineId: ids.lineId, orderId: ids.orderId },
      id: ids.lineId,
      unit: line?.unit ?? "EA",
      shippingLeadTime: calculateShippingLeadTime(oDates.dueDate, shipBase),

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deliveryPlaces: aggregateDeliveryPlaces(line, stats.allocatedLots as any),
      productId: ids.productId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 複雑なインターフェース合成のため暫定キャスト
    } as any;

    if (ids.lineId === undefined) delete result.id;
    if (ids.lineId === undefined) delete result.ids.lineId;
    if (ids.orderId === undefined) delete result.ids.orderId;

    return result;
  }, [line, order]);
}
