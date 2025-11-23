/**
 * Customers Table Columns
 * DataTable用のカラム定義
 */

import type { Customer } from "../api/customers-api";

import type { Column } from "@/shared/components/data/DataTable";


/**
 * 得意先一覧テーブルのカラム定義
 */
export const customerColumns: Column<Customer>[] = [
  {
    id: "customer_code",
    header: "得意先コード",
    cell: (row) => (
      <span className="font-mono text-sm font-medium text-gray-900">{row.customer_code}</span>
    ),
    sortable: true,
    width: "200px",
  },
  {
    id: "customer_name",
    header: "得意先名",
    cell: (row) => <span className="text-gray-900">{row.customer_name}</span>,
    sortable: true,
  },
  {
    id: "created_at",
    header: "作成日時",
    cell: (row) => (
      <span className="text-sm text-gray-500">
        {new Date(row.created_at).toLocaleDateString("ja-JP")}
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
