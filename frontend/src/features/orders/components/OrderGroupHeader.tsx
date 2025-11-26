/**
 * OrderGroupHeader.tsx
 * 受注グループのヘッダー表示（展開/折りたたみ可能）
 */

import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { OrderStatusBadge } from "@/shared/components/data/StatusBadge";
import { coerceAllocatedLots } from "@/shared/libs/allocations";
import type { OrderUI } from "@/shared/libs/normalize";
import type { OrderLine } from "@/shared/types/aliases";
import { formatDate } from "@/shared/utils/date";

interface OrderGroupHeaderProps {
  order: OrderUI;
  isExpanded: boolean;
  onToggle: () => void;
}

interface OrderInfoColumnsProps {
  order: OrderUI;
  lines: OrderLine[];
  allocationRate: number;
}

function OrderInfoColumns({ order, lines, allocationRate }: OrderInfoColumnsProps) {
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

export function OrderGroupHeader({ order, isExpanded, onToggle }: OrderGroupHeaderProps) {
  // 全体の引当率を計算
  const lines = order.lines || [];
  const totalQty = lines.reduce<number>(
    (sum, line: OrderLine) => sum + Number(line.order_quantity ?? line.quantity ?? 0),
    0,
  );
  const allocatedQty = lines.reduce<number>((sum, line: OrderLine) => {
    const lots = coerceAllocatedLots(line.allocated_lots);
    const allocated = lots.reduce(
      (acc, alloc) => acc + Number(alloc.allocated_quantity ?? alloc.allocated_qty ?? 0),
      0,
    );
    return sum + allocated;
  }, 0);

  const allocationRate = totalQty > 0 ? (allocatedQty / totalQty) * 100 : 0;

  return (
    <div
      className="flex cursor-pointer items-center gap-4 border-b-2 border-slate-200 bg-white px-6 py-4 hover:bg-slate-50"
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {/* 展開/折りたたみアイコン */}
      <div className="flex items-center">
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-slate-600" />
        ) : (
          <ChevronRight className="h-5 w-5 text-slate-600" />
        )}
      </div>

      <OrderInfoColumns order={order} lines={lines} allocationRate={allocationRate} />
    </div>
  );
}
