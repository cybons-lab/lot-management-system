/**
 * BatchJobsPage (v2.2 - Phase H-3)
 * Batch jobs management page
 */

import { useState } from "react";
import { toast } from "sonner";

import { useBatchJobs, useExecuteBatchJob, useDeleteBatchJob } from "../hooks";

import * as styles from "./BatchJobsPage.styles";

import { Button } from "@/components/ui";

// eslint-disable-next-line max-lines-per-function
export function BatchJobsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Fetch batch jobs
  const {
    data: response,
    isLoading,
    isError,
  } = useBatchJobs({ status: statusFilter || undefined });

  // Execute mutation
  const executeMutation = useExecuteBatchJob();

  // Delete mutation
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
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header.root}>
        <h2 className={styles.header.title}>バッチジョブ</h2>
        <p className={styles.header.description}>バッチジョブの管理と実行</p>
      </div>

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
  );
}
