import { useMemo } from "react";

import type { InventorySyncAlert, BatchJob } from "../api";
import * as styles from "../pages/BatchJobsPage.styles";

import type { Column } from "@/shared/components/data/DataTable";

const JobTypeBadge = ({ type }: { type: string }) => (
  <span className={styles.jobTypeBadge}>{type}</span>
);

const JobStatusBadge = ({ status }: { status: string }) => (
  <span
    className={styles.statusBadge({
      status: status as "pending" | "running" | "completed" | "failed",
    })}
  >
    {status}
  </span>
);

export function useBatchJobColumns() {
  return useMemo<Column<BatchJob>[]>(
    () => [
      {
        id: "job_id",
        header: "ジョブID",
        accessor: (row) => row.job_id,
        width: 100,
        sortable: true,
      },
      {
        id: "job_name",
        header: "ジョブ名",
        accessor: (row) => row.job_name,
        width: 200,
        sortable: true,
      },
      {
        id: "job_type",
        header: "ジョブ種別",
        accessor: (row) => row.job_type,
        cell: (row) => <JobTypeBadge type={row.job_type} />,
        width: 150,
        sortable: true,
      },
      {
        id: "status",
        header: "ステータス",
        accessor: (row) => row.status,
        cell: (row) => <JobStatusBadge status={row.status} />,
        width: 120,
        sortable: true,
      },
      {
        id: "created_at",
        header: "作成日時",
        accessor: (row) => row.created_at,
        cell: (row) => (
          <span className="text-gray-600">{new Date(row.created_at).toLocaleString("ja-JP")}</span>
        ),
        width: 180,
        sortable: true,
      },
    ],
    [],
  );
}

const DiffAmountCell = ({ amount }: { amount: number }) => (
  <span className={`font-semibold ${amount > 0 ? "text-orange-600" : "text-blue-600"}`}>
    {amount > 0 ? "+" : ""}
    {amount}
  </span>
);

const DiffPctBadge = ({ pct }: { pct: number }) => {
  const level = pct > 10 ? "high" : pct > 5 ? "medium" : "low";
  const colors = {
    high: "bg-red-100 text-red-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-blue-100 text-blue-800",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[level]}`}>
      {pct.toFixed(1)}%
    </span>
  );
};

export function useInventorySyncAlertColumns() {
  return useMemo<Column<InventorySyncAlert>[]>(
    () => [
      {
        id: "supplier_item_id",
        header: "商品ID",
        accessor: (row) => row.rule_parameters.supplier_item_id,
        cell: (row) => <span className="font-medium">{row.rule_parameters.supplier_item_id}</span>,
        width: 100,
        sortable: true,
      },
      {
        id: "local_qty",
        header: "ローカル在庫",
        accessor: (row) => row.rule_parameters.local_qty,
        width: 120,
        align: "right",
        sortable: true,
      },
      {
        id: "sap_qty",
        header: "SAP在庫",
        accessor: (row) => row.rule_parameters.sap_qty,
        width: 120,
        align: "right",
        sortable: true,
      },
      {
        id: "diff_amount",
        header: "差異",
        accessor: (row) => row.rule_parameters.diff_amount,
        cell: (row) => <DiffAmountCell amount={row.rule_parameters.diff_amount} />,
        width: 100,
        align: "right",
        sortable: true,
      },
      {
        id: "diff_pct",
        header: "差異率",
        accessor: (row) => row.rule_parameters.diff_pct,
        cell: (row) => <DiffPctBadge pct={row.rule_parameters.diff_pct} />,
        width: 100,
        sortable: true,
      },
      {
        id: "checked_at",
        header: "最終チェック",
        accessor: (row) => row.rule_parameters.checked_at,
        cell: (row) => (
          <span className="text-gray-600">
            {new Date(row.rule_parameters.checked_at).toLocaleString("ja-JP")}
          </span>
        ),
        width: 180,
        sortable: true,
      },
    ],
    [],
  );
}
