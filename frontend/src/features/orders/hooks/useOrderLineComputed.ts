// frontend/src/features/orders/hooks/useOrderLineComputed.ts
import { useMemo } from "react";

export type AllocationStatus = {
  key: "none" | "partial" | "done";
  label: string;
  color: string;
};

export function useOrderLineComputed(line?: any, order?: any) {
  const unit = line?.unit ?? order?.unit ?? "";
  const totalQty = line?.qty ?? line?.quantity ?? 0;

  const allocatedLots: any[] = line?.allocated_lots ?? [];
  const allocatedTotal = useMemo(
    () =>
      allocatedLots.reduce(
        (s: number, a: any) => s + (a?.allocated_qty ?? 0),
        0
      ),
    [allocatedLots]
  );

  const remainingQty = Math.max(0, totalQty - allocatedTotal);
  const progressPct = Math.min(
    100,
    totalQty > 0 ? Math.round((allocatedTotal / totalQty) * 100) : 0
  );

  const status: AllocationStatus = (() => {
    if (allocatedTotal <= 0)
      return { key: "none", label: "未処理", color: "bg-amber-500" };
    if (allocatedTotal < totalQty)
      return { key: "partial", label: "一部引当", color: "bg-violet-500" };
    return { key: "done", label: "引当済", color: "bg-emerald-500" };
  })();

  const warehouseList =
    Array.isArray(line?.warehouse_allocations) &&
    line.warehouse_allocations.length > 0
      ? line.warehouse_allocations
      : order?.default_warehouses ?? [];

  const ids = {
    orderId: order?.id ?? line?.order_id,
    lineId: line?.id ?? line?.order_line_id ?? line?.line_id,
  };

  return {
    unit,
    totalQty,
    allocatedTotal,
    remainingQty,
    progressPct,
    status,
    productCode: line?.product_code,
    productName: line?.product_name,
    orderDate: line?.order_date ?? order?.order_date,
    dueDate: line?.due_date,
    plannedShipDate: line?.planned_ship_date,
    customerCode: line?.customer_code ?? order?.customer_code,
    supplierCode: line?.supplier_code ?? order?.supplier_code,
    warehouseList,
    ids,
  };
}
