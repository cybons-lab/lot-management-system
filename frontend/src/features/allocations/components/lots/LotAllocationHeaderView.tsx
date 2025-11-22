import { Button } from "@/components/ui";
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
  supplierName?: string;
  onAutoAllocate: () => void;
  onClearAllocations: () => void;
  onSaveAllocations: () => void;
  canSave: boolean;
  lockedBy?: string;
  lockedAt?: string;
}

export function LotAllocationHeaderView({
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
  supplierName,
  onAutoAllocate,
  onClearAllocations,
  onSaveAllocations,
  canSave,
  lockedBy,
  lockedAt,
}: LotAllocationHeaderViewProps) {
  // Determine status and styles
  const isPartial = totalAllocated > 0 && remainingQty > 0;

  let statusBadge = null;
  let headerBorderColor = "border-gray-200";
  let accentColor = "bg-gray-500"; // Default accent

  if (isOverAllocated) {
    headerBorderColor = "border-red-300";
    accentColor = "bg-red-500";
    statusBadge = (
      <span className="rounded-full border border-red-200 bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
        要調整 (過剰)
      </span>
    );
  } else if (isComplete) {
    headerBorderColor = "border-green-300";
    accentColor = "bg-green-500";
    statusBadge = (
      <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
        仮引当済み
      </span>
    );
  } else if (isPartial) {
    headerBorderColor = "border-yellow-300";
    accentColor = "bg-yellow-500";
    statusBadge = (
      <span className="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700">
        引当中 (不足)
      </span>
    );
  } else {
    statusBadge = (
      <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
        未引当
      </span>
    );
  }

  return (
    <div className={cn("flex flex-col bg-white transition-colors duration-300", headerBorderColor)}>
      {/* Lock Indicator */}
      {lockedBy && (
        <div className="flex items-center justify-center border-b border-yellow-100 bg-yellow-50 px-4 py-1 text-xs font-medium text-yellow-800">
          <span className="i-lucide-lock mr-1 h-3 w-3" />
          {lockedBy}さんが編集中 {lockedAt && `(${lockedAt})`}
        </div>
      )}

      <div className="grid grid-cols-10 gap-4 p-6">
        {/* Left Column: Product Info (40%) -> col-span-4 */}
        <div className="col-span-4 flex flex-col justify-center gap-3 border-r border-gray-100 pr-4">
          {/* 1. Product Name (最上部・大きく) */}
          <div className="flex flex-col gap-1">
            <div className="text-lg leading-tight font-bold text-gray-900">{productName}</div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="i-lucide-box h-3 w-3" />
              <span className="font-mono">{productCode}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            {/* 2. Supplier (仕入元) */}
            {supplierName && (
              <div className="flex items-start gap-2">
                <span className="i-lucide-truck mt-0.5 h-4 w-4 text-gray-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">仕入元</span>
                  <span className="font-medium text-gray-800">{supplierName}</span>
                </div>
              </div>
            )}

            {/* 3. Delivery Place (納入先) */}
            <div className="flex items-start gap-2">
              <span className="i-lucide-map-pin mt-0.5 h-4 w-4 text-gray-400" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase">納入先</span>
                <span className="font-medium text-gray-800">{deliveryPlaceName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Quantity & Status (30%) -> col-span-3 */}
        <div className="col-span-3 flex flex-col justify-center gap-4 border-r border-gray-100 px-4">
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                納期
              </span>
              <div className="flex items-center gap-1.5 font-bold text-gray-800">
                <span className="i-lucide-calendar h-4 w-4 text-gray-400" />
                {deliveryDate}
              </div>
            </div>
            <div className="flex flex-col items-end">{statusBadge}</div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-gray-500">必要数</span>
              <span className="text-2xl font-bold text-gray-900">
                {requiredQty.toLocaleString()}
              </span>
            </div>

            {/* Compact Progress Bar */}
            <div className="flex flex-col gap-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={cn("h-full transition-all duration-500 ease-out", accentColor)}
                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-medium">
                <span className="text-blue-600">引当: {totalAllocated.toLocaleString()}</span>
                <span className={cn(remainingQty > 0 ? "text-red-500" : "text-green-600")}>
                  残: {remainingQty.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Actions (30%) -> col-span-3 */}
        <div className="col-span-3 flex flex-col items-end justify-center gap-3 pl-4">
          <Button
            type="button"
            onClick={onSaveAllocations}
            disabled={!canSave || isSaving}
            className={cn(
              "h-10 w-full font-bold shadow-sm transition-all duration-300",
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
                保存完了
              </>
            ) : (
              "保存"
            )}
          </Button>

          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onAutoAllocate}
              disabled={isLoading || !hasCandidates || remainingQty <= 0}
              className="h-8 flex-1 text-xs"
            >
              自動引当
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClearAllocations}
              disabled={totalAllocated === 0}
              className="h-8 flex-1 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600"
            >
              クリア
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
