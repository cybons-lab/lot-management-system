import type { ReactMouseEvent } from "react";

import type { BatchJob, BatchJobListResponse } from "../api";
import * as styles from "../pages/BatchJobsPage.styles";

import { useBatchJobColumns } from "./BatchJobColumns";

import { Button } from "@/components/ui";
import { DataTable } from "@/shared/components/data/DataTable";

interface BatchJobsListProps {
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  isLoading: boolean;
  isError: boolean;
  response: BatchJobListResponse | undefined;
  onExecute: (jobId: number) => Promise<void>;
  onDelete: (jobId: number) => Promise<void>;
  isExecuting: boolean;
  isDeleting: boolean;
}

const BatchJobsFilter = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className={styles.filter.root}>
    <div className={styles.filter.container}>
      <label className={styles.filter.label} htmlFor="status-filter">
        ステータスフィルタ:
      </label>
      <select
        id="status-filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
);

export function BatchJobsList({
  statusFilter,
  onStatusFilterChange,
  isLoading,
  isError,
  response,
  onExecute,
  onDelete,
  isExecuting,
  isDeleting,
}: BatchJobsListProps) {
  const columns = useBatchJobColumns();

  const renderActions = (job: BatchJob) => (
    <div className={styles.actionButtons}>
      <Button
        variant="outline"
        size="sm"
        onClick={(e: ReactMouseEvent) => {
          e.stopPropagation();
          onExecute(job.job_id);
        }}
        disabled={isExecuting || job.status === "running"}
      >
        実行
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={(e: ReactMouseEvent) => {
          e.stopPropagation();
          onDelete(job.job_id);
        }}
        disabled={isDeleting}
      >
        削除
      </Button>
    </div>
  );

  if (isLoading) return <div className={styles.loadingState}>読み込み中...</div>;
  if (isError) return <div className={styles.errorState}>データの取得に失敗しました</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">汎用バッチジョブ</h3>
      <BatchJobsFilter value={statusFilter} onChange={onStatusFilterChange} />
      {!response || response.jobs.length === 0 ? (
        <div className={styles.emptyState}>バッチジョブが登録されていません</div>
      ) : (
        <div className={styles.content.root}>
          <div className={styles.content.info}>
            {response.total} 件のジョブ (ページ {response.page}/
            {Math.ceil(response.total / response.page_size)})
          </div>
          <DataTable
            data={response.jobs}
            columns={columns}
            getRowId={(row) => row.job_id}
            rowActions={renderActions}
            emptyMessage="バッチジョブがありません"
          />
        </div>
      )}
    </div>
  );
}
