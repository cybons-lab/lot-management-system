/**
 * ForecastCardHeader - Header section of forecast detail card
 */

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

import type { ForecastCardHeaderProps } from "./types";

/**
 * Display card header with customer, product, and delivery place information
 * Includes toggle button and delete action
 */
export function ForecastCardHeader({
  targetMonthLabel,
  customerDisplay,
  productName,
  productCode,
  deliveryPlaceDisplay,
  groupKey,
  isActive,
  isOpen,
  onToggle,
  onDelete,
  isDeleting,
  firstForecastId,
}: ForecastCardHeaderProps) {
  return (
    <div
      className={cn(
        "border-b px-4 py-3",
        isActive ? "border-primary/20 bg-slate-100" : "border-slate-200 bg-slate-50",
      )}
    >
      <div className="flex flex-row items-start justify-between gap-4">
        <button
          type="button"
          className="focus-visible:ring-primary/40 flex flex-1 flex-col items-start gap-1.5 text-left focus-visible:ring-2 focus-visible:outline-none"
          onClick={() => onToggle?.()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggle?.();
            }
          }}
        >
          {/* Top row: Month label */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-gray-500">{targetMonthLabel}</span>
          </div>

          {/* Bottom row: Customer / Product / Delivery Place */}
          <div className="line-clamp-2 text-xs text-gray-500">
            <span className="text-sm font-semibold text-gray-500">{customerDisplay}</span>
            <span className="mx-1 text-gray-300">/</span>
            <span className="text-base font-bold text-gray-900">
              {productName}
              {productCode ? (
                <span className="text-sm font-semibold text-gray-700"> ({productCode})</span>
              ) : null}
            </span>
            <span className="mx-1 text-gray-300">/</span>
            <span className="text-sm text-gray-500">{deliveryPlaceDisplay}</span>
          </div>
        </button>

        {/* Right side: Delete button and chevron */}
        <div className="flex flex-shrink-0 items-center gap-2 pt-1">
          {onDelete && firstForecastId ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(firstForecastId);
              }}
              disabled={isDeleting}
            >
              削除
            </Button>
          ) : null}

          <div className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100">
            <ChevronDown
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                isOpen ? "rotate-180" : "rotate-0",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
