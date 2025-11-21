/**
 * Products Table Columns
 */
import type { Column } from "@/shared/components/data/DataTable";
import type { Product } from "../api/products-api";

export const productColumns: Column<Product>[] = [
  {
    id: "maker_part_code",
    header: "メーカー品番",
    cell: (row) => <span className="font-mono text-sm font-medium text-gray-900">{row.maker_part_code}</span>,
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
    id: "base_unit",
    header: "単位",
    cell: (row) => <span className="text-sm text-gray-700">{row.base_unit}</span>,
    sortable: true,
    width: "100px",
  },
  {
    id: "consumption_limit_days",
    header: "消費期限日数",
    cell: (row) => (
      <span className="text-sm text-gray-700">
        {row.consumption_limit_days?.toString() ?? "-"}
      </span>
    ),
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
