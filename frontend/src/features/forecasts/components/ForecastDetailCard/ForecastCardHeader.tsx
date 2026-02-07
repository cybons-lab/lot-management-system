/**
 * ForecastCardHeader - Header section of forecast detail card
 */

import { ForecastCardHeaderActions } from "./ForecastCardHeaderActions";
import { ForecastCardHeaderInfo } from "./ForecastCardHeaderInfo";
import { type ForecastCardHeaderProps } from "./types";

import { cn } from "@/shared/libs/utils";

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
  isActive,
  isOpen,
  onToggle,
  onAutoAllocate,
  onRegenerateSuggestions,
  onClearSuggestions,
  onDelete,
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
        <ForecastCardHeaderInfo
          targetMonthLabel={targetMonthLabel}
          customerDisplay={customerDisplay}
          productName={productName}
          productCode={productCode}
          deliveryPlaceDisplay={deliveryPlaceDisplay}
          {...(onToggle !== undefined ? { onToggle } : {})}
        />

        <ForecastCardHeaderActions
          {...(onAutoAllocate !== undefined ? { onAutoAllocate } : {})}
          {...(onRegenerateSuggestions !== undefined ? { onRegenerateSuggestions } : {})}
          {...(onClearSuggestions !== undefined ? { onClearSuggestions } : {})}
          {...(onDelete !== undefined ? { onDelete } : {})}
          {...(firstForecastId !== undefined ? { firstForecastId } : {})}
          isOpen={isOpen}
        />
      </div>
    </div>
  );
}
