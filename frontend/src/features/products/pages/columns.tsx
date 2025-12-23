/**
 * Products Table Columns
 */
import type { Product } from "../api";

import type { Column } from "@/shared/components/data/DataTable";
import { formatDate } from "@/shared/utils/date";

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
    cell: (row) => (
      <span className="block max-w-[200px] truncate text-gray-900" title={row.product_name}>
        {row.product_name}
      </span>
    ),
    sortable: true,
    width: "200px",
  },
  {
    id: "maker_part_code",
    header: "メーカー品番",
    cell: (row) => (
      <span className="font-mono text-sm text-gray-700">{row.maker_part_code || "-"}</span>
    ),
    sortable: true,
    width: "120px",
  },
  {
    id: "base_unit",
    header: "基本単位",
    cell: (row) => <span className="text-sm text-gray-700">{row.base_unit || "-"}</span>,
    sortable: true,
    width: "80px",
  },
  {
    id: "consumption_limit_days",
    header: "消費期限",
    cell: (row) => (
      <span className="text-sm text-gray-700">
        {row.consumption_limit_days != null ? `${row.consumption_limit_days}日` : "-"}
      </span>
    ),
    sortable: true,
    width: "90px",
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
    cell: (row) => <div className="text-center font-medium">{formatDate(row.updated_at)}</div>,
    sortable: true,
    width: "150px",
  },
];
