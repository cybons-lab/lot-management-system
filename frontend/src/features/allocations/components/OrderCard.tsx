/**
 * OrderCard component - displays an order in the order list
 */

import { format } from "date-fns";
import { ja } from "date-fns/locale";

import type { OrderCardData } from "../types";
import { getPriorityColor, getBadgeColor } from "../utils/priority";

interface OrderCardProps {
  order: OrderCardData;
  isSelected: boolean;
  onClick: () => void;
}

export function OrderCard({ order, isSelected, onClick }: OrderCardProps) {
  const priorityColor = getPriorityColor(order.priority);
  const badgeColor = getBadgeColor(order.priority);
  const primaryLine = order.lines?.[0];
  const deliveryDestination = order.ship_to ?? "";
  const quantityText =
    primaryLine?.quantity != null
      ? `${primaryLine.quantity.toLocaleString()}${primaryLine.unit ? ` ${primaryLine.unit}` : ""}`
      : "―";
  const dueDateSource = primaryLine?.due_date ?? order.due_date ?? null;
  const dueDateText = dueDateSource
    ? format(new Date(dueDateSource), "MM/dd", { locale: ja })
    : "―";

  return (
    <button
      type="button"
      className={`relative w-full cursor-pointer rounded-md border p-3 text-left transition-all ${
        isSelected
          ? "border-blue-400 bg-blue-50 shadow-sm ring-2 ring-blue-200"
          : "border-transparent hover:bg-gray-50"
      }`}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div className="flex items-start gap-2">
        {/* 優先度インジケータ */}
        <div className={`h-16 w-1 rounded-full ${priorityColor} flex-shrink-0`} />

        <div className="min-w-0 flex-1">
          {/* 1行目: 受注番号、得意先名 */}
          <div className="mb-1 flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{order.order_no}</span>
            <span className="truncate text-xs text-gray-600">
              {order.customer_name || order.customer_code}
            </span>
          </div>

          {/* 2行目: KPIバッジ */}
          <div className="mb-1 flex flex-wrap gap-1">
            {/* 未引当バッジ */}
            {order.unallocatedQty > 0 && (
              <span className={`rounded border px-2 py-0.5 text-xs font-medium ${badgeColor}`}>
                未引当: {order.unallocatedQty}
              </span>
            )}

            {/* 納期残バッジ */}
            {order.daysTodue !== null && (
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
            <div>納品先: {deliveryDestination || "―"}</div>
            <div>個数: {quantityText}</div>
            <div>納期: {dueDateText}</div>
          </div>
        </div>
      </div>
    </button>
  );
}
