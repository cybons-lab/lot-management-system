/**
 * Quantity progress section for allocation header.
 * Displays quantity info, progress bar, and action buttons.
 */
import { Button } from "@/components/ui";
import { cn } from "@/shared/libs/utils";
import { formatQuantity } from "@/shared/utils/formatQuantity";

interface QuantityProgressSectionProps {
  orderQuantity: number;
  orderUnit: string;
  inventoryUnit: string;
  requiredQty: number;
  totalAllocated: number;
  remainingQty: number;
  progressPercent: number;
  isOverAllocated: boolean;
  isComplete: boolean;
  isPartial: boolean;
  // Actions
  isLoading: boolean;
  isSaving: boolean;
  justSaved: boolean;
  hasCandidates: boolean;
  canSave: boolean;
  onAutoAllocate: () => void;
  onClearAllocations: () => void;
  onSaveAllocations: () => void;
  onConfirmHard?: () => void;
}

// eslint-disable-next-line max-lines-per-function, complexity
export function QuantityProgressSection({
  orderQuantity,
  orderUnit,
  inventoryUnit,
  requiredQty,
  totalAllocated,
  remainingQty,
  progressPercent,
  isOverAllocated,
  isComplete,
  isPartial,
  isLoading,
  isSaving,
  justSaved,
  hasCandidates,
  canSave,
  onAutoAllocate,
  onClearAllocations,
  onSaveAllocations,
  onConfirmHard,
}: QuantityProgressSectionProps) {
  return (
    <div className="col-span-5 flex flex-col justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-5">
      <div className="flex flex-col gap-4">
        {/* Quantity Info */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold text-gray-500">必要数</span>
            <span className="text-2xl font-bold text-gray-900">
              {formatQuantity(orderQuantity, orderUnit)}{" "}
              <span className="text-sm font-normal text-gray-500">{orderUnit}</span>
            </span>
          </div>

          {inventoryUnit && inventoryUnit !== orderUnit && (
            <div className="flex items-baseline justify-between border-t border-gray-200/50 pt-2 text-xs text-gray-500">
              <span>在庫単位換算</span>
              <span className="font-semibold text-gray-700">
                {formatQuantity(requiredQty, inventoryUnit)}{" "}
                <span className="text-[11px] font-normal text-gray-500">{inventoryUnit}</span>
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={cn(
                "h-full transition-all duration-500 ease-out",
                isOverAllocated
                  ? "bg-orange-500"
                  : isComplete
                    ? "bg-emerald-500"
                    : isPartial
                      ? "bg-amber-500"
                      : "bg-gray-500",
              )}
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-medium">
            <span className="text-blue-600">
              引当: {formatQuantity(totalAllocated, inventoryUnit)} {inventoryUnit}
            </span>
            <span className={cn(remainingQty > 0 ? "text-red-500" : "text-emerald-600")}>
              残: {formatQuantity(remainingQty, inventoryUnit)} {inventoryUnit}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex items-center gap-2 border-t border-gray-200/50 pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAutoAllocate}
          disabled={isLoading || !hasCandidates || remainingQty <= 0}
          className="h-9 min-w-[4rem] flex-1 bg-white px-2 text-xs hover:bg-gray-50"
        >
          自動
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearAllocations}
          disabled={totalAllocated === 0}
          className="h-9 min-w-[4rem] flex-1 bg-white px-2 text-xs hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          クリア
        </Button>

        <Button
          type="button"
          onClick={onSaveAllocations}
          disabled={!canSave || isSaving}
          className={cn(
            "h-9 min-w-[4rem] flex-1 px-2 font-bold shadow-sm transition-all duration-300",
            isOverAllocated && !justSaved && "cursor-not-allowed bg-gray-400",
            !isOverAllocated && !justSaved && "bg-blue-600 hover:bg-blue-700",
            justSaved && "bg-green-600 text-white hover:bg-green-700",
          )}
        >
          {isSaving ? (
            <span className="i-lucide-loader-2 h-4 w-4 animate-spin" />
          ) : justSaved ? (
            <span className="i-lucide-check h-4 w-4" />
          ) : (
            "保存"
          )}
        </Button>

        {onConfirmHard && (
          <Button
            type="button"
            onClick={onConfirmHard}
            disabled={isSaving || totalAllocated === 0}
            className="h-9 min-w-[4rem] flex-1 bg-purple-600 px-2 font-bold text-white shadow-sm hover:bg-purple-700"
          >
            Hard
          </Button>
        )}
      </div>
    </div>
  );
}
