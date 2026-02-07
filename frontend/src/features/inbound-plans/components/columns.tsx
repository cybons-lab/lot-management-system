import { User } from "lucide-react";

import type { InboundPlan } from "../types";

import { Badge } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";
import { formatDate } from "@/shared/utils/date";

/**
 * ステータスを日本語ラベルに変換
 */
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    planned: "予定",
    partially_received: "一部入荷",
    received: "入荷済",
    cancelled: "キャンセル",
  };
  return labels[status] || status;
};

export const inboundPlanColumns: Column<InboundPlan>[] = [
  {
    id: "plan_number",
    header: "入荷予定番号",
    accessor: (row) => row.plan_number,
    width: 150,
    sortable: true,
  },
  {
    id: "sap_po_number",
    header: "SAP発注番号",
    accessor: (row) => row.sap_po_number || "",
    cell: (row) =>
      row.sap_po_number ? (
        <span className="font-medium text-blue-600">{row.sap_po_number}</span>
      ) : (
        <span className="text-slate-400">–</span>
      ),
    width: 150,
    sortable: true,
  },
  {
    id: "supplier_name",
    header: "仕入先",
    accessor: (row) =>
      row.supplier_name
        ? `${row.supplier_name} (${row.supplier_code || ""})`
        : `ID: ${row.supplier_id}`,
    cell: (row) => (
      <div>
        <span
          className="block max-w-[250px] truncate font-medium"
          title={
            row.supplier_name
              ? `${row.supplier_name} (${row.supplier_code || ""})`
              : `ID: ${row.supplier_id}`
          }
        >
          {row.supplier_name ? (
            <>
              {row.supplier_name}
              <span className="ml-1 text-xs text-slate-500">
                ({row.supplier_code || "No Code"})
              </span>
            </>
          ) : (
            `ID: ${row.supplier_id}`
          )}
        </span>
        {row.is_assigned_supplier && (
          <Badge variant="outline" className="mt-1 gap-1 border-blue-300 bg-blue-50 text-blue-600">
            <User className="h-3 w-3" />
            担当仕入先
          </Badge>
        )}
      </div>
    ),
    width: 220,
    sortable: true,
  },
  {
    id: "planned_arrival_date",
    header: "入荷予定日",
    accessor: (row) => row.planned_arrival_date,
    cell: (row) => formatDate(row.planned_arrival_date),
    width: 120,
    sortable: true,
  },
  {
    id: "total_quantity",
    header: "合計数量",
    accessor: (row) => row.total_quantity || 0,
    cell: (row) => (
      <div className="text-right font-mono text-sm">
        {(row.total_quantity || 0).toLocaleString()}
      </div>
    ),
    width: 100,
    align: "right",
    sortable: true,
  },
  {
    id: "status",
    header: "ステータス",
    accessor: (row) => row.status,
    cell: (row) => (
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
          row.status === "planned"
            ? "bg-yellow-100 text-yellow-800"
            : row.status === "partially_received"
              ? "bg-blue-100 text-blue-800"
              : row.status === "received"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
        }`}
      >
        {getStatusLabel(row.status)}
      </span>
    ),
    width: 150,
    sortable: true,
  },
  {
    id: "created_at",
    header: "作成日",
    accessor: (row) => row.created_at,
    cell: (row) => <span className="text-gray-600">{formatDate(row.created_at)}</span>,
    width: 120,
    sortable: true,
  },
];
