/**
 * InboundPlanTable - Simple table showing top 10 inbound plans.
 * Refactored to use DataTable component.
 */
import { format } from "date-fns";
import { useMemo } from "react";

import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";

interface InboundPlan {
  id: number;
  plan_number: string;
  supplier_name?: string;
  supplier_id: number;
  planned_arrival_date: string;
  status: string;
}

interface InboundPlanTableProps {
  plans: InboundPlan[];
}

export function InboundPlanTable({ plans }: InboundPlanTableProps) {
  // 列定義
  const columns = useMemo<Column<InboundPlan>[]>(
    () => [
      {
        id: "plan_number",
        header: "予定番号",
        accessor: (row) => row.plan_number,
        width: 150,
        sortable: true,
      },
      {
        id: "supplier",
        header: "仕入先",
        accessor: (row) => row.supplier_name || `ID:${row.supplier_id}`,
        width: 200,
        sortable: true,
      },
      {
        id: "planned_arrival_date",
        header: "入荷予定日",
        accessor: (row) => row.planned_arrival_date,
        cell: (row) => format(new Date(row.planned_arrival_date), "yyyy/MM/dd"),
        width: 120,
        sortable: true,
      },
      {
        id: "status",
        header: "ステータス",
        accessor: (row) => row.status,
        cell: (row) => (
          <span
            className={`rounded px-2 py-1 text-xs font-medium ${
              row.status === "received"
                ? "bg-green-100 text-green-700"
                : row.status === "pending"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-700"
            }`}
          >
            {row.status === "received"
              ? "入荷済"
              : row.status === "pending"
                ? "予定"
                : "キャンセル"}
          </span>
        ),
        width: 120,
        sortable: true,
      },
    ],
    [],
  );

  // TOP10のみ表示
  const top10Plans = plans.slice(0, 10);

  return (
    <DataTable
      data={top10Plans}
      columns={columns}
      getRowId={(row) => row.id}
      emptyMessage="入荷予定がありません"
    />
  );
}
