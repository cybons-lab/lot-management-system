/**
 * OrderLineColumns.tsx
 * 受注明細行のカラム定義
 */

import type { Column } from "@/shared/components/data/DataTable";
import { coerceAllocatedLots } from "@/shared/libs/allocations";
import type { OrderLine } from "@/shared/types/aliases";
import { formatDate } from "@/shared/utils/date";

export const orderLineColumns: Column<OrderLine>[] = [
  {
    id: "product_code",
    header: "製品コード",
    cell: (line: OrderLine) => (
      <div className="pl-10">
        <div className="font-medium text-slate-900">{line.product_code ?? "–"}</div>
        {line.product_name && <div className="text-xs text-slate-600">{line.product_name}</div>}
      </div>
    ),
    width: "250px",
  },
  {
    id: "order_quantity",
    header: "注文数量",
    cell: (line: OrderLine) => {
      const qty = Number(line.order_quantity ?? line.quantity ?? 0);
      return (
        <div className="text-slate-900">
          {qty.toLocaleString()} {line.unit ?? ""}
        </div>
      );
    },
    align: "right",
    width: "120px",
  },
  {
    id: "allocated_quantity",
    header: "引当数量",
    cell: (line: OrderLine) => {
      const lots = coerceAllocatedLots(line.allocated_lots);
      const allocatedQty = lots.reduce(
        (acc, alloc) => acc + Number(alloc.allocated_quantity ?? alloc.allocated_qty ?? 0),
        0,
      );
      return (
        <div className="text-slate-900">
          {allocatedQty.toLocaleString()} {line.unit ?? ""}
        </div>
      );
    },
    align: "right",
    width: "120px",
  },
  {
    id: "allocation_rate",
    header: "引当率",
    cell: (line: OrderLine) => {
      const orderQty = Number(line.order_quantity ?? line.quantity ?? 0);
      const lots = coerceAllocatedLots(line.allocated_lots);
      const allocatedQty = lots.reduce(
        (acc, alloc) => acc + Number(alloc.allocated_quantity ?? alloc.allocated_qty ?? 0),
        0,
      );
      const rate = orderQty > 0 ? (allocatedQty / orderQty) * 100 : 0;

      return (
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-24 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${
                rate === 100 ? "bg-green-500" : rate > 0 ? "bg-blue-500" : "bg-slate-300"
              }`}
              style={{ width: `${rate}%` }}
            />
          </div>
          <span className="text-sm font-medium text-slate-700">{rate.toFixed(0)}%</span>
        </div>
      );
    },
    width: "180px",
  },
  {
    id: "due_date",
    header: "納期",
    cell: (line: OrderLine) => {
      // OrderLineに納期がない場合は親のOrderから取得する必要があるかも
      const dueDate = line.due_date ?? null;
      return <div className="text-slate-900">{formatDate(dueDate)}</div>;
    },
    width: "120px",
  },
];
