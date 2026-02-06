import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ocrResultsApi, type OcrResultItem } from "../api";

interface OcrStatusOperationsParams {
  viewMode: "current" | "completed";
  selectedIds: (string | number)[];
  setSelectedIds: (ids: (string | number)[]) => void;
  dataItems: OcrResultItem[];
  flushPendingEdits: () => Promise<void>;
}

const toNumberIds = (ids: (string | number)[]) => ids.map(Number);

function getSelectedItems(dataItems: OcrResultItem[], selectedIds: (string | number)[]) {
  const selectedNumIds = toNumberIds(selectedIds);
  return dataItems.filter((item) => selectedNumIds.includes(item.id));
}

function buildCompleteTargets(dataItems: OcrResultItem[], selectedIds: (string | number)[]) {
  const selectedItems = getSelectedItems(dataItems, selectedIds);
  const validItems = selectedItems.filter((item) => !item.has_error);
  return {
    selectedItemsCount: selectedItems.length,
    validIds: validItems.map((item) => item.id),
    skippedCount: selectedItems.length - validItems.length,
  };
}

function buildDeleteTargets(dataItems: OcrResultItem[], selectedIds: (string | number)[]) {
  const selectedItems = getSelectedItems(dataItems, selectedIds);
  const errorItems = selectedItems.filter((item) => item.has_error);
  return errorItems.map((item) => item.id);
}

function useCompleteMutation(setSelectedIds: (ids: (string | number)[]) => void) {
  const queryClient = useQueryClient();

  return useMutation({
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
}

function useRestoreMutation(setSelectedIds: (ids: (string | number)[]) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => ocrResultsApi.restore(ids),
    onSuccess: () => {
      toast.success("選択した項目を未処理に戻しました");
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["ocr-results"] });
    },
    onError: () => toast.error("復元処理に失敗しました"),
  });
}

function useDeleteMutation(setSelectedIds: (ids: (string | number)[]) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => ocrResultsApi.delete({ ids }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ocr-results"] });
      toast.success(`${data.deleted_count}件のOCR結果を削除しました`);
      if (data.skipped_count > 0 && data.message) {
        toast.warning(data.message);
      }
      setSelectedIds([]);
    },
    onError: (error: unknown) => {
      const err = error as {
        response?: { status?: number; data?: { detail?: string } };
      };
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 400) {
        toast.error(detail || "削除できない項目が含まれています");
      } else if (status === 403) {
        toast.error("削除する権限がありません");
      } else if (status === 404) {
        toast.error("指定されたOCR結果が見つかりません");
      } else {
        toast.error("OCR結果の削除に失敗しました");
      }
    },
  });
}

export function useOcrStatusOperations({
  viewMode,
  selectedIds,
  setSelectedIds,
  dataItems,
  flushPendingEdits,
}: OcrStatusOperationsParams) {
  const completeMutation = useCompleteMutation(setSelectedIds);
  const restoreMutation = useRestoreMutation(setSelectedIds);
  const deleteMutation = useDeleteMutation(setSelectedIds);

  const handleManualComplete = async () => {
    if (selectedIds.length === 0) {
      toast.error("完了にする項目を選択してください");
      return;
    }

    if (viewMode === "current") {
      try {
        await flushPendingEdits();
      } catch {
        // Continue with current selected items
      }
    }

    const { selectedItemsCount, validIds, skippedCount } = buildCompleteTargets(
      dataItems,
      selectedIds,
    );

    if (selectedItemsCount > 0 && validIds.length === 0) {
      toast.error("選択された項目はすべてエラーを含んでいるため、完了にできません");
      return;
    }
    if (validIds.length === 0) {
      toast.error("対象の項目が見つかりませんでした");
      return;
    }

    completeMutation.mutate(validIds, {
      onSuccess: () => {
        if (skippedCount > 0) {
          toast.warning(`${skippedCount}件のエラー項目は完了処理から除外されました`);
        }
      },
    });
  };

  const handleManualRestore = () => {
    if (selectedIds.length === 0) return;
    restoreMutation.mutate(toNumberIds(selectedIds));
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) {
      toast.error("削除する項目を選択してください");
      return;
    }

    const errorIds = buildDeleteTargets(dataItems, selectedIds);
    if (errorIds.length === 0) {
      toast.error("削除できる項目がありません（エラーがある項目のみ削除可能）");
      return;
    }

    deleteMutation.mutate(errorIds);
  };

  return {
    completeMutation,
    restoreMutation,
    deleteMutation,
    handleManualComplete,
    handleManualRestore,
    handleDelete,
  };
}
