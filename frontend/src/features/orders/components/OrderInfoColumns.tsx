import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { OrderStatusBadge } from "@/shared/components/data/StatusBadge";
import type { OrderUI } from "@/shared/libs/normalize";
import type { OrderLine } from "@/shared/types/aliases";
import { formatDate } from "@/shared/utils/date";

interface OrderInfoColumnsProps {
  order: OrderUI;
  lines: OrderLine[];
  allocationRate: number;
}

// eslint-disable-next-line max-lines-per-function
export function OrderInfoColumns({ order, lines, allocationRate }: OrderInfoColumnsProps) {
  return (
    <div className="flex flex-1 items-center gap-6">
      {/* 受注番号 */}
      <div className="w-[150px]">
        <div className="text-xs font-medium text-slate-500">受注番号</div>
        <div className="font-semibold text-slate-900">{order.order_no}</div>
      </div>

      {/* 得意先 */}
      <div className="w-[180px]">
        <div className="text-xs font-medium text-slate-500">得意先</div>
        <div className="font-semibold text-slate-900">{order.customer_code}</div>
        {order.customer_name && (
          <div className="truncate text-xs text-slate-600" title={order.customer_name}>
            {order.customer_name}
          </div>
        )}
      </div>

      {/* 受注日 */}
      <div className="w-[120px]">
        <div className="text-xs font-medium text-slate-500">受注日</div>
        <div className="font-semibold text-slate-900">{formatDate(order.order_date)}</div>
      </div>

      {/* 明細数 */}
      <div className="w-[80px] text-right">
        <div className="text-xs font-medium text-slate-500">明細数</div>
        <div className="font-semibold text-slate-900">{lines.length}</div>
      </div>

      {/* 引当状況 */}
      <div className="w-[200px]">
        <div className="text-xs font-medium text-slate-500">引当状況</div>
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-32 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${
                allocationRate === 100
                  ? "bg-green-500"
                  : allocationRate > 0
                    ? "bg-blue-500"
                    : "bg-slate-300"
              }`}
              style={{ width: `${allocationRate}%` }}
            />
          </div>
          <span className="text-sm font-medium text-slate-700">{allocationRate.toFixed(0)}%</span>
        </div>
      </div>

      {/* ステータス */}
      <div className="w-[100px]">
        <div className="text-xs font-medium text-slate-500">ステータス</div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* アクション */}
      <div className="flex w-[140px] items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
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
              toast.success("SAP連携データを送信しました(Mock)");
            }}
            className="text-xs"
          >
            SAP送信
          </Button>
        )}
      </div>
    </div>
  );
}
