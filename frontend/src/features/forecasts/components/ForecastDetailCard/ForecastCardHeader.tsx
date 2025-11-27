/**
 * ForecastCardHeader - Header section of forecast detail card
 */

import { type ForecastCardHeaderProps } from "./types";

import { cn } from "@/shared/libs/utils";
import { ForecastCardHeaderInfo } from "./ForecastCardHeaderInfo";
import { ForecastCardHeaderActions } from "./ForecastCardHeaderActions";

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
        <ForecastCardHeaderInfo
          targetMonthLabel={targetMonthLabel}
          customerDisplay={customerDisplay}
          productName={productName}
          productCode={productCode}
          deliveryPlaceDisplay={deliveryPlaceDisplay}
          onToggle={onToggle}
        />

        <ForecastCardHeaderActions
          onAutoAllocate={onAutoAllocate}
          onDelete={onDelete}
          isDeleting={isDeleting}
          firstForecastId={firstForecastId}
          isOpen={isOpen}
        />
      </div>
    </div>
  );
}

