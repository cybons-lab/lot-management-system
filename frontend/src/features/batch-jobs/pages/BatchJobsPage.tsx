/**
 * BatchJobsPage (v3.0 - SAP Inventory Sync Enhanced)
 * Batch jobs management page with SAP Inventory Sync section
 */

import { useState } from "react";
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
import { PageContainer, PageHeader } from "@/shared/components/layout";

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
              <div className="overflow-x-auto rounded-lg border bg-white">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        商品ID
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        ローカル在庫
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        SAP在庫
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        差異
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        差異率
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        最終チェック
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {alertsData.alerts.map((alert) => {
                      const params = alert.rule_parameters;
                      const diffPct = params.diff_pct;
                      const diffLevel = diffPct > 10 ? "high" : diffPct > 5 ? "medium" : "low";

                      return (
                        <tr key={alert.rule_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">{params.product_id}</td>
                          <td className="px-4 py-3 text-sm">{params.local_qty}</td>
                          <td className="px-4 py-3 text-sm">{params.sap_qty}</td>
                          <td
                            className={`px-4 py-3 text-sm font-semibold ${
                              params.diff_amount > 0 ? "text-orange-600" : "text-blue-600"
                            }`}
                          >
                            {params.diff_amount > 0 ? "+" : ""}
                            {params.diff_amount}
                          </td>
                          <td className="px-4 py-3 text-sm">
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
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(params.checked_at).toLocaleString("ja-JP")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
            <div className={styles.table.container}>
              <table className={styles.table.root}>
                <thead className={styles.table.thead}>
                  <tr>
                    <th className={styles.table.th}>ジョブID</th>
                    <th className={styles.table.th}>ジョブ名</th>
                    <th className={styles.table.th}>ジョブ種別</th>
                    <th className={styles.table.th}>ステータス</th>
                    <th className={styles.table.th}>作成日時</th>
                    <th className={styles.table.th}>操作</th>
                  </tr>
                </thead>
                <tbody className={styles.table.tbody}>
                  {response.jobs.map((job) => (
                    <tr key={job.job_id} className={styles.table.tr}>
                      <td className={styles.table.td}>{job.job_id}</td>
                      <td className={styles.table.tdMedium}>{job.job_name}</td>
                      <td className={styles.table.td}>
                        <span className={styles.jobTypeBadge}>{job.job_type}</span>
                      </td>
                      <td className={styles.table.td}>
                        <span
                          className={styles.statusBadge({
                            status: job.status as "pending" | "running" | "completed" | "failed",
                          })}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className={styles.table.tdGray}>
                        {new Date(job.created_at).toLocaleString("ja-JP")}
                      </td>
                      <td className={styles.table.td}>
                        <div className={styles.actionButtons}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExecute(job.job_id)}
                            disabled={executeMutation.isPending || job.status === "running"}
                          >
                            実行
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(job.job_id)}
                            disabled={deleteMutation.isPending}
                          >
                            削除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
