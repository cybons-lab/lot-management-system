import { useState } from "react";

import { useAllocationCandidates } from "../../hooks/api";
import type { LineStatus } from "../../hooks/useLotAllocation";
import { LotAllocationPanel } from "../lots/LotAllocationPanel";

// フックのパスは環境に合わせて調整してください
import type { OrderWithLinesResponse } from "@/shared/types/aliases";

// --- Smart Component ---
// 各行が自律的にデータを取得するためのラッパー
interface SmartAllocationRowProps {
  order: OrderWithLinesResponse; // 親から受け取る
  line: any; // 型定義が循環する場合は any または OrderLine を使用
  // 親から受け取る操作系プロップス
  getLineAllocations: (lineId: number) => Record<number, number>;
  onLotAllocationChange: (lineId: number, lotId: number, quantity: number) => void;
  onAutoAllocate: (lineId: number) => void;
  onClearAllocations: (lineId: number) => void;
  onSaveAllocations: (lineId: number) => void;

  // ステータス系
  lineStatus: LineStatus;
  isOverAllocated: boolean;

  // 名称解決
  customerName?: string;
  productName?: string;

  // ★追加: スポットライト制御用
  isActive: boolean;
  onActivate: () => void;
}

function SmartAllocationRow({
  order,
  line,
  getLineAllocations,
  onLotAllocationChange,
  onAutoAllocate,
  onClearAllocations,
  onSaveAllocations,
  lineStatus,
  isOverAllocated,
  customerName,
  productName,
  isActive, // ★受け取る
  onActivate, // ★受け取る
}: SmartAllocationRowProps) {
  // ★ここで実際のデータを取得します
  const { data, isLoading, error } = useAllocationCandidates({
    order_line_id: line.id,
    strategy: "fefo",
    limit: 200,
  });

  const candidateLots = data?.items ?? [];
  const currentAllocations = getLineAllocations(line.id);

  // 保存可能条件: ステータスが draft かつ 過剰引当でない
  const canSave = lineStatus === "draft" && !isOverAllocated;

  return (
    <LotAllocationPanel
      order={order}
      orderLine={line}
      // 親で解決した顧客名を渡す（LotAllocationPanel側で優先利用される）
      customerName={customerName}
      productName={productName}
      candidateLots={candidateLots}
      lotAllocations={currentAllocations}
      onLotAllocationChange={(lotId, qty) => onLotAllocationChange(line.id, lotId, qty)}
      onAutoAllocate={() => onAutoAllocate(line.id)}
      onClearAllocations={() => onClearAllocations(line.id)}
      onSaveAllocations={() => onSaveAllocations(line.id)}
      canSave={canSave}
      isOverAllocated={isOverAllocated}
      isLoading={isLoading}
      error={error as Error}
      // ★そのまま流す
      isActive={isActive}
      onActivate={onActivate}
    />
  );
}

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

  if (isLoading) return <div className="p-8 text-center text-gray-500">データを読み込み中...</div>;
  if (orders.length === 0)
    return <div className="p-8 text-center text-gray-500">表示対象の受注がありません</div>;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-4 pb-20">
      {/* 受注ごとにループするが、表示上はカードの積み重ねにする */}
      {orders.map((order) => {
        if (!order.lines || order.lines.length === 0) return null;

        const customerName = getCustomerName(order);

        return (
          <div key={order.id} className="space-y-6">
            {/* Order Header は削除し、各カードに情報を統合する */}

            {/* Lines List */}
            <div className="space-y-6">
              {order.lines.map((line) => {
                if (!line.id) return null;

                const productName = getProductName(line);

                return (
                  <SmartAllocationRow
                    key={line.id}
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
                    // ★ここで親子通信を行う
                    isActive={activeLineId === line.id}
                    onActivate={() => setActiveLineId(line.id)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
