import { useState } from "react";
import { toast } from "sonner";

import {
  useBatchJobs,
  useExecuteBatchJob,
  useDeleteBatchJob,
  useInventorySyncAlerts,
  useExecuteInventorySync,
} from "./useBatchJobsHooks";

export function useBatchJobsPage() {
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
  } = useBatchJobs({
    ...(statusFilter ? { status: statusFilter } : {}),
  });

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

  return {
    statusFilter,
    setStatusFilter,
    showAllAlerts,
    setShowAllAlerts,
    alertsData,
    isLoadingAlerts,
    isAlertsError,
    executeSyncMutation,
    handleExecuteSync,
    response,
    isLoading,
    isError,
    executeMutation,
    deleteMutation,
    handleExecute,
    handleDelete,
  };
}
