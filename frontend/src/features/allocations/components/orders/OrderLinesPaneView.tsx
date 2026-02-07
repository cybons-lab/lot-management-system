import { Badge } from "@/components/ui";
import { Progress } from "@/components/ui";
import { cn } from "@/shared/libs/utils";
import type { OrderLine } from "@/shared/types/aliases";
import { formatDate } from "@/shared/utils/date";
import { formatQuantity } from "@/shared/utils/formatQuantity";

export interface OrderLineDisplay {
  line: OrderLine;
  isSelected: boolean;
  isExpanded: boolean;
  showLowStockBadge: boolean;
  deliveryPlaceDisplay: string;
  requiredQty: number;
  dbAllocated: number;
  uiAllocated: number;
  allocatedQty: number;
  remainingQty: number;
  progressPercent: number;
}

interface OrderLinesPaneViewProps {
  displayLines: OrderLineDisplay[];
  orderLinesCount: number;
  renderInlineLots: boolean;
  inlineLotContent?: ((line: OrderLine) => React.ReactNode) | undefined;
  onLineClick: (line: OrderLine) => void;
  isLoading?: boolean;
  error?: Error | null;
}

export function OrderLinesPaneView({
  displayLines,
  orderLinesCount,
  renderInlineLots,
  inlineLotContent,
  onLineClick,
  isLoading = false,
  error = null,
}: OrderLinesPaneViewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 overflow-y-auto border-r bg-white p-4">
        <div className="text-center text-sm text-gray-500">明細を読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3 overflow-y-auto border-r bg-white p-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-semibold text-red-800">明細の取得に失敗</p>
          <p className="mt-1 text-xs text-red-600">
            {error instanceof Error ? error.message : "サーバーエラー"}
          </p>
        </div>
      </div>
    );
  }

  if (displayLines.length === 0) {
    return (
      <div className="flex flex-col gap-3 overflow-y-auto border-r bg-white p-4">
        <div className="text-center text-sm text-gray-500">
          明細がありません。受注を選択してください。
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto border-r bg-white p-4">
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-gray-900">受注明細</h2>
        <p className="text-xs text-gray-500">{orderLinesCount}行</p>
      </div>

      <div className="space-y-2">
        {displayLines.map((lineDisplay) => {
          const {
            line,
            isSelected,
            isExpanded,
            showLowStockBadge,
            deliveryPlaceDisplay,
            requiredQty,

            uiAllocated,
            allocatedQty,
            remainingQty,
            progressPercent,
          } = lineDisplay;

          return (
            <div key={line.id} className="rounded-lg">
              <button
                type="button"
                onClick={() => onLineClick(line)}
                className={cn(
                  "group relative w-full rounded-lg border bg-white p-4 text-left shadow-sm",
                  "transition-all duration-150 ease-in-out",
                  "hover:border-blue-300 hover:shadow-md",
                  isSelected
                    ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500 ring-offset-1"
                    : "border-gray-200",
                )}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">
                      #{line.line_no || line.id}
                    </span>
                    {showLowStockBadge && (
                      <Badge variant="destructive" className="text-xs">
                        ⚠ 在庫不足
                      </Badge>
                    )}
                  </div>

                  {renderInlineLots && (
                    <span className="text-gray-400">{isExpanded ? "▼" : "▶"}</span>
                  )}
                </div>

                <div className="mb-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {line.product_code || `製品ID: ${line.supplier_item_id}`}
                  </p>
                  {line.product_name && (
                    <p className="mt-1 text-xs text-gray-600">{line.product_name}</p>
                  )}
                </div>

                <div className="mb-3 space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-500">納期</span>
                    <span className="font-medium text-gray-700">
                      {formatDate(line.delivery_date || line.due_date, { fallback: "未設定" })}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">納入先</span>
                    <span className="font-medium text-gray-700">{deliveryPlaceDisplay}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500">必要数量</div>
                    <div className="mt-1 font-semibold text-gray-900">
                      {formatQuantity(requiredQty, line.unit || "PCS")}{" "}
                      <span className="text-xs font-normal text-gray-500">{line.unit}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">引当済</div>
                    <div className="mt-1 font-semibold text-blue-600">
                      {formatQuantity(allocatedQty, line.unit || "PCS")}
                    </div>
                    {uiAllocated > 0 && (
                      <p className="text-[11px] text-gray-500">
                        仮入力: +{formatQuantity(uiAllocated, line.unit || "PCS")}
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="text-gray-500">残り</div>
                    <div
                      className={cn(
                        "mt-1 font-semibold",
                        remainingQty > 0 ? "text-red-600" : "text-green-600",
                      )}
                    >
                      {formatQuantity(remainingQty, line.unit || "PCS")}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                    <span>引当進捗</span>
                    <span className="font-medium">{Math.round(progressPercent)}%</span>
                  </div>
                  <Progress
                    value={progressPercent}
                    className={cn(
                      "h-2",
                      allocatedQty >= requiredQty ? "bg-green-200" : "bg-gray-200",
                    )}
                  />
                </div>

                {isSelected && (
                  <div className="absolute top-0 left-0 h-full w-1 rounded-l-lg bg-blue-500" />
                )}
              </button>

              {renderInlineLots && isExpanded && inlineLotContent && (
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-inner">
                  {inlineLotContent(line)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
