/**
 * BatchJobsPage (v3.0 - SAP Inventory Sync Enhanced)
 * Batch jobs management page with SAP Inventory Sync section
 * Refactored to use DataTable component.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  useBatchJobs,
  useExecuteBatchJob,
  useDeleteBatchJob,
  useInventorySyncAlerts,
  useExecuteInventorySync,
} from "../hooks";

import * as styles from "./BatchJobsPage.styles";

import { Button } from "@/components/ui";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";
import { PageContainer, PageHeader } from "@/shared/components/layout";

interface InventorySyncAlert {
  rule_id: number;
  rule_parameters: {
    product_id: number;
    local_qty: number;
    sap_qty: number;
    diff_amount: number;
    diff_pct: number;
    checked_at: string;
  };
}

interface BatchJob {
  job_id: number;
  job_name: string;
  job_type: string;
  status: string;
  created_at: string;
}

// eslint-disable-next-line max-lines-per-function -- Page component with multiple sections (SAP sync + batch jobs list)
export function BatchJobsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // ===== SAP Inventory Sync =====
  const {
    data: alertsData,
    isLoading: isLoadingAlerts,
    isError: isAlertsError,
  } = useInventorySyncAlerts(!showAllAlerts);

  const executeSyncMutation = useExecuteInventorySync();

  const handleExecuteSync = async () => {
    try {
      const result = await executeSyncMutation.mutateAsync();
      if (result.success) {
        if (result.data && result.data.discrepancies_found > 0) {
          toast.warning(
            `SAP在庫チェック完了: ${result.data.discrepancies_found}件の差異を検出しました`,
          );
        } else {
          toast.success("SAP在庫チェック完了: 差異はありませんでした");
        }
      }
    } catch (error) {
      console.error("Failed to execute inventory sync:", error);
      toast.error("SAP在庫チェックに失敗しました");
    }
  };

  // ===== Batch Jobs =====
  const {
    data: response,
    isLoading,
    isError,
  } = useBatchJobs({ status: statusFilter || undefined });

  const executeMutation = useExecuteBatchJob();
  const deleteMutation = useDeleteBatchJob();

  const handleExecute = async (jobId: number) => {
    if (!confirm("このバッチジョブを実行してもよろしいですか？")) {
      return;
    }

    try {
      await executeMutation.mutateAsync({ jobId });
      toast.success("バッチジョブの実行を開始しました");
    } catch (error) {
      console.error("Failed to execute batch job:", error);
      toast.error("実行に失敗しました");
    }
  };

  const handleDelete = async (jobId: number) => {
    if (!confirm("このバッチジョブを削除してもよろしいですか？")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(jobId);
      toast.success("バッチジョブを削除しました");
    } catch (error) {
      console.error("Failed to delete batch job:", error);
      toast.error("削除に失敗しました");
    }
  };

  // 列定義: SAP在庫同期アラート
  const alertColumns = useMemo<Column<InventorySyncAlert>[]>(
    () => [
      {
        id: "product_id",
        header: "商品ID",
        accessor: (row) => row.rule_parameters.product_id,
        cell: (row) => <span className="font-medium">{row.rule_parameters.product_id}</span>,
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
        cell: (row) => (
          <span
            className={`font-semibold ${
              row.rule_parameters.diff_amount > 0 ? "text-orange-600" : "text-blue-600"
            }`}
          >
            {row.rule_parameters.diff_amount > 0 ? "+" : ""}
            {row.rule_parameters.diff_amount}
          </span>
        ),
        width: 100,
        align: "right",
        sortable: true,
      },
      {
        id: "diff_pct",
        header: "差異率",
        accessor: (row) => row.rule_parameters.diff_pct,
        cell: (row) => {
          const diffPct = row.rule_parameters.diff_pct;
          const diffLevel = diffPct > 10 ? "high" : diffPct > 5 ? "medium" : "low";
          return (
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                diffLevel === "high"
                  ? "bg-red-100 text-red-800"
                  : diffLevel === "medium"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-blue-100 text-blue-800"
              }`}
            >
              {diffPct.toFixed(1)}%
            </span>
          );
        },
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

  // 列定義: バッチジョブ
  const batchJobColumns = useMemo<Column<BatchJob>[]>(
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
        cell: (row) => <span className={styles.jobTypeBadge}>{row.job_type}</span>,
        width: 150,
        sortable: true,
      },
      {
        id: "status",
        header: "ステータス",
        accessor: (row) => row.status,
        cell: (row) => (
          <span
            className={styles.statusBadge({
              status: row.status as "pending" | "running" | "completed" | "failed",
            })}
          >
            {row.status}
          </span>
        ),
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

  // アクションボタン: バッチジョブ
  const renderBatchJobActions = (job: BatchJob) => (
    <div className={styles.actionButtons}>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          handleExecute(job.job_id);
        }}
        disabled={executeMutation.isPending || job.status === "running"}
      >
        実行
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(job.job_id);
        }}
        disabled={deleteMutation.isPending}
      >
        削除
      </Button>
    </div>
  );

  return (
    <PageContainer>
      <div className={styles.header.root}>
        <PageHeader
          title="バッチジョブ管理"
          subtitle="SAP在庫同期とバッチジョブの管理・実行"
          className="pb-0"
        />
      </div>

      {/* ===== SAP Inventory Sync Section ===== */}
      <div className="space-y-4">
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">SAP在庫同期</h3>
              <p className="text-sm text-blue-700">SAP在庫とローカルDB在庫の差異をチェックします</p>
            </div>
            <Button
              onClick={handleExecuteSync}
              disabled={executeSyncMutation.isPending}
              variant="default"
            >
              {executeSyncMutation.isPending ? "チェック中..." : "SAP在庫チェック実行"}
            </Button>
          </div>

          {/* Alerts Section */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-blue-900">差異アラート</h4>
              <label className="flex items-center gap-2 text-sm text-blue-700">
                <input
                  type="checkbox"
                  checked={showAllAlerts}
                  onChange={(e) => setShowAllAlerts(e.target.checked)}
                  className="rounded"
                />
                全履歴を表示
              </label>
            </div>

            {isLoadingAlerts ? (
              <div className="rounded-lg border bg-white p-4 text-center text-gray-500">
                読み込み中...
              </div>
            ) : isAlertsError ? (
              <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
                アラートの取得に失敗しました
              </div>
            ) : !alertsData || alertsData.total === 0 ? (
              <div className="rounded-lg border bg-white p-4 text-center text-green-600">
                ✓ 差異はありません
              </div>
            ) : (
              <DataTable
                data={alertsData.alerts}
                columns={alertColumns}
                getRowId={(row) => row.rule_id}
                emptyMessage="差異アラートがありません"
              />
            )}
          </div>
        </div>
      </div>

      {/* ===== Batch Jobs Section ===== */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">汎用バッチジョブ</h3>

        {/* Filter */}
        <div className={styles.filter.root}>
          <div className={styles.filter.container}>
            <label className={styles.filter.label} htmlFor="status-filter">
              ステータスフィルタ:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.filter.select}
            >
              <option value="">すべて</option>
              <option value="pending">待機中</option>
              <option value="running">実行中</option>
              <option value="completed">完了</option>
              <option value="failed">失敗</option>
            </select>
          </div>
        </div>

        {/* Data display area */}
        {isLoading ? (
          <div className={styles.loadingState}>読み込み中...</div>
        ) : isError ? (
          <div className={styles.errorState}>データの取得に失敗しました</div>
        ) : !response || response.jobs.length === 0 ? (
          <div className={styles.emptyState}>バッチジョブが登録されていません</div>
        ) : (
          <div className={styles.content.root}>
            <div className={styles.content.info}>
              {response.total} 件のジョブ (ページ {response.page}/
              {Math.ceil(response.total / response.page_size)})
            </div>

            {/* Table */}
            <DataTable
              data={response.jobs}
              columns={batchJobColumns}
              getRowId={(row) => row.job_id}
              rowActions={renderBatchJobActions}
              emptyMessage="バッチジョブがありません"
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
