// frontend/src/features/orders/hooks/useOrderLineComputed.ts
import React from "react";

import { formatCodeAndName } from "@/lib/utils";
import { diffDays, isValidDate } from "@/lib/utils/date";
import type {
  AllocatedLot,
  OrderLine,
  OrderLineComputed,
  OrderResponse,
} from "@/types/aliases";

export type OrderLineSource = Partial<OrderLine> & {
  order_id?: number;
  product_name?: string | null;
  customer_code?: string | null;
  customer_name?: string | null;
  order_date?: string | null;
  ship_date?: string | null;
  planned_ship_date?: string | null;
  warehouses?: string[];
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

    const productCode = line?.product_code ?? "";
    const productName = line?.product_name ?? "";
    const status = line?.status ?? order?.status ?? "open";
    const orderDate = line?.order_date ?? order?.order_date ?? null;
    const dueDate = line?.due_date ?? order?.due_date ?? null;
    const shipDate = line?.ship_date ?? null;
    const plannedShipDate = line?.planned_ship_date ?? null;
    const customerCode = line?.customer_code ?? order?.customer_code ?? "";
    const customerName = line?.customer_name ?? order?.customer_name ?? "";

    const totalQty = Number(line?.quantity ?? 0);
    const unit = line?.unit ?? "EA";
    const allocatedLots: AllocatedLot[] = Array.isArray(line?.allocated_lots)
      ? line.allocated_lots
      : [];
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

    const warehousesFromLine = Array.isArray(line?.warehouses)
      ? (line?.warehouses ?? []).filter((warehouse): warehouse is string => Boolean(warehouse))
      : [];
    const warehousesFromAllocations = allocatedLots
      .map((allocation) =>
        formatCodeAndName(allocation.warehouse_code ?? "", allocation.warehouse_name ?? ""),
      )
      .filter((warehouse): warehouse is string => Boolean(warehouse));
    const warehouses = Array.from(new Set([...warehousesFromLine, ...warehousesFromAllocations]));

    return {
      ids: { lineId, orderId },
      lineId,
      orderId,
      id: lineId,
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
      customerCode,
      customerName,
      warehouses,
      shippingLeadTime,
    } satisfies OrderLineComputed;
  }, [line, order]);
}
