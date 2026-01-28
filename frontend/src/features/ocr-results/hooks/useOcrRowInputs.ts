import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ocrResultsApi, type OcrResultItem, type OcrResultEditPayload } from "../api";
import { buildRowDefaults, type RowInputState } from "../pages/OcrResultsTableCells";
import { buildPayload } from "../utils/ocr-utils";

export function useOcrRowInputs(viewMode: "current" | "completed", dataItems: OcrResultItem[]) {
  const [rowInputs, setRowInputs] = useState<Record<number, RowInputState>>({});
  const saveTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const refreshMasterRef = useRef<Set<number>>(new Set());
  const queryClient = useQueryClient();

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

  const updateInputs = useCallback(
    (row: OcrResultItem, patch: Partial<RowInputState>) => {
      if (viewMode === "completed") return;
      if ("materialCode" in patch || "jikuCode" in patch) {
        refreshMasterRef.current.add(row.id);
      }
      setRowInputs((prev) => {
        const current = prev[row.id] ?? buildRowDefaults(row);
        const next = { ...current, ...patch };
        scheduleSave(row, next);
        return { ...prev, [row.id]: next };
      });
    },
    [scheduleSave, viewMode],
  );

  const getInputs = useCallback(
    (row: OcrResultItem) => rowInputs[row.id] ?? buildRowDefaults(row),
    [rowInputs],
  );

  const flushPendingEdits = useCallback(async () => {
    const timers = saveTimersRef.current;
    if (timers.size === 0) return;

    const rowMap = new Map(dataItems.map((row) => [row.id, row]));
    const pendingIds = Array.from(timers.keys());

    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();

    await Promise.all(
      pendingIds.map(async (rowId) => {
        const row = rowMap.get(rowId);
        const input = rowInputs[rowId];
        if (!row || !input) return;

        const refreshMaster = refreshMasterRef.current.has(rowId);
        refreshMasterRef.current.delete(rowId);

        await saveEditMutation.mutateAsync({
          rowId,
          payload: buildPayload(input),
          refreshMaster,
        });
      }),
    );
  }, [dataItems, rowInputs, saveEditMutation]);

  useEffect(() => {
    return () => {
      saveTimersRef.current.forEach((timer) => clearTimeout(timer));
      saveTimersRef.current.clear();
    };
  }, []);

  return {
    rowInputs,
    getInputs,
    updateInputs,
    flushPendingEdits,
    saveEditMutation,
  };
}
