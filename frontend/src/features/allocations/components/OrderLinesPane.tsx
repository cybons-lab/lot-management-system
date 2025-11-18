/**
 * OrderLinesPane - 受注明細一覧ペイン（3カラムレイアウトの中カラム）
 *
 * 機能:
 * - 選択中の受注の明細行を表示
 * - 選択中の行をハイライト表示（背景色＋軽いアニメーション）
 * - 在庫不足の行に警告バッジ表示
 * - renderInlineLots が true の場合、行を展開してロット引当パネルをインライン表示
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/shared/libs/utils";
import { formatDate } from "@/shared/utils/date";
import type { OrderLine, OrderWithLinesResponse } from "@/shared/types/aliases";

export interface OrderLineStockStatus {
  hasShortage: boolean;
  totalAvailable: number | null;
  requiredQty: number;
  dbAllocated: number;
  uiAllocated: number;
  remainingQty: number;
  progress: number;
}

interface OrderLinesPaneProps {
  orderLines: OrderLine[];
  selectedOrderLineId: number | null;
  onSelectOrderLine: (lineId: number) => void;
  orderDetail?: OrderWithLinesResponse | null;
  renderInlineLots?: boolean;
  lineStockStatus?: Record<number, OrderLineStockStatus>;
  inlineLotContent?: (line: OrderLine) => React.ReactNode;
  isLoading?: boolean;
  error?: Error | null;
}

export function OrderLinesPane({
  orderLines,
  selectedOrderLineId,
  onSelectOrderLine,
  orderDetail = null,
  renderInlineLots = false,
  lineStockStatus = {},
  inlineLotContent,
  isLoading = false,
  error = null,
}: OrderLinesPaneProps) {
  // インライン展開状態（renderInlineLots が true の場合のみ使用）
  const [expandedLineId, setExpandedLineId] = useState<number | null>(null);

  const stockStatusMap = lineStockStatus ?? {};

  // 在庫不足判定（lineStockStatusマップを使用）
  const isLowStock = (line: OrderLine) => {
    if (!line.id) return false;
    return stockStatusMap[line.id]?.hasShortage ?? false;
  };

  const getDeliveryPlaceLabel = (line: OrderLine) => {
    const lineCode = line.delivery_place_code ?? null;
    const lineName = line.delivery_place_name ?? null;
    if (lineCode || lineName) {
      return lineCode && lineName
        ? `${lineCode} / ${lineName}`
        : (lineCode ?? lineName ?? "未設定");
    }

    if (line.delivery_place) {
      return line.delivery_place;
    }

    const orderCode = orderDetail?.delivery_place_code ?? null;
    const orderName = orderDetail?.delivery_place_name ?? null;
    if (orderCode || orderName) {
      return orderCode && orderName
        ? `${orderCode} / ${orderName}`
        : (orderCode ?? orderName ?? "未設定");
    }

    if (orderDetail?.delivery_place) {
      return orderDetail.delivery_place;
    }

    return "未設定";
  };

  const handleLineClick = (line: OrderLine) => {
    if (!line.id) return;

    onSelectOrderLine(line.id);

    // インラインモードの場合、展開/折りたたみを切り替え
    if (renderInlineLots) {
      setExpandedLineId((prev) => (prev === line.id ? null : line.id));
    }
  };

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

  if (orderLines.length === 0) {
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
        <p className="text-xs text-gray-500">{orderLines.length}行</p>
      </div>

      <div className="space-y-2">
        {orderLines.map((line) => {
          const isSelected = line.id === selectedOrderLineId;
          const isExpanded = renderInlineLots && expandedLineId === line.id;
          const showLowStockBadge = isLowStock(line);
          const status = line.id ? stockStatusMap[line.id] : undefined;
          const requiredQty =
            status?.requiredQty ?? Number(line.order_quantity ?? line.quantity ?? 0);
          const dbAllocated =
            status?.dbAllocated ?? Number(line.allocated_qty ?? line.allocated_quantity ?? 0);
          const uiAllocated = status?.uiAllocated ?? 0;
          const allocatedQty = dbAllocated + uiAllocated;
          const remainingQty = status?.remainingQty ?? Math.max(0, requiredQty - allocatedQty);
          const progressPercent =
            status?.progress ??
            (requiredQty > 0 ? Math.min(100, (allocatedQty / requiredQty) * 100) : 0);
          const deliveryPlaceDisplay = getDeliveryPlaceLabel(line);

          return (
            <div key={line.id} className="rounded-lg">
              {/* 明細行本体 */}
              <button
                type="button"
                onClick={() => handleLineClick(line)}
                className={cn(
                  "group relative w-full rounded-lg border bg-white p-4 text-left shadow-sm",
                  "transition-all duration-150 ease-in-out",
                  "hover:border-blue-300 hover:shadow-md",
                  isSelected
                    ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500 ring-offset-1"
                    : "border-gray-200",
                )}
              >
                {/* 行番号と在庫不足バッジ */}
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

                  {/* 展開アイコン（インラインモード時） */}
                  {renderInlineLots && (
                    <span className="text-gray-400">{isExpanded ? "▼" : "▶"}</span>
                  )}
                </div>

                {/* 製品情報 */}
                <div className="mb-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {line.product_code || `製品ID: ${line.product_id}`}
                  </p>
                  {line.product_name && (
                    <p className="mt-1 text-xs text-gray-600">{line.product_name}</p>
                  )}
                </div>

                {/* 納期・納入先情報 */}
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

                {/* 数量情報 */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500">必要数量</div>
                    <div className="mt-1 font-semibold text-gray-900">
                      {requiredQty.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">引当済</div>
                    <div className="mt-1 font-semibold text-blue-600">
                      {allocatedQty.toLocaleString()}
                    </div>
                    {uiAllocated > 0 && (
                      <p className="text-[11px] text-gray-500">
                        仮入力: +{uiAllocated.toLocaleString()}
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
                      {remainingQty.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 進捗バー */}
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

                {/* 選択インジケーター */}
                {isSelected && (
                  <div className="absolute top-0 left-0 h-full w-1 rounded-l-lg bg-blue-500" />
                )}
              </button>

              {/* インライン展開コンテンツ（インラインモード時のみ） */}
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
