/**
 * OrderLineCard component - displays an order line in the detail pane
 */

import type { OrderLine } from "../types";

interface OrderLineCardProps {
  line: OrderLine;
  isSelected: boolean;
  onClick: () => void;
  pendingAllocatedQty?: number;
}

export function OrderLineCard({
  line,
  isSelected,
  onClick,
  pendingAllocatedQty = 0,
}: OrderLineCardProps) {
  // 引当済み数量を計算(allocated_lotsまたはallocationsから)
  const allocatedQty = line.allocated_lots
    ? line.allocated_lots.reduce((sum, alloc) => sum + (alloc.allocated_qty || 0), 0)
    : 0;

  const totalQuantity = line.quantity > 0 ? line.quantity : 0;
  const effectivePending = isSelected ? Math.max(0, pendingAllocatedQty) : 0;
  const displayedAllocated = Math.min(totalQuantity, allocatedQty + effectivePending);
  const pendingApplied = Math.max(0, displayedAllocated - allocatedQty);
  const remainingQty = Math.max(0, totalQuantity - displayedAllocated);
  const progress = totalQuantity > 0 ? (displayedAllocated / totalQuantity) * 100 : 0;

  return (
    <button
      type="button"
      className={`w-full cursor-pointer rounded-lg border p-3 text-left transition-all ${
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      }`}
      onClick={onClick}
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <div className="font-medium">{line.product_code || line.product_name || "—"}</div>
          {line.product_name && <div className="text-xs text-gray-500">{line.product_name}</div>}
          <div className="text-xs text-gray-400">明細 #{line.line_no}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">
            {displayedAllocated.toLocaleString()} / {totalQuantity.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">{line.unit}</div>
          {pendingApplied > 0 && (
            <div className="text-[11px] text-blue-600">
              確定 {allocatedQty.toLocaleString()} + 配分 {pendingApplied.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* 進捗バー */}
      <div className="mb-1 h-2 w-full rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full transition-all ${
            progress === 100 ? "bg-green-500" : "bg-blue-500"
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      <div className="flex justify-between text-xs">
        <span className="text-gray-600">{progress.toFixed(0)}% 引当済</span>
        {remainingQty > 0 && (
          <span className="font-medium text-orange-600">残り {remainingQty.toLocaleString()}</span>
        )}
      </div>

      {/* 引当詳細(あれば表示) */}
      {line.allocated_lots && line.allocated_lots.length > 0 && (
        <div className="mt-2 border-t border-gray-200 pt-2">
          <div className="text-xs text-gray-600">引当数: {line.allocated_lots.length} 件</div>
        </div>
      )}
    </button>
  );
}
