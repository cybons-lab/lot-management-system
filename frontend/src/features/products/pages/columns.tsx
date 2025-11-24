/**
 * Products Table Columns
 */
import type { Product } from "../api/products-api";

import type { Column } from "@/shared/components/data/DataTable";

export const productColumns: Column<Product>[] = [
  {
    id: "product_code",
    header: "製品コード",
    cell: (row) => (
      <span className="font-mono text-sm font-medium text-gray-900">{row.product_code}</span>
    ),
    sortable: true,
    width: "200px",
  },
  {
    id: "product_name",
    header: "商品名",
    cell: (row) => <span className="text-gray-900">{row.product_name}</span>,
    sortable: true,
  },
  {
    id: "internal_unit",
    header: "社内単位",
    cell: (row) => <span className="text-sm text-gray-700">{row.internal_unit}</span>,
    sortable: true,
    width: "100px",
  },
  {
    id: "external_unit",
    header: "外部単位",
    cell: (row) => <span className="text-sm text-gray-700">{row.external_unit}</span>,
    sortable: true,
    width: "120px",
  },
  {
    id: "qty_per_internal_unit",
    header: "数量/内部単位",
    cell: (row) => <span className="text-sm text-gray-700">{row.qty_per_internal_unit}</span>,
    sortable: true,
    width: "150px",
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
    width: "150px",
  },
];
