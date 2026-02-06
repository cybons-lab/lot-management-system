import { useCallback, useEffect, useState } from "react";

import { type OcrResultItem } from "../api";
import { buildRowDefaults } from "../pages/OcrResultsTableCells";
import {
  buildPayload,
  computeShippingSlipText,
  computeShippingDate,
  type RowInputState,
} from "../utils/ocr-utils";

import { useOcrEditPersistence } from "./useOcrEditPersistence";

function buildNextInputState(
  row: OcrResultItem,
  current: RowInputState,
  patch: Partial<RowInputState>,
): RowInputState {
  let next = { ...current, ...patch };

  if ("deliveryDate" in patch) {
    if (patch.deliveryDate) {
      const newShippingDate = computeShippingDate(patch.deliveryDate, row.transport_lt_days);
      if (newShippingDate) next = { ...next, shippingDate: newShippingDate };
    } else {
      next = { ...next, shippingDate: "" };
    }
  }

  if (!next.shippingSlipTextEdited) {
    next.shippingSlipText = computeShippingSlipText(row.shipping_slip_text, next);
  }

  return next;
}

function syncInputVersionsWithRows(
  prev: Record<number, RowInputState>,
  dataItems: OcrResultItem[],
): Record<number, RowInputState> {
  let changed = false;
  const next = { ...prev };

  for (const row of dataItems) {
    const existing = prev[row.id];
    if (existing && existing.version !== row.manual_version) {
      next[row.id] = { ...existing, version: row.manual_version ?? 0 };
      changed = true;
    }
  }

  return changed ? next : prev;
}

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
        const next = buildNextInputState(row, current, patch);

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

  useEffect(() => {
    if (viewMode === "completed") return;
    setRowInputs((prev) => syncInputVersionsWithRows(prev, dataItems));
  }, [dataItems, viewMode]);

  return {
    rowInputs,
    getInputs,
    updateInputs,
    flushPendingEdits,
    saveEditMutation,
  };
}
