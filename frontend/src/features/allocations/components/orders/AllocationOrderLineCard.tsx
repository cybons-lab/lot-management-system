/**
 * AllocationOrderLineCard component - displays an order line in the detail pane
 */

import type { OrderLine } from "../../types";
import { getOrderQuantity } from "../../utils/allocationCalculations";

import { formatDate } from "@/shared/utils/date";
import { formatQuantity } from "@/shared/utils/formatQuantity";

interface AllocationOrderLineCardProps {
  line: OrderLine;
  isSelected: boolean;
  onClick: () => void;
  pendingAllocatedQty?: number;
  totalStock?: number;
  validStock?: number;
}

export function AllocationOrderLineCard({
  line,
  isSelected,
  onClick,
  pendingAllocatedQty = 0,
  totalStock,
  validStock,
}: AllocationOrderLineCardProps) {
  // 引当済み数量を計算(allocated_lotsまたはallocationsから)
  const allocatedQty: number = line.allocated_lots
    ? line.allocated_lots.reduce((sum: number, alloc) => {
        // DDL v2.2: prefer allocated_quantity, fallback to allocated_qty
        const qty =
          typeof alloc === "object" && alloc !== null
            ? Number(
                (
                  alloc as {
                    allocated_quantity?: number | string | null;
                    allocated_qty?: number | null;
                  }
                ).allocated_quantity ??
                  (
                    alloc as {
                      allocated_quantity?: number | string | null;
                      allocated_qty?: number | null;
                    }
                  ).allocated_qty ??
                  0,
              )
            : 0;
        return sum + qty;
      }, 0)
    : 0;

  // Prefer the original order quantity/unit for display; calculations fall back as needed
  const totalQuantity = Number(line.quantity ?? line.order_quantity ?? 0);
  const displayQuantity = Number(line.quantity ?? line.order_quantity ?? 0);
  const displayUnit = line.unit ?? "";
  const effectivePending = isSelected ? Math.max(0, pendingAllocatedQty) : 0;
  const displayedAllocated = Math.min(totalQuantity, allocatedQty + effectivePending);
  const pendingApplied = Math.max(0, displayedAllocated - allocatedQty);
  const remainingQty = Math.max(0, totalQuantity - displayedAllocated);
  const progress = totalQuantity > 0 ? (displayedAllocated / totalQuantity) * 100 : 0;
  const productCode = line.product_code || "—";
  const showProductName = Boolean(line.product_name && line.product_name !== line.product_code);
  const unitLabel = line.unit ?? "";

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
          <div className="font-medium">{productCode}</div>
          {showProductName && <div className="text-xs text-gray-500">{line.product_name}</div>}
          <div className="text-xs text-gray-400">明細 #{line.line_no}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">
            {formatQuantity(displayedAllocated, displayUnit)} /{" "}
            {formatQuantity(displayQuantity, displayUnit)}{" "}
            <span className="text-xs font-normal text-gray-500">{displayUnit}</span>
          </div>
          {/* <div className="text-xs text-gray-500">{unitLabel}</div> */}
          {pendingApplied > 0 && (
            <div className="text-[11px] text-blue-600">
              確定 {formatQuantity(allocatedQty, unitLabel)} + 配分{" "}
              {formatQuantity(pendingApplied, unitLabel)}
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

      <div className="flex justify-between text-xs text-gray-600">
        <span>
          受注数量: {formatQuantity(displayQuantity, displayUnit)} {displayUnit}
          {/* Dual Unit Display */}
          {line.product_internal_unit &&
            line.product_qty_per_internal_unit &&
            unitLabel !== line.product_internal_unit && (
              <span className="ml-1 text-gray-400">
                (= {formatQuantity(getOrderQuantity(line), line.product_internal_unit || "PCS")}{" "}
                {line.product_internal_unit})
              </span>
            )}
          {line.product_internal_unit &&
            line.product_qty_per_internal_unit &&
            unitLabel === line.product_internal_unit &&
            line.product_external_unit && (
              <span className="ml-1 text-gray-400">
                (={" "}
                {formatQuantity(
                  displayQuantity * line.product_qty_per_internal_unit,
                  line.product_internal_unit || "PCS",
                )}{" "}
                {line.product_external_unit})
              </span>
            )}
        </span>
        <span>{progress.toFixed(0)}% 引当済</span>
      </div>

      <div className="mt-1 flex justify-between text-xs text-gray-600">
        {remainingQty > 0 ? (
          <span className="font-medium text-orange-600">
            残り {formatQuantity(remainingQty, unitLabel)}
          </span>
        ) : (
          <span className="invisible">-</span>
        )}
        <span className="text-gray-500">
          納期: {formatDate(line.due_date, { fallback: "—", formatString: "MM/dd" })}
        </span>
      </div>

      {/* 不足理由の表示 */}
      {remainingQty > 0 && totalStock !== undefined && validStock !== undefined && (
        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-red-600">
          <span className="i-lucide-alert-triangle h-3 w-3" />
          {totalStock < totalQuantity
            ? "在庫不足"
            : validStock < totalQuantity
              ? "有効在庫なし（ロック/期限）"
              : "未引当"}
        </div>
      )}

      {/* 引当詳細(あれば表示) */}
      {line.allocated_lots && line.allocated_lots.length > 0 && (
        <div className="mt-2 border-t border-gray-200 pt-2">
          <div className="text-xs text-gray-600">引当数: {line.allocated_lots.length} 件</div>
        </div>
      )}
    </button>
  );
}
