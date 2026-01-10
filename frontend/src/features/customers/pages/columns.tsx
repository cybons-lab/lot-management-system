/**
 * Customers Table Columns
 * DataTable用のカラム定義
 */

import type { Customer } from "../api";

import type { Column } from "@/shared/components/data/DataTable";
import { formatDate } from "@/shared/utils/date";

/**
 * 得意先一覧テーブルのカラム定義
 */
export const customerColumns: Column<Customer>[] = [
  {
    id: "customer_code",
    header: "得意先コード",
    cell: (row) => (
      <span className="font-mono text-sm font-medium whitespace-nowrap text-slate-900">
        {row.customer_code}
      </span>
    ),
    sortable: true,
    width: "180px",
  },
  {
    id: "customer_name",
    header: "得意先名",
    cell: (row) => <span className="whitespace-nowrap text-slate-900">{row.customer_name}</span>,
    sortable: true,
    width: "300px",
  },
  {
    id: "created_at",
    header: "作成日時",
    cell: (row) => (
      <span className="text-sm whitespace-nowrap text-slate-500">{formatDate(row.created_at)}</span>
    ),
    sortable: true,
    width: "150px",
  },
  {
    id: "updated_at",
    header: "更新日時",
    cell: (row) => (
      <span className="text-sm whitespace-nowrap text-slate-500">{formatDate(row.updated_at)}</span>
    ),
    sortable: true,
    width: "150px",
  },
];
