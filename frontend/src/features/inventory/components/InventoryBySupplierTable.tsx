/**
 * InventoryBySupplierTable - Aggregated inventory by supplier.
 * Refactored to use DataTable component.
 */
import { useMemo } from "react";

import type { InventoryBySupplierResponse } from "../api";

import { Button } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";
import { fmt } from "@/shared/utils/number";

interface InventoryBySupplierTableProps {
  data: InventoryBySupplierResponse[];
  onRowClick?: (supplierCode: string) => void;
  onViewDetail?: (supplierId: number) => void;
}

// eslint-disable-next-line max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため
export function InventoryBySupplierTable({
  data,
  onRowClick,
  onViewDetail,
}: InventoryBySupplierTableProps) {
  // 列定義
  const columns = useMemo<Column<InventoryBySupplierResponse>[]>(
    () => [
      {
        id: "supplier_code",
        header: "仕入先コード",
        accessor: (row) => row.supplier_code,
        cell: (row) => <span className="font-medium whitespace-nowrap">{row.supplier_code}</span>,
        width: 140,
        sortable: true,
      },
      {
        id: "supplier_name",
        header: "仕入先名",
        accessor: (row) => row.supplier_name,
        cell: (row) => (
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap">{row.supplier_name}</span>
          </div>
        ),
        width: 250,
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
    ? (row: InventoryBySupplierResponse) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(row.supplier_id);
          }}
        >
          詳細
        </Button>
      )
    : undefined;

  // 行クリックハンドラー
  const handleRowClick = onRowClick
    ? (row: InventoryBySupplierResponse) => onRowClick(row.supplier_code)
    : undefined;

  return (
    <DataTable
      data={data}
      columns={columns}
      getRowId={(row) => row.supplier_id}
      onRowClick={handleRowClick}
      rowActions={renderRowActions}
      emptyMessage="データがありません"
    />
  );
}
