/**
 * InboundPlanTable - Simple table showing top 10 inbound plans.
 * Refactored to use DataTable component.
 */
import { format, parse } from "date-fns";
import { useMemo } from "react";

import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";

interface InboundPlan {
  id: number;
  plan_number: string;
  supplier_name?: string;
  supplier_code?: string;
  supplier_id: number;
  planned_arrival_date: string;
  status: string;
}

interface InboundPlanTableProps {
  plans: InboundPlan[];
}

// eslint-disable-next-line max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため
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
        accessor: (row) =>
          row.supplier_name
            ? `${row.supplier_name} (${row.supplier_code || "No Code"})`
            : `ID: ${row.supplier_id}`,
        cell: (row) => (
          <span className="truncate" title={row.supplier_name}>
            {row.supplier_name ? (
              <>
                {row.supplier_name}
                <span className="ml-1 text-[10px] text-slate-400">
                  ({row.supplier_code || "-"})
                </span>
              </>
            ) : (
              <span className="text-slate-400">ID: {row.supplier_id}</span>
            )}
          </span>
        ),
        width: 200,
        sortable: true,
      },
      {
        id: "planned_arrival_date",
        header: "入荷予定日",
        accessor: (row) => row.planned_arrival_date,
        cell: (row) =>
          format(parse(row.planned_arrival_date, "yyyy-MM-dd", new Date()), "yyyy/MM/dd"),
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

  // Deduplicate plans
  const uniquePlans = useMemo(() => {
    const seen = new Set();
    return plans.filter((plan) => {
      if (seen.has(plan.id)) {
        return false;
      }
      seen.add(plan.id);
      return true;
    });
  }, [plans]);

  // TOP10のみ表示
  const top10Plans = uniquePlans.slice(0, 10);

  return (
    <DataTable
      data={top10Plans}
      columns={columns}
      getRowId={(row) => row.id}
      emptyMessage="入荷予定がありません"
    />
  );
}
