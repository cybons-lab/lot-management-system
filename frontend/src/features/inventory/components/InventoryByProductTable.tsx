/**
 * InventoryByProductTable - Aggregated inventory by product.
 * Refactored to use DataTable component.
 */
import { useMemo } from "react";

import type { InventoryByProductResponse } from "../types/InventoryAggregationTypes";

import { Button } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";
import { fmt } from "@/shared/utils/number";

interface InventoryByProductTableProps {
  data: InventoryByProductResponse[];
  onRowClick?: (productCode: string) => void;
  onViewDetail?: (productId: number) => void;
}

// eslint-disable-next-line max-lines-per-function
export function InventoryByProductTable({
  data,
  onRowClick,
  onViewDetail,
}: InventoryByProductTableProps) {
  // 列定義
  const columns = useMemo<Column<InventoryByProductResponse>[]>(
    () => [
      {
        id: "product_code",
        header: "先方品番",
        accessor: (row) => row.product_code,
        cell: (row) => <span className="font-medium whitespace-nowrap">{row.product_code}</span>,
        width: 150,
        sortable: true,
      },
      {
        id: "product_name",
        header: "製品名",
        accessor: (row) => row.product_name,
        cell: (row) => <span className="whitespace-nowrap">{row.product_name}</span>,
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
        id: "allocated_quantity",
        header: "引当済",
        accessor: (row) => row.allocated_quantity,
        cell: (row) => <span className="font-mono">{fmt(row.allocated_quantity)}</span>,
        width: 100,
        align: "right",
        sortable: true,
      },
      {
        id: "available_quantity",
        header: "有効在庫",
        accessor: (row) => row.available_quantity,
        cell: (row) => <span className="font-mono">{fmt(row.available_quantity)}</span>,
        width: 120,
        align: "right",
        sortable: true,
      },
      {
        id: "warehouse_count",
        header: "倉庫数",
        accessor: (row) => row.warehouse_count,
        cell: (row) => <span className="font-mono">{row.warehouse_count}</span>,
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
    ? (row: InventoryByProductResponse) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(row.product_id);
          }}
        >
          詳細
        </Button>
      )
    : undefined;

  // 行クリックハンドラー
  const handleRowClick = onRowClick
    ? (row: InventoryByProductResponse) => onRowClick(row.product_code)
    : undefined;

  return (
    <DataTable
      data={data}
      columns={columns}
      getRowId={(row) => row.product_id}
      onRowClick={handleRowClick}
      rowActions={renderRowActions}
      emptyMessage="データがありません"
    />
  );
}
