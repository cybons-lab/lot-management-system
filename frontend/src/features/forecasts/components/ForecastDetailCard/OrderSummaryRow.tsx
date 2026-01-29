import { useState } from "react";

import { OrderAllocationInline } from "./OrderAllocationInline";
import { OrderSummaryHeader } from "./OrderSummaryHeader";

import type { useLotAllocationForOrder } from "@/features/forecasts/hooks/useLotAllocationForOrder";
import type { OrderWithLinesResponse } from "@/shared/types/aliases";
import { formatDateKey } from "@/shared/utils/date";

interface OrderSummaryRowProps {
  order: OrderWithLinesResponse;
  targetProductGroupId: number; // フィルタリング対象の製品グループID
  targetDeliveryPlaceId: number; // フィルタリング対象の納入先ID
  logic: ReturnType<typeof useLotAllocationForOrder>;
  hoveredDate?: string | null;
  onDateHover?: (date: string | null) => void;
}

export function OrderSummaryRow({
  order,
  targetProductGroupId,
  targetDeliveryPlaceId,
  logic,
  hoveredDate,
  onDateHover,
}: OrderSummaryRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { targetLines, totalRequired, totalAllocated, statusLabel, statusColor } = useOrderSummary(
    order,
    targetProductGroupId,
    targetDeliveryPlaceId,
    logic,
  );

  if (targetLines.length === 0) return null;

  // 納期の取得とハイライト判定
  const deliveryDate = targetLines[0]?.delivery_date
    ? new Date(targetLines[0].delivery_date)
    : null;
  const dateKey = deliveryDate ? formatDateKey(deliveryDate) : null;
  const isHovered = Boolean(dateKey && hoveredDate === dateKey);

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
      <OrderSummaryHeader
        order={order}
        targetLines={targetLines}
        isExpanded={isExpanded}
        isHovered={isHovered}
        totalRequired={totalRequired}
        totalAllocated={totalAllocated}
        statusLabel={statusLabel}
        statusColor={statusColor}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

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
  targetProductGroupId: number,
  targetDeliveryPlaceId: number,
  logic: ReturnType<typeof useLotAllocationForOrder>,
) {
  const targetLines =
    order.lines?.filter(
      (line) =>
        line.product_group_id === targetProductGroupId &&
        line.delivery_place_id === targetDeliveryPlaceId,
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
