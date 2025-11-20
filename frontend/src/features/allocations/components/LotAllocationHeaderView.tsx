import { Button } from "@/components/ui/button";
import { cn } from "@/shared/libs/utils";

interface LotAllocationHeaderViewProps {
  orderNumber: string;
  customerName: string;
  deliveryPlaceName: string;
  deliveryDate: string;
  productCode: string;
  productName: string;
  requiredQty: number;
  totalAllocated: number;
  remainingQty: number;
  progressPercent: number;
  isOverAllocated: boolean;
  isComplete: boolean;
  justSaved: boolean;
  isSaving: boolean;
  isLoading: boolean;
  hasCandidates: boolean;
  onAutoAllocate: () => void;
  onClearAllocations: () => void;
  onSaveAllocations: () => void;
  canSave: boolean;
}

export function LotAllocationHeaderView({
  orderNumber,
  customerName,
  deliveryPlaceName,
  deliveryDate,
  productCode,
  productName,
  requiredQty,
  totalAllocated,
  remainingQty,
  progressPercent,
  isOverAllocated,
  isComplete,
  justSaved,
  isSaving,
  isLoading,
  hasCandidates,
  onAutoAllocate,
  onClearAllocations,
  onSaveAllocations,
  canSave,
}: LotAllocationHeaderViewProps) {
  return (
    <div className="flex flex-col border-b border-gray-200 bg-white transition-colors duration-300">
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 text-sm text-gray-600 transition-colors duration-300",
          isComplete ? "bg-green-50/80" : "bg-gray-50/50",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">{orderNumber}</span>
        </div>

        <div className="h-4 w-px bg-gray-300" />

        <div className="flex items-center gap-1.5">
          <span className="i-lucide-building h-4 w-4 text-gray-400" />
          <span className="font-medium text-gray-800">{customerName}</span>
        </div>

        <div className="h-4 w-px bg-gray-300" />

        <div className="flex items-center gap-1.5">
          <span className="i-lucide-map-pin h-4 w-4 text-gray-400" />
          <span>{deliveryPlaceName}</span>
        </div>

        <div className="h-4 w-px bg-gray-300" />

        <div className="flex items-center gap-1.5">
          <span className="i-lucide-calendar h-4 w-4 text-gray-400" />
          <span>
            納期: <span className="font-medium text-gray-900">{deliveryDate}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-8">
          <div className="min-w-[200px]">
            <div className="text-xs font-bold text-gray-400">{productCode}</div>
            <div className="text-lg font-bold text-gray-900">{productName}</div>
          </div>

          <div className="flex items-end gap-6">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                必要数量
              </span>
              <div className="text-2xl leading-none font-bold text-gray-900">
                {requiredQty.toLocaleString()}
              </div>
            </div>

            <div className="h-8 w-px bg-gray-100" />

            <div>
              <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                引当合計
              </span>
              <div className="text-2xl leading-none font-bold text-blue-600">
                {totalAllocated.toLocaleString()}
              </div>
            </div>

            <div className="h-8 w-px bg-gray-100" />

            <div>
              <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                残り
              </span>
              <div
                className={cn(
                  "text-2xl leading-none font-bold",
                  remainingQty > 0
                    ? "text-red-600"
                    : remainingQty < 0
                      ? "text-red-600"
                      : "text-green-600",
                )}
              >
                {Math.abs(remainingQty).toLocaleString()}
                {remainingQty < 0 && <span className="ml-1 text-xs text-red-500">(過剰)</span>}
                {remainingQty === 0 && <span className="ml-1 text-xs text-green-600">OK</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onAutoAllocate}
            disabled={isLoading || !hasCandidates || remainingQty <= 0}
            className="h-9"
          >
            自動引当
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClearAllocations}
            disabled={totalAllocated === 0}
            className="h-9 text-gray-500 hover:text-gray-900"
          >
            クリア
          </Button>

          <Button
            type="button"
            onClick={onSaveAllocations}
            disabled={!canSave || isSaving}
            className={cn(
              "ml-2 h-9 min-w-[120px] font-bold shadow-sm transition-all duration-300",
              isOverAllocated && !justSaved && "cursor-not-allowed bg-gray-400",
              !isOverAllocated && !justSaved && "bg-blue-600 hover:bg-blue-700",
              justSaved && "border-green-600 bg-green-600 text-white hover:bg-green-700",
            )}
          >
            {isSaving ? (
              <>
                <span className="i-lucide-loader-2 mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : justSaved ? (
              <>
                <span className="i-lucide-check mr-2 h-4 w-4" />
                保存完了！
              </>
            ) : (
              "保存"
            )}
          </Button>
        </div>
      </div>

      <div className="relative h-1 w-full bg-gray-100">
        <div
          className={cn(
            "absolute top-0 left-0 h-full transition-all duration-500 ease-out",
            remainingQty === 0 ? "bg-green-500" : "bg-blue-500",
            remainingQty < 0 && "bg-red-500",
          )}
          style={{ width: `${Math.min(100, progressPercent)}%` }}
        />
      </div>
    </div>
  );
}
