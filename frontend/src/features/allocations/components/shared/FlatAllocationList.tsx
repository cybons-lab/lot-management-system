import { useState } from "react";

import type { LineStatus } from "../../hooks/useLotAllocation";
import { AllocationRowContainer } from "../lots/AllocationRowContainer";
import * as styles from "./FlatAllocationList.styles";

// フックのパスは環境に合わせて調整してください
import type { OrderWithLinesResponse } from "@/shared/types/aliases";

// --- Main Component ---

interface FlatAllocationListProps {
  orders: OrderWithLinesResponse[];
  customerMap?: Record<number, string>;
  productMap?: Record<number, string>;
  getLineAllocations: (lineId: number) => Record<number, number>;
  onLotAllocationChange: (lineId: number, lotId: number, quantity: number) => void;
  onAutoAllocate: (lineId: number) => void;
  onClearAllocations: (lineId: number) => void;
  onSaveAllocations: (lineId: number) => void;
  isLoading?: boolean;

  // 新規追加
  lineStatuses: Record<number, LineStatus>;
  isOverAllocated: (lineId: number) => boolean;
}

export function FlatAllocationList({
  orders,
  customerMap = {},
  productMap = {},
  getLineAllocations,
  onLotAllocationChange,
  onAutoAllocate,
  onClearAllocations,
  onSaveAllocations,
  isLoading = false,
  lineStatuses,
  isOverAllocated,
}: FlatAllocationListProps) {
  // ★追加: 現在アクティブな行IDを管理するステート
  const [activeLineId, setActiveLineId] = useState<number | null>(null);

  const getCustomerName = (order: OrderWithLinesResponse) => {
    if (order.customer_id) {
      return customerMap[order.customer_id] || order.customer_name || "顧客未設定";
    }
    return order.customer_name || "顧客未設定";
  };

  const getProductName = (line: any) => {
    if (line.product_id) {
      return productMap[line.product_id] || line.product_name || "商品名不明";
    }
    return line.product_name || "商品名不明";
  };

  if (isLoading) return <div className={styles.loadingMessage}>データを読み込み中...</div>;
  if (orders.length === 0)
    return <div className={styles.emptyMessage}>表示対象の受注がありません</div>;

  return (
    <div className={styles.listContainer}>
      {/* 受注ごとにループし、Order Cardとして表示 */}
      {orders.map((order) => {
        if (!order.lines || order.lines.length === 0) return null;

        const customerName = getCustomerName(order);

        return (
          <div
            key={order.id}
            className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Order Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3">
              <div className="flex items-center gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-gray-500">ORDER</span>
                  <span className="font-mono text-lg font-bold text-gray-900">
                    {order.order_number}
                  </span>
                </div>
                <div className="h-4 w-px bg-gray-300" />
                <div className="flex items-center gap-2">
                  <span className="i-lucide-building-2 h-4 w-4 text-gray-400" />
                  <span className="font-bold text-gray-800">{customerName}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="i-lucide-calendar h-4 w-4 text-gray-400" />
                  <span>受注日: {order.order_date}</span>
                </div>
                <div className="rounded-full bg-gray-200 px-3 py-1 text-xs font-bold text-gray-600">
                  {order.lines.length} items
                </div>
              </div>
            </div>

            {/* Lines List (Indented) */}
            <div className="space-y-4 bg-gray-50/30 p-6">
              {order.lines.map((line) => {
                if (!line.id) return null;

                const productName = getProductName(line);

                return (
                  <div key={line.id} className="pl-4">
                    <AllocationRowContainer
                      order={order}
                      line={line}
                      customerName={customerName}
                      productName={productName}
                      getLineAllocations={getLineAllocations}
                      onLotAllocationChange={onLotAllocationChange}
                      onAutoAllocate={onAutoAllocate}
                      onClearAllocations={onClearAllocations}
                      onSaveAllocations={onSaveAllocations}
                      lineStatus={lineStatuses[line.id] || "clean"}
                      isOverAllocated={isOverAllocated(line.id)}
                      isActive={activeLineId === line.id}
                      onActivate={() => setActiveLineId(line.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
