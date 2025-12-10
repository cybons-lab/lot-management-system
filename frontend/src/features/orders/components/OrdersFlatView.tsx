import { useState } from "react";

import { AllocationDialog } from "./AllocationDialog";
import { createOrderLineColumns } from "./OrderLineColumns";

import type { OrderLineRow } from "@/features/orders/hooks/useOrderLines";
import { DataTable } from "@/shared/components/data/DataTable";

interface OrdersFlatViewProps {
  lines: OrderLineRow[];
  isLoading: boolean;
  onRefresh?: () => void;
}

/**
 * フラット表示ビュー（1行単位）
 *
 * - 引当ダイアログを一覧から直接開ける
 * - 詳細ページへの遷移は不要に
 */
export function OrdersFlatView({ lines, isLoading, onRefresh }: OrdersFlatViewProps) {
  const [selectedLine, setSelectedLine] = useState<OrderLineRow | null>(null);

  // 引当ボタンクリック時にダイアログを開く
  const handleAllocate = (row: OrderLineRow) => {
    setSelectedLine(row);
  };

  // カラム定義（引当ボタンのコールバックを渡す）
  const columns = createOrderLineColumns({ onAllocate: handleAllocate });

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <DataTable
        data={lines}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="明細がありません"
      />

      {/* 引当ダイアログ */}
      <AllocationDialog
        line={selectedLine}
        onClose={() => setSelectedLine(null)}
        onSuccess={() => {
          setSelectedLine(null);
          onRefresh?.();
        }}
      />
    </div>
  );
}
