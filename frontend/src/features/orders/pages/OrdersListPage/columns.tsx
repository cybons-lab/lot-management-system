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
    cell: (order: OrderUI) => <span className="font-medium">{order.order_no}</span>,
    sortable: true,
  },
  {
    id: "customer_code",
    header: "得意先",
    cell: (order: OrderUI) => (
      <div>
        <div className="font-medium">{order.customer_code}</div>
        {order.customer_name && <div className="text-xs text-gray-600">{order.customer_name}</div>}
      </div>
    ),
    sortable: true,
  },
  {
    id: "order_date",
    header: "受注日",
    cell: (order: OrderUI) => formatDate(order.order_date),
    sortable: true,
  },
  {
    id: "due_date",
    header: "納期",
    cell: (order: OrderUI) => formatDate(order.due_date || null),
    sortable: true,
  },
  {
    id: "lines_count",
    header: "明細数",
    cell: (order: OrderUI) => <span className="text-center">{order.lines?.length || 0}</span>,
    align: "center",
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
        <div className="flex items-center space-x-2">
          <div className="h-2 w-24 rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full ${
                rate === 100 ? "bg-green-500" : rate > 0 ? "bg-blue-500" : "bg-gray-300"
              }`}
              style={{ width: `${rate}%` }}
            />
          </div>
          <span className="text-xs text-gray-600">{rate.toFixed(0)}%</span>
        </div>
      );
    },
  },
  {
    id: "status",
    header: "ステータス",
    cell: (order: OrderUI) => <OrderStatusBadge status={order.status} />,
    sortable: true,
    align: "center",
  },
  {
    id: "actions",
    header: "",
    cell: (order: OrderUI) => (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // 引当画面へ遷移するロジック
            window.location.href = `/allocation?selected=${order.id}`;
          }}
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
            SAPへ送信
          </Button>
        )}
      </div>
    ),
    width: "120px",
  },
];
