/**
 * OrderCard component - displays an order in the order list
 */

import type { OrderCardData } from "../../types";
import { getPriorityColor, getBadgeColor } from "../../utils/priority";

import { formatDate } from "@/shared/utils/date";

interface OrderCardProps {
  order: OrderCardData;
  isSelected: boolean;
  onClick: () => void;
  lockedBy?: string;
  lockedAt?: string;
}

export function OrderCard({ order, isSelected, onClick, lockedBy, lockedAt }: OrderCardProps) {
  const priorityColor = getPriorityColor(order.priority);
  const badgeColor = getBadgeColor(order.priority);
  const primaryLine = order.lines?.[0];

  const deliveryDestination = order.primaryDeliveryPlace || "―";

  const quantityText = (() => {
    if (order.totalQuantity != null && order.totalQuantity > 0) {
      const unit = primaryLine?.unit ? ` ${primaryLine.unit}` : "";
      return `${order.totalQuantity.toLocaleString()}${unit}`;
    }
    if (primaryLine?.quantity != null) {
      return `${primaryLine.quantity.toLocaleString()}${primaryLine.unit ? ` ${primaryLine.unit}` : ""}`;
    }
    return "―";
  })();

  const dueDateSource = order.due_date ?? primaryLine?.due_date ?? null;
  const dueDateText = formatDate(dueDateSource, { format: "MM/dd", fallback: "―" });

  const isFullyAllocated = order.unallocatedQty === 0;
  const isPartiallyAllocated =
    order.unallocatedQty > 0 && order.unallocatedQty < order.totalQuantity;

  let cardStyle = "border-transparent hover:bg-gray-50";
  if (isSelected) {
    cardStyle = "border-blue-400 bg-blue-50 shadow-sm ring-2 ring-blue-200";
  } else if (isFullyAllocated) {
    cardStyle = "bg-green-50 border-green-300 hover:bg-green-100";
  } else if (isPartiallyAllocated) {
    cardStyle = "bg-yellow-50 border-yellow-300 hover:bg-yellow-100";
  } else {
    cardStyle = "bg-gray-50 border-gray-300 hover:bg-gray-100";
  }

  return (
    <button
      type="button"
      className={`relative w-full cursor-pointer rounded-md border p-3 text-left transition-all ${cardStyle}`}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div className="flex items-start gap-2">
        {/* 優先度インジケータ */}
        <div className={`h-16 w-1 rounded-full ${priorityColor} flex-shrink-0`} />

        <div className="min-w-0 flex-1">
          {/* Lock Indicator */}
          {lockedBy && (
            <div className="mb-2 rounded border border-yellow-300 bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
              🔒 {lockedBy}さんが編集中 {lockedAt && `(${lockedAt})`}
            </div>
          )}

          {/* 1行目: 受注番号、得意先名 */}
          <div className="mb-1 flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{order.order_no}</span>
            <span className="truncate text-xs text-gray-600">
              {order.customer_name || order.customer_code}
            </span>
          </div>

          {/* 2行目: KPIバッジ */}
          <div className="mb-1 flex flex-wrap gap-1">
            {/* ステータスバッジ */}
            {isFullyAllocated && (
              <span className="rounded border border-green-300 bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                引当完了
              </span>
            )}
            {isPartiallyAllocated && (
              <span className="rounded border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                一部不足
              </span>
            )}
            {!isFullyAllocated && !isPartiallyAllocated && (
              <span className="rounded border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                未引当
              </span>
            )}

            {/* 納期残バッジ（有限な数値のときのみ表示、NaN防止） */}
            {typeof order.daysTodue === "number" && isFinite(order.daysTodue) && (
              <span
                className={`rounded border px-2 py-0.5 text-xs font-medium ${
                  order.daysTodue < 0 ? "border-red-300 bg-red-100 text-red-700" : badgeColor
                }`}
              >
                {order.daysTodue < 0 ? `D+${Math.abs(order.daysTodue)}` : `D-${order.daysTodue}`}
              </span>
            )}

            {/* 必須欠落バッジ */}
            {order.hasMissingFields && (
              <span className="rounded border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                必須欠落
              </span>
            )}

            {/* 発注待ちバッジ */}
            {order.status === "PENDING_PROCUREMENT" && (
              <span className="rounded border border-purple-300 bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                発注待ち
              </span>
            )}
          </div>

          {/* 3行目: 納品先/個数/納期 */}
          <div className="mt-2 space-y-1 text-xs text-gray-600">
            <div>納品先: {deliveryDestination}</div>
            <div>個数: {quantityText}</div>
            <div>納期: {dueDateText}</div>
          </div>
        </div>
      </div>
    </button>
  );
}
