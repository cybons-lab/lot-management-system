/* eslint-disable complexity */
import type { OrderLineSource, OrderSource } from "./useOrderLineComputed";

import { coerceAllocatedLots } from "@/shared/libs/allocations";
import { formatCodeAndName } from "@/shared/libs/utils";
import type { AllocatedLot, OrderLineComputed } from "@/shared/types/aliases";
import { diffDays, isValidDate } from "@/shared/utils/date";

export const resolveIdInfo = (line: OrderLineSource | null | undefined, order?: OrderSource) => {
  const lineId = typeof line?.id === "number" ? line.id : undefined;
  const orderId = typeof order?.id === "number" ? order.id : line?.order_id;
  const productId = typeof line?.supplier_item_id === "number" ? line.supplier_item_id : null;

  return {
    ids: {
      ...(lineId !== undefined ? { lineId } : {}),
      ...(orderId !== undefined ? { orderId } : {}),
    },
    ...(lineId !== undefined ? { lineId, id: lineId } : {}),
    ...(orderId !== undefined ? { orderId } : {}),
    ...(productId !== undefined ? { productId } : {}),
  };
};

export const resolveProductStatus = (
  line: OrderLineSource | null | undefined,
  order?: OrderSource,
) => {
  const productCode = line?.product_code ?? null;
  const productName = line?.product_name ?? "";
  const status = line?.status ?? order?.status ?? "draft";

  return {
    ...(productCode !== undefined ? { productCode } : {}),
    productName,
    ...(status !== undefined ? { status } : {}),
  };
};

export const resolveOrderDates = (
  line: OrderLineSource | null | undefined,
  order?: OrderSource,
) => {
  const orderDate = line?.order_date ?? order?.order_date ?? null;
  const dueDate = line?.due_date ?? order?.due_date ?? null;

  return {
    ...(orderDate !== undefined ? { orderDate } : {}),
    ...(dueDate !== undefined ? { dueDate } : {}),
  };
};

export const resolveShipDates = (line: OrderLineSource | null | undefined) => {
  const shipDate = line?.ship_date ?? null;
  const plannedShipDate = line?.planned_ship_date ?? null;
  const shipBase = shipDate ?? plannedShipDate;

  return {
    ...(shipDate !== undefined ? { shipDate } : {}),
    ...(plannedShipDate !== undefined ? { plannedShipDate } : {}),
    _shipBase: shipBase,
  };
};

export const resolveCustomerInfo = (
  line: OrderLineSource | null | undefined,
  order?: OrderSource,
) => {
  const customerCode = line?.customer_code ?? order?.customer_code ?? "";
  const customerName = line?.customer_name ?? order?.customer_name ?? "";
  const customerId = typeof order?.customer_id === "number" ? order.customer_id : null;

  return {
    ...(customerCode !== undefined ? { customerCode } : {}),
    ...(customerName !== undefined ? { customerName } : {}),
    ...(customerId !== undefined ? { customerId } : {}),
  };
};

export const calculateAllocationStats = (line: OrderLineSource | null | undefined) => {
  const totalQty = Number(line?.quantity ?? 0);
  const allocatedLots: AllocatedLot[] = coerceAllocatedLots(line?.allocated_lots);
  const allocatedTotal = allocatedLots.reduce(
    (sum, allocated) => sum + Number(allocated.allocated_quantity ?? allocated.allocated_qty ?? 0),
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

export function calculateShippingLeadTime(
  dueDate: string | null, // undefined is not passed here based on usage, but strictly string | null
  shipBase: string | null,
): string | undefined {
  if (dueDate && shipBase && isValidDate(dueDate) && isValidDate(shipBase)) {
    const days = diffDays(dueDate, shipBase);
    return days >= 0 ? `${days}日` : `遅延${Math.abs(days)}日`;
  }
  return undefined;
}

export function aggregateDeliveryPlaces(
  line: OrderLineSource | null | undefined,
  allocatedLots: AllocatedLot[],
): string[] {
  const linePlaces = Array.isArray(line?.delivery_places)
    ? (line?.delivery_places ?? []).filter(Boolean)
    : [];
  const allocationPlaces = allocatedLots
    .map((a) => formatCodeAndName(a.delivery_place_code ?? "", a.delivery_place_name ?? ""))
    .filter(Boolean);
  return Array.from(new Set([...linePlaces, ...allocationPlaces]));
}

export function buildOrderLineComputed(
  line: OrderLineSource | null | undefined,
  order?: OrderSource,
): OrderLineComputed {
  const ids = resolveIdInfo(line, order);
  const prod = resolveProductStatus(line, order);
  const oDates = resolveOrderDates(line, order);
  const sDates = resolveShipDates(line);
  const customer = resolveCustomerInfo(line, order);
  const stats = calculateAllocationStats(line);

  // _shipBase is internal helper prop, assert explicit type to access properties safely
  // or just recalculate/access locally.
  // Actually resolveShipDates returns an object with _shipBase.
  const shipBase = sDates._shipBase;
  const { _shipBase, ...cleanShipDates } = sDates;

  const dueDate = oDates.dueDate ?? null; // dueDate could be missing from object if undefined? No, resolveOrderDates returns object with optional keys.
  // Wait, if resolveOrderDates returns {} when values are undefined, then accessing oDates.dueDate gives undefined.
  // We need to pass string | null to calculateShippingLeadTime.
  // If property is missing, it is undefined.

  const shippingLeadTime = calculateShippingLeadTime(dueDate, shipBase);

  return {
    ...ids,
    ...prod,
    ...oDates,
    ...cleanShipDates,
    ...stats,
    ...customer,
    unit: line?.unit ?? "EA",
    deliveryPlaces: aggregateDeliveryPlaces(line, stats.allocatedLots),
    ...(shippingLeadTime !== undefined ? { shippingLeadTime } : {}),
  };
}
