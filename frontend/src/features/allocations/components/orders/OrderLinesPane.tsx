/**
 * OrderLinesPane - 受注明細一覧ペイン（3カラムレイアウトの中カラム）
 *
 * 機能:
 * - 選択中の受注の明細行を表示
 * - 選択中の行をハイライト表示（背景色＋軽いアニメーション）
 * - 在庫不足の行に警告バッジ表示
 * - renderInlineLots が true の場合、行を展開してロット引当パネルをインライン表示
 */

import { useMemo, useState } from "react";

import type { OrderLineDisplay } from "./OrderLinesPaneView";
import { OrderLinesPaneView } from "./OrderLinesPaneView";

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
  renderInlineLots = false,
  lineStockStatus = {},
  inlineLotContent,
  isLoading = false,
  error = null,
}: OrderLinesPaneProps) {
  const [expandedLineId, setExpandedLineId] = useState<number | null>(null);



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

    return "未設定";
  };

  const displayLines: OrderLineDisplay[] = useMemo(() => {
    const stockStatusMap = lineStockStatus ?? {};
    return orderLines.map((line) => {
      const isSelected = line.id === selectedOrderLineId;
      const isExpanded = renderInlineLots && expandedLineId === line.id;
      const showLowStockBadge = Boolean(line.id && stockStatusMap[line.id]?.hasShortage);
      const status = line.id ? stockStatusMap[line.id] : undefined;
      const requiredQty = status?.requiredQty ?? Number(line.order_quantity ?? line.quantity ?? 0);
      const dbAllocated =
        status?.dbAllocated ?? Number(line.allocated_qty ?? line.allocated_quantity ?? 0);
      const uiAllocated = status?.uiAllocated ?? 0;
      const allocatedQty = dbAllocated + uiAllocated;
      const remainingQty = status?.remainingQty ?? Math.max(0, requiredQty - allocatedQty);
      const progressPercent =
        status?.progress ??
        (requiredQty > 0 ? Math.min(100, (allocatedQty / requiredQty) * 100) : 0);
      const deliveryPlaceDisplay = getDeliveryPlaceLabel(line);

      return {
        line,
        isSelected,
        isExpanded,
        showLowStockBadge,
        deliveryPlaceDisplay,
        requiredQty,
        dbAllocated,
        uiAllocated,
        allocatedQty,
        remainingQty,
        progressPercent,
      };
    });
  }, [expandedLineId, orderLines, renderInlineLots, selectedOrderLineId, lineStockStatus]);

  const handleLineClick = (line: OrderLine) => {
    if (!line.id) return;

    onSelectOrderLine(line.id);

    if (renderInlineLots) {
      setExpandedLineId((prev) => (prev === line.id ? null : line.id));
    }
  };

  return (
    <OrderLinesPaneView
      displayLines={displayLines}
      orderLinesCount={orderLines.length}
      renderInlineLots={renderInlineLots}
      inlineLotContent={inlineLotContent}
      onLineClick={handleLineClick}
      isLoading={isLoading}
      error={error}
    />
  );
}
