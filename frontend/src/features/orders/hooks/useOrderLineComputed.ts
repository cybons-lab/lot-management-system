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
  delivery_places?: string[]; // warehouses → delivery_places に変更
};

export type OrderSource = Partial<OrderResponse>;

/**
 * 受注明細の計算済み情報を取得
 */
export function useOrderLineComputed(
  line: OrderLineSource | null | undefined,
  order?: OrderSource,
): OrderLineComputed {
  return React.useMemo(() => {
    const lineId = typeof line?.id === "number" ? line.id : undefined;
    const orderId = typeof order?.id === "number" ? order.id : line?.order_id;

    const productId = typeof line?.product_id === "number" ? line.product_id : null;
    const productCode = line?.product_code ?? null;
    const productName = line?.product_name ?? "";
    const status = line?.status ?? order?.status ?? "draft";
    const orderDate = line?.order_date ?? order?.order_date ?? null;
    const dueDate = line?.due_date ?? order?.due_date ?? null;
    const shipDate = line?.ship_date ?? null;
    const plannedShipDate = line?.planned_ship_date ?? null;
    const customerCode = line?.customer_code ?? order?.customer_code ?? "";
    const customerName = line?.customer_name ?? order?.customer_name ?? "";
    const customerId = typeof order?.customer_id === "number" ? order.customer_id : null;

    const totalQty = Number(line?.quantity ?? 0);
    const unit = line?.unit ?? "EA";
    const allocatedLots = coerceAllocatedLots(line?.allocated_lots);
    const allocatedTotal = allocatedLots.reduce(
      (sum, allocated) => sum + Number(allocated.allocated_qty ?? 0),
      0,
    );
    const remainingQty = Math.max(0, totalQty - allocatedTotal);
    const progressPct = totalQty > 0 ? Math.round((allocatedTotal / totalQty) * 100) : 0;

    let shippingLeadTime: string | undefined;
    const shipBase = shipDate ?? plannedShipDate;
    if (dueDate && shipBase && isValidDate(dueDate) && isValidDate(shipBase)) {
      const days = diffDays(dueDate, shipBase);
      shippingLeadTime = days >= 0 ? `${days}日` : `遅延${Math.abs(days)}日`;
    }

    // 納品先の集計（delivery_place_code/name）
    const deliveryPlacesFromLine = Array.isArray(line?.delivery_places)
      ? (line?.delivery_places ?? []).filter((deliveryPlace): deliveryPlace is string =>
          Boolean(deliveryPlace),
        )
      : [];
    const deliveryPlacesFromAllocations = allocatedLots
      .map((allocation) =>
        formatCodeAndName(
          allocation.delivery_place_code ?? "",
          allocation.delivery_place_name ?? "",
        ),
      )
      .filter((deliveryPlace): deliveryPlace is string => Boolean(deliveryPlace));
    const deliveryPlaces = Array.from(
      new Set([...deliveryPlacesFromLine, ...deliveryPlacesFromAllocations]),
    );

    return {
      ids: { lineId, orderId },
      lineId,
      orderId,
      id: lineId,
      productId,
      productCode,
      productName,
      status,
      orderDate,
      dueDate,
      shipDate,
      plannedShipDate,
      totalQty,
      unit,
      allocatedTotal,
      remainingQty,
      progressPct,
      customerId,
      customerCode,
      customerName,
      deliveryPlaces, // warehouses → deliveryPlaces に変更
      shippingLeadTime,
    } satisfies OrderLineComputed;
  }, [line, order]);
}
