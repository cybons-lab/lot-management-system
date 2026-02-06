/**
 * InboundPlanTable - Simple table showing top 10 inbound plans.
 * Refactored to use DataTable component.
 */
import { format, parse } from "date-fns";

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

function SupplierCell({ row }: { row: InboundPlan }) {
  if (!row.supplier_name) return <span className="text-slate-400">ID: {row.supplier_id}</span>;
  return (
    <>
      {row.supplier_name}
      <span className="ml-1 text-[10px] text-slate-400">({row.supplier_code || "-"})</span>
    </>
  );
}

function statusBadgeClass(status: string) {
  if (status === "received") return "bg-green-100 text-green-700";
  if (status === "pending") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-700";
}

function statusLabel(status: string) {
  if (status === "received") return "入荷済";
  if (status === "pending") return "予定";
  return "キャンセル";
}

const INBOUND_PLAN_COLUMNS: Column<InboundPlan>[] = [
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
        <SupplierCell row={row} />
      </span>
    ),
    width: 200,
    sortable: true,
  },
  {
    id: "planned_arrival_date",
    header: "入荷予定日",
    accessor: (row) => row.planned_arrival_date,
    cell: (row) => format(parse(row.planned_arrival_date, "yyyy-MM-dd", new Date()), "yyyy/MM/dd"),
    width: 120,
    sortable: true,
  },
  {
    id: "status",
    header: "ステータス",
    accessor: (row) => row.status,
    cell: (row) => (
      <span className={`rounded px-2 py-1 text-xs font-medium ${statusBadgeClass(row.status)}`}>
        {statusLabel(row.status)}
      </span>
    ),
    width: 120,
    sortable: true,
  },
];

function uniqueTopTenPlans(plans: InboundPlan[]) {
  const seen = new Set<number>();
  return plans
    .filter((plan) => {
      if (seen.has(plan.id)) return false;
      seen.add(plan.id);
      return true;
    })
    .slice(0, 10);
}

export function InboundPlanTable({ plans }: InboundPlanTableProps) {
  const top10Plans = uniqueTopTenPlans(plans);

  return (
    <DataTable
      data={top10Plans}
      columns={INBOUND_PLAN_COLUMNS}
      getRowId={(row) => row.id}
      emptyMessage="入荷予定がありません"
    />
  );
}
