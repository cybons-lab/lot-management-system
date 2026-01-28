import { useQueryClient } from "@tanstack/react-query";
import { type UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { ocrResultsApi, type OcrResultItem } from "../api";
import { executeExportCompletion } from "../utils/ocr-utils";

export function useOcrExportOperations({
  viewMode,
  selectedIds,
  setSelectedIds,
  dataItems,
  flushPendingEdits,
  taskDate,
  statusFilter,
  showErrorsOnly,
  completeMutation,
}: {
  viewMode: "current" | "completed";
  selectedIds: (string | number)[];
  setSelectedIds: (ids: (string | number)[]) => void;
  dataItems: OcrResultItem[];
  flushPendingEdits: () => Promise<void>;
  taskDate: string;
  statusFilter: string;
  showErrorsOnly: boolean;
  completeMutation: UseMutationResult<void, unknown, number[], unknown>;
}) {
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const queryClient = useQueryClient();

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
    } catch {
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

  return {
    downloadConfirmOpen,
    setDownloadConfirmOpen,
    isExporting,
    handleExport,
    handleExportProcess,
  };
}
