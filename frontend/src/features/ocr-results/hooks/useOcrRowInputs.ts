import { useCallback, useEffect, useState } from "react";

import { type OcrResultItem } from "../api";
import { buildRowDefaults, type RowInputState } from "../pages/OcrResultsTableCells";
import { buildPayload } from "../utils/ocr-utils";

import { useOcrEditPersistence } from "./useOcrEditPersistence";

export function useOcrRowInputs(viewMode: "current" | "completed", dataItems: OcrResultItem[]) {
  const [rowInputs, setRowInputs] = useState<Record<number, RowInputState>>({});
  const { saveEditMutation, scheduleSave, saveTimersRef, refreshMasterRef } =
    useOcrEditPersistence();

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
    [scheduleSave, viewMode, refreshMasterRef],
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
  }, [dataItems, rowInputs, saveEditMutation, saveTimersRef, refreshMasterRef]);

  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [saveTimersRef]);

  return {
    rowInputs,
    getInputs,
    updateInputs,
    flushPendingEdits,
    saveEditMutation,
  };
}
