/**
 * Suppliers Table Columns
 */
import type { Supplier } from "../api";

import type { Column } from "@/shared/components/data/DataTable";
import { formatDate } from "@/shared/utils/date";

export const supplierColumns: Column<Supplier>[] = [
  {
    id: "supplier_code",
    header: "仕入先コード",
    cell: (row) => (
      <span className="font-mono text-sm font-medium text-gray-900">{row.supplier_code}</span>
    ),
    sortable: true,
    width: "200px",
  },
  {
    id: "supplier_name",
    header: "仕入先名",
    cell: (row) => <span className="text-gray-900">{row.supplier_name}</span>,
    sortable: true,
  },
  {
    id: "updated_at",
    header: "更新日時",
    cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.updated_at)}</span>,
    sortable: true,
    width: "150px",
  },
];
