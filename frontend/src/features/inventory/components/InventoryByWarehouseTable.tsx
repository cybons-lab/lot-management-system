/**
 * InventoryByWarehouseTable - Aggregated inventory by warehouse.
 * Refactored to use DataTable component.
 */
import { useMemo } from "react";

import type { InventoryByWarehouseResponse } from "../api";

import { Button } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";
import { fmt } from "@/shared/utils/number";

interface InventoryByWarehouseTableProps {
  data: InventoryByWarehouseResponse[];
  onRowClick?: (warehouseCode: string) => void;
  onViewDetail?: (warehouseId: number) => void;
}

// eslint-disable-next-line max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため
export function InventoryByWarehouseTable({
  data,
  onRowClick,
  onViewDetail,
}: InventoryByWarehouseTableProps) {
  // 列定義
  const columns = useMemo<Column<InventoryByWarehouseResponse>[]>(
    () => [
      {
        id: "warehouse_code",
        header: "倉庫コード",
        accessor: (row) => row.warehouse_code,
        cell: (row) => <span className="font-medium whitespace-nowrap">{row.warehouse_code}</span>,
        width: 140,
        sortable: true,
      },
      {
        id: "warehouse_name",
        header: "倉庫名",
        accessor: (row) => row.warehouse_name,
        cell: (row) => <span className="whitespace-nowrap">{row.warehouse_name}</span>,
        width: 200,
        sortable: true,
      },
      {
        id: "total_quantity",
        header: "総在庫数",
        accessor: (row) => row.total_quantity,
        cell: (row) => <span className="font-mono">{fmt(row.total_quantity)}</span>,
        width: 120,
        align: "right",
        sortable: true,
      },
      {
        id: "product_count",
        header: "製品数",
        accessor: (row) => row.product_count,
        cell: (row) => <span className="font-mono">{row.product_count}</span>,
        width: 100,
        align: "right",
        sortable: true,
      },
      {
        id: "lot_count",
        header: "ロット数",
        accessor: (row) => row.lot_count,
        cell: (row) => <span className="font-mono">{row.lot_count}</span>,
        width: 100,
        align: "right",
        sortable: true,
      },
    ],
    [],
  );

  // アクションボタン
  const renderRowActions = onViewDetail
    ? (row: InventoryByWarehouseResponse) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(row.warehouse_id);
          }}
        >
          詳細
        </Button>
      )
    : undefined;

  // 行クリックハンドラー
  const handleRowClick = onRowClick
    ? (row: InventoryByWarehouseResponse) => onRowClick(row.warehouse_code)
    : undefined;

  return (
    <DataTable
      data={data}
      columns={columns}
      getRowId={(row) => row.warehouse_id}
      onRowClick={handleRowClick}
      rowActions={renderRowActions}
      emptyMessage="データがありません"
    />
  );
}
