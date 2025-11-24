import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";
import { OrderStatusBadge } from "@/shared/components/data/StatusBadge";
import { coerceAllocatedLots } from "@/shared/libs/allocations";
import type { OrderUI } from "@/shared/libs/normalize";
import type { OrderLine } from "@/shared/types/aliases";
import { formatDate } from "@/shared/utils/date";

export const columns: Column<OrderUI>[] = [
  {
    id: "order_no",
    header: "受注番号",
    cell: (order: OrderUI) => <span className="font-medium text-slate-900">{order.order_no}</span>,
    sortable: true,
    width: "150px",
  },
  {
    id: "customer_code",
    header: "得意先",
    cell: (order: OrderUI) => (
      <div>
        <div className="font-medium text-slate-900">{order.customer_code}</div>
        {order.customer_name && <div className="text-xs text-slate-600">{order.customer_name}</div>}
      </div>
    ),
    sortable: true,
    width: "180px",
  },
  {
    id: "order_date",
    header: "受注日",
    cell: (order: OrderUI) => <span className="text-slate-900">{formatDate(order.order_date)}</span>,
    sortable: true,
    width: "120px",
  },
  {
    id: "due_date",
    header: "納期",
    cell: (order: OrderUI) => <span className="text-slate-900">{formatDate(order.due_date || null)}</span>,
    sortable: true,
    width: "120px",
  },
  {
    id: "lines_count",
    header: "明細数",
    cell: (order: OrderUI) => <span className="text-slate-900">{order.lines?.length || 0}</span>,
    align: "right",
    width: "80px",
  },
  {
    id: "allocation_status",
    header: "引当状況",
    cell: (order: OrderUI) => {
      const lines = order.lines || [];
      // DDL v2.2: prefer order_quantity, fallback to quantity
      const totalQty = lines.reduce<number>(
        (sum, line: OrderLine) => sum + Number(line.order_quantity ?? line.quantity ?? 0),
        0,
      );
      const allocatedQty = lines.reduce<number>((sum, line: OrderLine) => {
        const lots = coerceAllocatedLots(line.allocated_lots);
        // DDL v2.2: prefer allocated_quantity, fallback to allocated_qty
        const allocated = lots.reduce(
          (acc, alloc) => acc + Number(alloc.allocated_quantity ?? alloc.allocated_qty ?? 0),
          0,
        );
        return sum + allocated;
      }, 0);

      const rate = totalQty > 0 ? (allocatedQty / totalQty) * 100 : 0;

      return (
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-32 overflow-hidden rounded-full bg-slate-200">
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
    id: "status",
    header: "ステータス",
    cell: (order: OrderUI) => <OrderStatusBadge status={order.status} />,
    sortable: true,
    align: "left",
    width: "100px",
  },
  {
    id: "actions",
    header: "",
    cell: (order: OrderUI) => (
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // 引当画面へ遷移するロジック
            window.location.href = `/allocation?selected=${order.id}`;
          }}
          className="h-8 w-8 p-0"
          title="引当画面へ"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
        {order.status === "allocated" && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              const { toast } = require("sonner");
              toast.success("SAP連携データを送信しました(Mock)");
            }}
            className="text-xs"
          >
            SAP送信
          </Button>
        )}
      </div>
    ),
    width: "140px",
  },
];
