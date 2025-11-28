/**
 * OrderGroupHeader.tsx
 * 受注グループのヘッダー表示（展開/折りたたみ可能）
 */

import { ChevronDown, ChevronRight } from "lucide-react";

import { OrderInfoColumns } from "./OrderInfoColumns";

import { coerceAllocatedLots } from "@/shared/libs/allocations";
import type { OrderUI } from "@/shared/libs/normalize";

interface OrderGroupHeaderProps {
  order: OrderUI;
  isExpanded: boolean;
  onToggle: () => void;
}

export function OrderGroupHeader({ order, isExpanded, onToggle }: OrderGroupHeaderProps) {
  // 全体の引当率を計算
  const lines = order.lines || [];
  const totalQty = lines.reduce<number>(
    (sum, line) => sum + Number(line.order_quantity ?? line.quantity ?? 0),
    0,
  );
  const allocatedQty = lines.reduce<number>((sum, line) => {
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
