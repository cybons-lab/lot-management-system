// frontend/src/features/orders/hooks/useOrderLineComputed.ts
import React from "react";
import { isValidDate, diffDays } from "@/lib/utils/date";
import { formatCodeAndName } from "@/lib/utils";
import type { OrderLineComputed, AllocatedLot } from "@/types/aliases";

/**
 * 受注明細の計算済み情報を取得
 */
export function useOrderLineComputed(
  line: any, // 後でOrderLine型に移行
  order?: any,
): OrderLineComputed {
  return React.useMemo(() => {
    // 基本情報
    const lineId = line?.id;
    const orderId = order?.id ?? line?.order_id;
    const productCode = line?.product_code ?? "";
    const productName = line?.product_name ?? "";
    const totalQty = Number(line?.quantity ?? 0);
    const unit = line?.unit ?? "EA";
    const status = line?.status ?? "open";
    const customerCode = line?.customer_code ?? order?.customer_code ?? "";
    const orderDate = line?.order_date ?? order?.order_date ?? "";
    const customerName = line?.customer_name ?? order?.customer_name ?? "";

    // 引当済み数量
    const allocatedLots: AllocatedLot[] = line?.allocated_lots ?? [];
    const allocatedTotal = allocatedLots.reduce((sum, a) => sum + Number(a.allocate_qty ?? 0), 0);

    // 残数量と進捗率
    const remainingQty = Math.max(0, totalQty - allocatedTotal);
    const progressPct = totalQty > 0 ? Math.round((allocatedTotal / totalQty) * 100) : 0;

    // 日付情報
    const dueDate = line?.due_date ?? null;
    const shipDate = line?.ship_date ?? null;
    const plannedShipDate = line?.planned_ship_date ?? null;

    // 配送リードタイムの計算
    let shippingLeadTime: string | null = null;
    const due = dueDate;
    const ship = shipDate ?? plannedShipDate;

    if (isValidDate(due) && isValidDate(ship)) {
      const days = diffDays(due!, ship!);
      if (days >= 0) {
        shippingLeadTime = `${days}日`;
      } else {
        shippingLeadTime = `遅延${Math.abs(days)}日`;
      }
    }

    // 倉庫コード一覧
    const warehouses = Array.from(
      new Set(
        allocatedLots
          .map((a) => formatCodeAndName(a.warehouse_code ?? "", a.warehouse_name ?? ""))
          .filter((w) => !!w),
      ),
    );

    return {
      ids: { lineId, orderId },
      productCode,
      productName,
      totalQty,
      unit,
      allocatedTotal,
      remainingQty,
      progressPct,
      status,
      customerCode,
      customerName,
      orderDate,
      dueDate: dueDate ?? undefined,
      shipDate: shipDate ?? undefined,
      plannedShipDate: plannedShipDate ?? undefined,
      shippingLeadTime,
      warehouses,
    };
  }, [line, order]);
}
