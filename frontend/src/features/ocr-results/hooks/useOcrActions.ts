import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { ocrResultsApi, type OcrResultItem } from "../api";
import { executeExportCompletion } from "../utils/ocr-utils";

export function useOcrActions({
  viewMode,
  selectedIds,
  setSelectedIds,
  dataItems,
  flushPendingEdits,
  taskDate,
  statusFilter,
  showErrorsOnly,
}: {
  viewMode: "current" | "completed";
  selectedIds: (string | number)[];
  setSelectedIds: (ids: (string | number)[]) => void;
  dataItems: OcrResultItem[];
  flushPendingEdits: () => Promise<void>;
  taskDate: string;
  statusFilter: string;
  showErrorsOnly: boolean;
}) {
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const queryClient = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: (ids: number[]) => ocrResultsApi.complete(ids),
    onSuccess: () => {
      toast.success("選択した項目を完了にしました");
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["ocr-results"] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string | object } }; message?: string };
      const detail = err.response?.data?.detail;
      const detailMsg = typeof detail === "string" ? detail : JSON.stringify(detail);
      toast.error(`完了処理に失敗しました: ${detailMsg || err.message}`);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (ids: number[]) => ocrResultsApi.restore(ids),
    onSuccess: () => {
      toast.success("選択した項目を未処理に戻しました");
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["ocr-results"] });
    },
    onError: () => toast.error("復元処理に失敗しました"),
  });

  const handleExportProcess = async (markAsComplete: boolean) => {
    setIsExporting(true);
    try {
      if (viewMode === "current") await flushPendingEdits();

      await ocrResultsApi.exportExcel({
        task_date: taskDate || undefined,
        status: statusFilter || undefined,
        has_error: showErrorsOnly || undefined,
        ids: selectedIds.length > 0 ? selectedIds.map(Number) : undefined,
      });

      if (markAsComplete && viewMode === "current") {
        const toComplete =
          selectedIds.length > 0 ? dataItems.filter((i) => selectedIds.includes(i.id)) : dataItems;

        await executeExportCompletion(toComplete, async (ids) => {
          await completeMutation.mutateAsync(ids);
          setSelectedIds([]);
        });
      }
      queryClient.invalidateQueries({ queryKey: ["ocr-results"] });
    } catch (err) {
      toast.error("Excelエクスポートに失敗しました");
    } finally {
      setIsExporting(false);
      setDownloadConfirmOpen(false);
    }
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) {
      toast.error("エクスポートする項目を選択してください");
      return;
    }
    if (viewMode === "current") setDownloadConfirmOpen(true);
    else handleExportProcess(false);
  };

  const handleManualComplete = async () => {
    if (selectedIds.length === 0) {
      toast.error("完了にする項目を選択してください");
      return;
    }
    if (viewMode === "current") {
      try {
        await flushPendingEdits();
      } catch (err) {
        // Continue
      }
    }
    const selectedNumIds = selectedIds.map(Number);
    const selectedItems = dataItems.filter((i) => selectedNumIds.includes(i.id));
    const validItems = selectedItems.filter((i) => !i.has_error);
    const validIds = validItems.map((i) => i.id);
    const skippedCount = selectedItems.length - validItems.length;

    if (selectedItems.length > 0 && validIds.length === 0) {
      toast.error("選択された項目はすべてエラーを含んでいるため、完了にできません");
      return;
    }
    if (validIds.length === 0) {
      toast.error("対象の項目が見つかりませんでした");
      return;
    }

    completeMutation.mutate(validIds, {
      onSuccess: () => {
        if (skippedCount > 0)
          toast.warning(`${skippedCount}件のエラー項目は完了処理から除外されました`);
      },
    });
  };

  const handleManualRestore = () => {
    if (selectedIds.length === 0) return;
    restoreMutation.mutate(selectedIds.map(Number));
  };

  return {
    downloadConfirmOpen,
    setDownloadConfirmOpen,
    isExporting,
    handleExport,
    handleExportProcess,
    handleManualComplete,
    handleManualRestore,
    completeMutation,
    restoreMutation,
  };
}
