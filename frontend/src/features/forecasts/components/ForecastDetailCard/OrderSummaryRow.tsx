import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { OrderAllocationInline } from "./OrderAllocationInline";

import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import type { useLotAllocationForOrder } from "@/features/forecasts/hooks/useLotAllocationForOrder";
import { cn } from "@/shared/libs/utils";
import type { OrderWithLinesResponse } from "@/shared/types/aliases";
import { formatDate } from "@/shared/utils/date";
import { formatQuantity } from "@/shared/utils/formatQuantity";

import { formatDateKey } from "./utils/date-utils";

interface OrderSummaryRowProps {
  order: OrderWithLinesResponse;
  targetProductId: number; // フィルタリング対象の製品ID
  targetDeliveryPlaceId: number; // フィルタリング対象の納入先ID
  logic: ReturnType<typeof useLotAllocationForOrder>;
  hoveredDate?: string | null;
  onDateHover?: (date: string | null) => void;
}

export function OrderSummaryRow({
  order,
  targetProductId,
  targetDeliveryPlaceId,
  logic,
  hoveredDate,
  onDateHover,
}: OrderSummaryRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { targetLines, totalRequired, totalAllocated, statusLabel, statusColor } = useOrderSummary(
    order,
    targetProductId,
    targetDeliveryPlaceId,
    logic,
  );

  if (targetLines.length === 0) return null;

  // 納期の取得とハイライト判定
  const deliveryDate = targetLines[0]?.delivery_date ? new Date(targetLines[0].delivery_date) : null;
  const dateKey = deliveryDate ? formatDateKey(deliveryDate) : null;
  const isHovered = dateKey && hoveredDate === dateKey;

  const handleMouseEnter = () => {
    if (dateKey) {
      onDateHover?.(dateKey);
    }
  };

  const handleMouseLeave = () => {
    onDateHover?.(null);
  };

  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* 概要行 */}
      <div
        className={cn(
          "flex items-center gap-4 py-2 transition-colors",
          isHovered ? "bg-yellow-50" : "hover:bg-slate-50",
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono font-medium text-gray-700">
              {order.order_number || `ORD-${order.id}`}
            </span>
            <span className="hidden text-xs text-gray-500 sm:inline">{order.customer_name}</span>
            <span className="text-xs text-gray-400">|</span>
            <span className={cn("text-xs text-gray-600", isHovered && "font-bold text-gray-900")}>
              納期: {targetLines[0]?.delivery_date ? formatDate(targetLines[0].delivery_date) : "-"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs text-gray-500">明細: {targetLines.length}件</span>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs text-gray-500">必要</span>
            <span className="text-sm font-medium">
              {formatQuantity(totalRequired, targetLines[0]?.unit || "")}
            </span>
            <span className="text-xs text-gray-300">/</span>
            <span className="text-xs text-gray-500">引当</span>
            <span className={cn("text-sm font-medium", totalAllocated > 0 ? "text-blue-600" : "")}>
              {formatQuantity(totalAllocated, targetLines[0]?.unit || "")}
            </span>
            <span className="text-xs text-gray-400">{targetLines[0]?.unit}</span>
          </div>

          <Badge className={cn("h-5 px-1.5 text-[10px] font-normal", statusColor)}>
            {statusLabel}
          </Badge>

          <Link
            to={ROUTES.ORDERS.DETAIL(order.id.toString())}
            className="text-gray-400 hover:text-blue-600"
            title="受注詳細ページへ"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* 展開ビュー */}
      {isExpanded && (
        <div className="pr-2 pb-3 pl-9">
          {targetLines.map((line) => (
            <OrderAllocationInline key={line.id} line={line} logic={logic} />
          ))}
        </div>
      )}
    </div>
  );
}

function useOrderSummary(
  order: OrderWithLinesResponse,
  targetProductId: number,
  targetDeliveryPlaceId: number,
  logic: ReturnType<typeof useLotAllocationForOrder>,
) {
  const targetLines =
    order.lines?.filter(
      (line) =>
        line.product_id === targetProductId && line.delivery_place_id === targetDeliveryPlaceId,
    ) || [];

  const totalRequired = targetLines.reduce(
    (sum, line) => sum + Number(line.order_quantity || 0),
    0,
  );

  const totalAllocated = targetLines.reduce((sum, line) => {
    const allocsMap = logic.getAllocationsForLine(line.id);
    return sum + Object.values(allocsMap).reduce((s, qty) => s + qty, 0);
  }, 0);

  const { label, color } = getStatusDisplay(totalAllocated, totalRequired);

  return { targetLines, totalRequired, totalAllocated, statusLabel: label, statusColor: color };
}

function getStatusDisplay(allocated: number, required: number) {
  if (allocated >= required && required > 0) {
    return { label: "引当済", color: "bg-emerald-100 text-emerald-700" };
  }
  if (allocated > 0) {
    return { label: "一部引当", color: "bg-blue-100 text-blue-700" };
  }
  return { label: "未処理", color: "bg-gray-100 text-gray-600" };
}
