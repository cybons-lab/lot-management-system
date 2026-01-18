import { useMemo } from "react";

import { InventoryLotActions } from "./InventoryLotActions";

import { DataTable } from "@/shared/components/data/DataTable";
import type { LotUI } from "@/shared/libs/normalize";
import { formatDecimal, parseDecimal } from "@/shared/utils/decimal";

interface InventoryLotListProps {
  lots: LotUI[];
  isLoading: boolean;
  /** Fallback warehouse name if not in lot data */
  warehouseNameFallback?: string | null;
  onEdit: (lot: LotUI) => void;
  onUnlock: (lot: LotUI) => void;
  onLock: (lot: LotUI) => void;
  onWithdraw: (lot: LotUI) => void;
  onHistory: (lot: LotUI) => void;
  onArchive?: (lot: LotUI) => void;
}

const LOT_COLUMNS = [
  {
    id: "lot_number",
    header: "ロット番号",
    accessor: (row: LotUI) => <span className="font-medium text-gray-900">{row.lot_number}</span>,
  },
  {
    id: "current_quantity",
    header: "現在在庫",
    accessor: (row: LotUI) => (
      <span className="font-semibold text-gray-900">
        {formatDecimal(parseDecimal(row.current_quantity), 2)}
      </span>
    ),
    align: "right" as const,
  },
  {
    id: "available_quantity",
    header: (
      <span title="利用可能 = 残量 − ロック − 確定引当" className="cursor-help">
        利用可能
      </span>
    ),
    accessor: (row: LotUI) => (
      <span className="font-mono text-gray-700">
        {formatDecimal(parseDecimal(row.available_quantity ?? "0"), 2)}
      </span>
    ),
    align: "right" as const,
  },
  {
    id: "reserved_quantity_active",
    header: "予約（未確定）",
    accessor: (row: LotUI) => (
      <span className="font-mono text-gray-700">
        {formatDecimal(parseDecimal(row.reserved_quantity_active ?? "0"), 2)}
      </span>
    ),
    align: "right" as const,
  },
  {
    id: "allocated_quantity",
    header: "確定引当",
    accessor: (row: LotUI) => (
      <span className="font-mono text-gray-700">
        {formatDecimal(parseDecimal(row.allocated_quantity), 2)}
      </span>
    ),
    align: "right" as const,
  },
  {
    id: "locked_quantity",
    header: "ロック",
    accessor: (row: LotUI) => (
      <span className="font-mono text-gray-700">
        {formatDecimal(parseDecimal(row.locked_quantity ?? "0"), 2)}
      </span>
    ),
    align: "right" as const,
  },
  {
    id: "unit",
    header: "単位",
    accessor: (row: LotUI) => <span className="text-gray-600">{row.unit}</span>,
  },
  {
    id: "received_date",
    header: "入荷日",
    accessor: (row: LotUI) => (
      <span className="text-gray-600">
        {row.received_date && !isNaN(new Date(row.received_date).getTime())
          ? new Date(row.received_date).toLocaleDateString("ja-JP")
          : "-"}
      </span>
    ),
  },
  {
    id: "expiry_date",
    header: "有効期限",
    accessor: (row: LotUI) => (
      <span className="text-gray-600">
        {row.expiry_date && !isNaN(new Date(row.expiry_date).getTime())
          ? new Date(row.expiry_date).toLocaleDateString("ja-JP")
          : "-"}
      </span>
    ),
  },
  {
    id: "status",
    header: "ステータス",
    accessor: (row: LotUI) => (
      <span className="text-xs text-gray-500">
        {Number(row.locked_quantity || 0) > 0 ? "ロック中" : "利用可"}
      </span>
    ),
  },
];

export function InventoryLotList({
  lots,
  isLoading,
  warehouseNameFallback,
  onEdit,
  onUnlock,
  onLock,
  onWithdraw,
  onHistory,
  onArchive,
}: InventoryLotListProps) {
  const columns = useMemo(() => LOT_COLUMNS, []);

  // ロット数に応じて高さを動的に計算
  // ヘッダー行 (50px) + ロット行 (各60px) + 下パディング (5px)
  // 最大400pxまで
  const scrollAreaHeight = useMemo(() => {
    const headerHeight = 50;
    const rowHeight = 60;
    const bottomPadding = 5;
    const calculatedHeight = headerHeight + lots.length * rowHeight + bottomPadding;
    return `${Math.min(calculatedHeight, 400)}px`;
  }, [lots.length]);

  return (
    <div className="px-8 py-4">
      <DataTable
        data={lots}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="ロットがありません"
        getRowId={(row) => row.id}
        rowActions={(lot) => (
          <InventoryLotActions
            lot={lot}
            warehouseNameFallback={warehouseNameFallback}
            onEdit={onEdit}
            onUnlock={onUnlock}
            onLock={onLock}
            onWithdraw={onWithdraw}
            onHistory={onHistory}
            onArchive={onArchive}
          />
        )}
        headerSlot={
          <h4 className="mb-3 text-sm font-semibold text-gray-700">ロット一覧 ({lots.length}件)</h4>
        }
        enableVirtualization
        scrollAreaHeight={scrollAreaHeight}
      />
    </div>
  );
}
