import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { toast } from "sonner";

import { ocrResultsApi, type OcrResultEditPayload, type OcrResultItem } from "../api";
import { buildPayload, type RowInputState } from "../utils/ocr-utils";

export function useOcrEditPersistence() {
  const queryClient = useQueryClient();
  const saveTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const refreshMasterRef = useRef<Set<number>>(new Set());

  const saveEditMutation = useMutation({
    mutationFn: async ({
      rowId,
      payload,
    }: {
      rowId: number;
      payload: OcrResultEditPayload;
      refreshMaster: boolean;
    }) => ocrResultsApi.saveEdit(rowId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ocr-results"] });
    },
    onError: (error: unknown) => {
      console.error("Failed to save OCR edits:", error);
      const err = error as { response?: { data?: { detail?: string | object } }; message?: string };
      const detail = err.response?.data?.detail;
      const detailMsg = typeof detail === "string" ? detail : JSON.stringify(detail);
      toast.error(`保存に失敗しました: ${detailMsg || err.message}`);
    },
  });

  const persistEdits = useCallback(
    (row: OcrResultItem, input: RowInputState) => {
      const refreshMaster = refreshMasterRef.current.has(row.id);
      refreshMasterRef.current.delete(row.id);
      saveEditMutation.mutate({
        rowId: row.id,
        payload: buildPayload(input),
        refreshMaster,
      });
    },
    [saveEditMutation],
  );

  const scheduleSave = useCallback(
    (row: OcrResultItem, input: RowInputState) => {
      const existing = saveTimersRef.current.get(row.id);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => persistEdits(row, input), 800);
      saveTimersRef.current.set(row.id, timer);
    },
    [persistEdits],
  );

  return {
    saveEditMutation,
    scheduleSave,
    saveTimersRef,
    refreshMasterRef,
  };
}
