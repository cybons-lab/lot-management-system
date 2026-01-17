import { useState, useCallback } from "react";

import type { InventoryItem } from "@/features/inventory/api";
import type { LotUI } from "@/shared/libs/normalize";

/** ダイアログの状態型 - 排他的に1つだけ開く */
type DialogState =
  | { type: "none" }
  | { type: "withdrawal"; lot: LotUI }
  | { type: "history"; lot: LotUI }
  | { type: "quickIntake"; item: InventoryItem };

export function useInventoryDialogs() {
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });

  const openWithdrawal = useCallback((lot: LotUI) => {
    setDialog({ type: "withdrawal", lot });
  }, []);

  const openHistory = useCallback((lot: LotUI) => {
    setDialog({ type: "history", lot });
  }, []);

  const openQuickIntake = useCallback((item: InventoryItem) => {
    setDialog({ type: "quickIntake", item });
  }, []);

  const close = useCallback(() => {
    setDialog({ type: "none" });
  }, []);

  return {
    dialog,
    openWithdrawal,
    openHistory,
    openQuickIntake,
    close,
    // 便利なゲッター
    isWithdrawalOpen: dialog.type === "withdrawal",
    isHistoryOpen: dialog.type === "history",
    isQuickIntakeOpen: dialog.type === "quickIntake",
    withdrawalLot: dialog.type === "withdrawal" ? dialog.lot : null,
    historyLot: dialog.type === "history" ? dialog.lot : null,
    quickIntakeItem: dialog.type === "quickIntake" ? dialog.item : null,
  };
}
