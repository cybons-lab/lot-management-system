/**
 * BatchJobsPage (v2.2 - Phase H-3)
 * Batch jobs management page
 */

import { useState } from "react";
import { useBatchJobs, useExecuteBatchJob, useDeleteBatchJob } from "../hooks";
import { Button } from "@/components/ui";

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
      alert("バッチジョブの実行を開始しました");
    } catch (error) {
      console.error("Failed to execute batch job:", error);
      alert("実行に失敗しました");
    }
  };

  const handleDelete = async (jobId: number) => {
    if (!confirm("このバッチジョブを削除してもよろしいですか？")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(jobId);
      alert("バッチジョブを削除しました");
    } catch (error) {
      console.error("Failed to delete batch job:", error);
      alert("削除に失敗しました");
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const classes = {
      pending: "bg-yellow-100 text-yellow-800",
      running: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return classes[status as keyof typeof classes] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">バッチジョブ</h2>
        <p className="mt-1 text-gray-600">バッチジョブの管理と実行</p>
      </div>

      {/* Filter */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">ステータスフィルタ:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
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
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          読み込み中...
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          データの取得に失敗しました
        </div>
      ) : !response || response.jobs.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          バッチジョブが登録されていません
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            {response.total} 件のジョブ (ページ {response.page}/
            {Math.ceil(response.total / response.page_size)})
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    ジョブID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    ジョブ名
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    ジョブ種別
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    ステータス
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    作成日時
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {response.jobs.map((job) => (
                  <tr key={job.job_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{job.job_id}</td>
                    <td className="px-4 py-3 text-sm font-medium">{job.job_name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                        {job.job_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(job.status)}`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(job.created_at).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
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
