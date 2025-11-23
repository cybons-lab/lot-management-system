import { Button } from "@/components/ui";
import { cn } from "@/shared/libs/utils";
import { formatQuantity } from "@/shared/utils/formatQuantity";
import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";

interface LotAllocationHeaderViewProps {
  orderNumber: string;
  customerName: string;
  deliveryPlaceName: string;
  deliveryDate: string;
  productCode: string;
  productName: string;
  orderUnit: string;
  inventoryUnit: string;
  orderQuantity: number;
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
  // New props
  allocationCount?: number;
  hasExpiryWarning?: boolean;
  hasExpiredError?: boolean;
  lineStatus?: string | null;
}

export function LotAllocationHeaderView({
  deliveryPlaceName,
  deliveryDate,
  productCode,
  productName,
  orderUnit,
  inventoryUnit,
  orderQuantity,
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
  allocationCount = 0,
  hasExpiryWarning = false,
  hasExpiredError = false,
  lineStatus,
}: LotAllocationHeaderViewProps) {
  // Determine status and styles
  const isPartial = totalAllocated > 0 && remainingQty > 0;

  // Main Status Badge Logic
  let mainStatusBadge = null;
  let statusColorClass = "bg-gray-100 text-gray-600 border-gray-200"; // Default: Unallocated

  if (isOverAllocated) {
    statusColorClass = "bg-orange-100 text-orange-800 border-orange-200";
    mainStatusBadge = (
      <div
        className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5", statusColorClass)}
      >
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-bold">在庫過剰</span>
      </div>
    );
  } else if (isComplete) {
    // Check for confirmed status based on backend data OR immediate save success
    const isConfirmed =
      lineStatus === "allocated" || lineStatus === "completed" || (justSaved && canSave === false);

    if (isConfirmed) {
      // Complete and Saved (Confirmed)
      statusColorClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
      mainStatusBadge = (
        <div
          className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5", statusColorClass)}
        >
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-bold">引当確定</span>
        </div>
      );
    } else {
      // Complete but Unsaved (Draft)
      statusColorClass = "bg-indigo-100 text-indigo-800 border-indigo-200";
      mainStatusBadge = (
        <div
          className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5", statusColorClass)}
        >
          <span className="i-lucide-pencil h-4 w-4" />
          <span className="text-sm font-bold">仮引当完了</span>
        </div>
      );
    }
  } else if (isPartial) {
    statusColorClass = "bg-amber-100 text-amber-800 border-amber-200";
    mainStatusBadge = (
      <div
        className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5", statusColorClass)}
      >
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-bold">一部引当</span>
      </div>
    );
  } else {
    // Unallocated
    mainStatusBadge = (
      <div
        className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5", statusColorClass)}
      >
        <span className="i-lucide-circle-dashed h-4 w-4" />
        <span className="text-sm font-bold">未引当</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white transition-colors duration-300">
      {/* Lock Indicator */}
      {lockedBy && (
        <div className="flex items-center justify-center border-b border-yellow-100 bg-yellow-50 px-4 py-1 text-xs font-medium text-yellow-800">
          <span className="i-lucide-lock mr-1 h-3 w-3" />
          {lockedBy}さんが編集中 {lockedAt && `(${lockedAt})`}
        </div>
      )}

      <div className="flex flex-col gap-4 p-6">
        {/* 1行目: 商品ヘッダー (全幅) */}
        <div className="flex items-center gap-4 border-b border-gray-100 pb-3">
          {/* 商品コードバッジ */}
          <div className="flex items-center gap-2 rounded bg-gray-100 px-2 py-1 font-mono text-xs font-medium text-gray-600">
            <span className="i-lucide-barcode h-3.5 w-3.5" />
            {productCode}
          </div>
          {/* 商品名 */}
          <div className="flex items-center gap-2">
            <span className="i-lucide-package h-5 w-5 text-gray-400" />
            <h2 className="text-xl leading-tight font-bold text-gray-900">{productName}</h2>
          </div>
        </div>

        {/* 2行目: 3カラムレイアウト */}
        <div className="grid grid-cols-12 gap-6">
          {/* 左カラム: 注文コンテキスト (約30%) */}
          <div className="col-span-4 flex flex-col gap-3">
            {/* Supplier */}
            {supplierName && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                  仕入元
                </span>
                <div className="flex items-center gap-2">
                  <span className="i-lucide-truck h-3.5 w-3.5 text-gray-400" />
                  <span className="font-medium text-gray-800">{supplierName}</span>
                </div>
              </div>
            )}

            {/* Delivery Place */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                納入先
              </span>
              <div className="flex items-center gap-2">
                <span className="i-lucide-map-pin h-3.5 w-3.5 text-gray-400" />
                <span className="font-medium text-gray-800">{deliveryPlaceName}</span>
              </div>
            </div>

            {/* Delivery Date */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                納期
              </span>
              <div className="flex items-center gap-2">
                <span className="i-lucide-calendar h-3.5 w-3.5 text-gray-400" />
                <span className="font-bold text-gray-800">{deliveryDate}</span>
              </div>
            </div>
          </div>

          {/* 中央カラム: 数量 & アクション (約40%) */}
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
                自動引当
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
                  "確定"
                )}
              </Button>
            </div>
          </div>

          {/* 右カラム: ステータス (約30%) */}
          <div className="col-span-3 flex flex-col gap-4 pl-2">
            {/* Main Status Badge */}
            <div>{mainStatusBadge}</div>

            {/* Info Tags (将来的に増える想定) */}
            <div className="flex flex-col gap-2">
              {allocationCount > 1 && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="i-lucide-layers h-3.5 w-3.5 text-gray-400" />
                  <span>複数ロット引当 ({allocationCount})</span>
                </div>
              )}

              {hasExpiredError && (
                <div className="flex items-center gap-2 text-xs font-medium text-red-600">
                  <span className="i-lucide-alert-octagon h-3.5 w-3.5" />
                  <span>期限切れロットあり</span>
                </div>
              )}

              {hasExpiryWarning && (
                <div className="flex items-center gap-2 text-xs font-medium text-amber-600">
                  <span className="i-lucide-alert-triangle h-3.5 w-3.5" />
                  <span>期限切迫ロットあり</span>
                </div>
              )}

              {!hasCandidates && (
                <div className="flex items-center gap-2 text-xs font-medium text-red-600">
                  <span className="i-lucide-alert-circle h-3.5 w-3.5" />
                  <span>引当候補なし</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
