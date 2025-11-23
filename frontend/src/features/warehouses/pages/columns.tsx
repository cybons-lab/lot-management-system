/**
 * Warehouses Table Columns
 */
import type { Warehouse } from "../api/warehouses-api";

import type { Column } from "@/shared/components/data/DataTable";

const warehouseTypeLabels: Record<string, string> = {
  internal: "社内",
  external: "外部",
  supplier: "仕入先",
};

export const warehouseColumns: Column<Warehouse>[] = [
  {
    id: "warehouse_code",
    header: "倉庫コード",
    cell: (row) => (
      <span className="font-mono text-sm font-medium text-gray-900">{row.warehouse_code}</span>
    ),
    sortable: true,
    width: "150px",
  },
  {
    id: "warehouse_name",
    header: "倉庫名",
    cell: (row) => <span className="text-gray-900">{row.warehouse_name}</span>,
    sortable: true,
  },
  {
    id: "warehouse_type",
    header: "タイプ",
    cell: (row) => (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
        {warehouseTypeLabels[row.warehouse_type] ?? row.warehouse_type}
      </span>
    ),
    sortable: true,
    width: "100px",
  },
  {
    id: "updated_at",
    header: "更新日時",
    cell: (row) => (
      <span className="text-sm text-gray-500">
        {new Date(row.updated_at).toLocaleDateString("ja-JP")}
      </span>
    ),
    sortable: true,
    width: "120px",
  },
];
