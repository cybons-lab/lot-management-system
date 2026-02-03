import { useCallback, useEffect, useState } from "react";

import { type OcrResultItem } from "../api";
import { buildRowDefaults, type RowInputState } from "../pages/OcrResultsTableCells";
import { buildPayload, computeShippingSlipText, computeShippingDate } from "../utils/ocr-utils";

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
        let next = { ...current, ...patch };

        // 納期が変更された場合、出荷日を再計算する
        if ("deliveryDate" in patch && patch.deliveryDate) {
          const newShippingDate = computeShippingDate(patch.deliveryDate, row.transport_lt_days);
          if (newShippingDate) {
            next = { ...next, shippingDate: newShippingDate };
          }
        }

        // 手動編集フラグが立っていない場合、依存フィールドの変更に合わせてテキストを再計算して保存対象に入れる
        if (!next.shippingSlipTextEdited) {
          next.shippingSlipText = computeShippingSlipText(row.shipping_slip_text, next, row);
        }

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
