/**
 * ForecastDayCell - Individual day cell in the forecast grid
 * with inline editing support via double-click
 *
 * Supports:
 * - Update existing forecast (quantity > 0)
 * - Delete forecast (quantity = 0 for existing)
 * - Create new forecast (quantity > 0 for non-existing)
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { DayCellProps } from "./types";

import { cn } from "@/shared/libs/utils";
import { formatDateKey } from "@/shared/utils/date";

/* eslint-disable max-lines-per-function, complexity */


/**
 * Render a single day cell for the grid
 * Displays date and quantity with appropriate styling
 * Supports inline editing on double-click
 */
export function ForecastDayCell({
  date,
  quantity,
  forecastId,
  isToday,
  isPast,
  hoveredDate,
  onDateHover,
  onUpdateQuantity,
  onCreateForecast,
  isUpdating,
}: DayCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Allow editing if not past and we have either:
  // - An existing forecast to update (forecastId + onUpdateQuantity)
  // - Ability to create new forecast (onCreateForecast)
  const canEdit = !isPast && (onUpdateQuantity !== undefined || onCreateForecast !== undefined);

  const handleDoubleClick = () => {
    if (isPast) return;
    if (!canEdit) return;

    setEditValue(roundedQty?.toString() ?? "");
    setIsEditing(true);
  };

  const handleSave = useCallback(async () => {
    const newValue = editValue === "" ? 0 : parseFloat(editValue);
    if (isNaN(newValue) || newValue < 0) {
      setIsEditing(false);
      return;
    }

    const intValue = Math.round(newValue);

    // Case 1: Existing forecast
    if (forecastId && onUpdateQuantity) {
      if (intValue !== roundedQty) {
        try {
          // 0 means delete (handled by parent)
          await onUpdateQuantity(forecastId, intValue);
        } catch {
          // Error handling is done in the parent
        }
      }
    }
    // Case 2: No existing forecast, create new if value > 0
    else if (!forecastId && onCreateForecast && intValue > 0) {
      try {
        await onCreateForecast(dateKey, intValue);
      } catch {
        // Error handling is done in the parent
      }
    }

    setIsEditing(false);
  }, [forecastId, onUpdateQuantity, onCreateForecast, editValue, roundedQty, dateKey]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      className={cn(
        "rounded border bg-white px-1 py-0.5 text-[11px] leading-tight transition",
        canEdit ? "cursor-pointer hover:border-blue-300" : "cursor-default",
        "focus-within:ring-1 focus-within:ring-blue-200",
        isToday ? "border-blue-400 ring-1 ring-blue-100" : "border-gray-200",
        isPast ? "opacity-80" : undefined,
        isHovered ? "border-yellow-400 bg-yellow-50 ring-1 ring-yellow-200" : undefined,
        isUpdating ? "opacity-50" : undefined,
      )}
      aria-disabled={isPast}
      data-locked={isPast ? "true" : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      title={canEdit ? "ダブルクリックで編集" : undefined}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] text-gray-500">{date.getDate()}</span>
        {isEditing ? (
          <input
            ref={inputRef}
            type="number"
            min="0"
            step="1"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-14 rounded border border-blue-300 bg-white px-1 text-right text-sm font-semibold tabular-nums outline-none focus:ring-1 focus:ring-blue-400"
            disabled={isUpdating}
            placeholder="0"
          />
        ) : (
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
        )}
      </div>
    </div>
  );
}
