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
}

const LOT_COLUMNS = [
  {
    id: "lot_number",
    header: "ロット番号",
    accessor: (row: LotUI) => (
      <span className="font-medium text-gray-900">{row.lot_number}</span>
    ),
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
}: InventoryLotListProps) {
  const columns = useMemo(() => LOT_COLUMNS, []);

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
          />
        )}
        headerSlot={
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            ロット一覧 ({lots.length}件)
          </h4>
        }
        enableVirtualization
        scrollAreaHeight="400px"
      />
    </div>
  );
}
