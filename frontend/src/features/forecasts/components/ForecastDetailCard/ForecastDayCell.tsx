/**
 * ForecastDayCell - Individual day cell in the forecast grid
 */

import type { DayCellProps } from "./types";

import { cn } from "@/shared/libs/utils";

import { formatDateKey } from "./utils/date-utils";

/**
 * Render a single day cell for the grid
 * Displays date and quantity with appropriate styling
 */
export function ForecastDayCell({
  date,
  quantity,
  isToday,
  isPast,
  hoveredDate,
  onDateHover,
}: DayCellProps) {
  const hasValue = quantity !== undefined && quantity !== null;
  const roundedQty = hasValue ? Math.round(Number(quantity)) : null;
  const isZero = roundedQty === 0;
  const displayValue = roundedQty === null ? "-" : roundedQty.toLocaleString("ja-JP");

  const dateKey = formatDateKey(date);
  const isHovered = hoveredDate === dateKey;

  const handleMouseEnter = () => {
    onDateHover?.(dateKey);
  };

  const handleMouseLeave = () => {
    onDateHover?.(null);
  };

  return (
    <div
      className={cn(
        "cursor-default rounded border bg-white px-1 py-0.5 text-[11px] leading-tight transition",
        "focus-within:ring-1 focus-within:ring-blue-200",
        isToday ? "border-blue-400 ring-1 ring-blue-100" : "border-gray-200",
        isPast ? "opacity-80" : undefined,
        isHovered ? "border-yellow-400 bg-yellow-50 ring-1 ring-yellow-200" : undefined,
      )}
      aria-disabled={isPast}
      data-locked={isPast ? "true" : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] text-gray-500">{date.getDate()}</span>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            !hasValue || isZero
              ? "text-gray-400"
              : isPast
                ? "text-gray-400"
                : "font-semibold text-gray-900",
          )}
        >
          {displayValue}
        </span>
      </div>
    </div>
  );
}
