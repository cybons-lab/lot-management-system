/**
 * Allocation input section for LotListCard.
 * Displays quantity input and action buttons.
 */
import { AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import type { CandidateLotItem } from "../../api";

import { ForecastTooltip } from "./ForecastTooltip";
import { useForecastData } from "./hooks/useForecastData";

import { Button, Input } from "@/components/ui";
import { cn } from "@/shared/libs/utils";
import { formatQuantity } from "@/shared/utils/formatQuantity";

interface AllocationInputSectionProps {
  lot: CandidateLotItem;
  allocatedQty: number;
  freeQty: number;
  remainingInLot: number;
  limit: number;
  customerId?: number | null;
  deliveryPlaceId?: number | null;
  productId?: number | null;
  // State from hook
  isShaking: boolean;
  isConfirmed: boolean;
  // Handlers from hook
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFullAllocation: () => void;
  handleConfirm: () => void;
  handleClearAllocation: () => void;
}

// eslint-disable-next-line max-lines-per-function, complexity
export function AllocationInputSection({
  lot,
  allocatedQty,
  freeQty,
  remainingInLot,
  limit,
  customerId,
  deliveryPlaceId,
  productId,
  isShaking,
  isConfirmed,
  handleInputChange,
  handleFullAllocation,
  handleConfirm,
  handleClearAllocation,
}: AllocationInputSectionProps) {
  const isLocked = lot.status === "locked" || lot.status === "quarantine";

  // Forecast tooltip state
  const [showForecast, setShowForecast] = useState(false);
  const { data: forecasts, isLoading: isForecastLoading } = useForecastData(
    customerId,
    deliveryPlaceId,
    productId,
  );

  return (
    <div className="flex shrink-0 items-center gap-x-3">
      {/* Quantity display */}
      <div className="min-w-[140px] text-right">
        <div className="text-xs font-bold text-gray-400">残量 / 総量</div>
        <div className="text-sm font-bold text-gray-900">
          {formatQuantity(remainingInLot, lot.internal_unit || "PCS")} /{" "}
          {formatQuantity(freeQty, lot.internal_unit || "PCS")} {lot.internal_unit}
        </div>
        {lot.qty_per_internal_unit && lot.external_unit && (
          <div className="text-[10px] text-gray-500">
            (={" "}
            {formatQuantity(remainingInLot * lot.qty_per_internal_unit, lot.external_unit || "BOX")}{" "}
            / {formatQuantity(freeQty * lot.qty_per_internal_unit, lot.external_unit || "BOX")}{" "}
            {lot.external_unit})
          </div>
        )}
      </div>

      <div className="h-8 w-px shrink-0 bg-gray-100" />
      <div className="h-8 w-px shrink-0 bg-gray-100" />

      {/* Input with forecast tooltip */}
      <div
        className="relative"
        onMouseEnter={() => setShowForecast(true)}
        onMouseLeave={() => setShowForecast(false)}
        onFocus={() => setShowForecast(true)}
        onBlur={() => setShowForecast(false)}
      >
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={allocatedQty === 0 ? "" : allocatedQty}
              onChange={handleInputChange}
              className={cn(
                "h-8 w-20 text-center text-sm font-bold transition-all",
                isConfirmed
                  ? "border-blue-600 text-blue-900 ring-2 ring-blue-600/20"
                  : allocatedQty > 0
                    ? "border-orange-500 text-orange-700 ring-1 ring-orange-500/20"
                    : "border-gray-300 text-gray-900",
                isShaking && "animate-shake border-red-500 text-red-600 ring-red-500",
              )}
              placeholder="0"
              min="0"
              max={limit}
            />
            <span className="text-xs text-gray-500">{lot.internal_unit}</span>
          </div>
          {allocatedQty > 0 && lot.qty_per_internal_unit && lot.external_unit && (
            <div className="absolute right-0 -bottom-4 left-0 text-center text-[10px] text-gray-500">
              ={" "}
              {formatQuantity(allocatedQty * lot.qty_per_internal_unit, lot.external_unit || "BOX")}{" "}
              {lot.external_unit}
            </div>
          )}
        </div>
        <AnimatePresence>
          {showForecast && (
            <ForecastTooltip forecasts={forecasts || []} isLoading={isForecastLoading} />
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 rounded-md bg-gray-50 p-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleFullAllocation}
          disabled={freeQty <= 0 || isLocked}
          className="h-8 px-2 text-xs"
          title="このロットから全量割当（他のロットはクリア）"
        >
          全量
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleConfirm}
          disabled={allocatedQty === 0 || isConfirmed}
          className={cn(
            "h-8 px-2 text-xs",
            isConfirmed && "border-blue-300 bg-blue-50 text-blue-700",
          )}
        >
          引確
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClearAllocation}
          disabled={allocatedQty === 0}
          className={cn(
            "h-8 w-8 p-0 text-gray-500 transition-colors",
            "border border-gray-300 bg-white shadow-sm",
            "hover:border-red-300 hover:bg-red-50 hover:text-red-600",
            allocatedQty === 0 && "cursor-not-allowed border-gray-200 bg-gray-50 opacity-50",
          )}
          title="クリア"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
