import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useLotMutations } from "@/hooks/api/useLotMutations";
import { useUpdateLot, useLockLot, useUnlockLot } from "@/hooks/mutations";
import { useDialog } from "@/hooks/ui";
import type { LotUI } from "@/shared/libs/normalize";

/**
 * ロット操作（編集、ロック、ロック解除）のロジックを管理するカスタムフック
 */
interface LotActionsOptions {
  onLotsChanged?: () => void;
}

// eslint-disable-next-line max-lines-per-function
export function useLotActions(options?: LotActionsOptions) {
  const editDialog = useDialog();
  const lockDialog = useDialog();
  const [selectedLot, setSelectedLot] = useState<LotUI | null>(null);

  const notifyLotsChanged = useCallback(() => {
    options?.onLotsChanged?.();
  }, [options]);

  const updateLotMutation = useUpdateLot(selectedLot?.id ?? 0, {
    onSuccess: () => {
      toast.success("ロットを更新しました");
      editDialog.close();
      setSelectedLot(null);
      notifyLotsChanged();
    },
    onError: (error) => toast.error(`更新に失敗しました: ${error.message}`),
  });

  const lockLotMutation = useLockLot({
    onSuccess: () => {
      toast.success("ロットをロックしました");
      lockDialog.close();
      setSelectedLot(null);
      notifyLotsChanged();
    },
    onError: (error) => toast.error(`ロックに失敗しました: ${error.message}`),
  });

  const unlockLotMutation = useUnlockLot({
    onSuccess: () => {
      toast.success("ロットのロックを解除しました");
      notifyLotsChanged();
    },
    onError: (error) => toast.error(`ロック解除に失敗しました: ${error.message}`),
  });

  const { archiveLot } = useLotMutations();

  const handleEditLot = useCallback(
    (lot: LotUI) => {
      setSelectedLot(lot);
      editDialog.open();
    },
    [editDialog],
  );

  const handleLockLot = useCallback(
    (lot: LotUI) => {
      setSelectedLot(lot);
      lockDialog.open();
    },
    [lockDialog],
  );

  const handleUnlockLot = useCallback(
    async (lot: LotUI) => {
      if (confirm(`ロット ${lot.lot_number} のロックを解除しますか?`)) {
        await unlockLotMutation.mutateAsync({ id: lot.id });
      }
    },
    [unlockLotMutation],
  );

  const handleArchiveLot = useCallback(
    async (lot: LotUI) => {
      if (
        confirm(
          `ロット ${lot.lot_number} をアーカイブしますか?\nアーカイブされたロットは通常の一覧からは非表示になります。`,
        )
      ) {
        await archiveLot(lot.id);
        notifyLotsChanged();
      }
    },
    [archiveLot, notifyLotsChanged],
  );

  const handleCloseEdit = useCallback(() => {
    editDialog.close();
    setSelectedLot(null);
  }, [editDialog]);

  const handleCloseLock = useCallback(() => {
    lockDialog.close();
    setSelectedLot(null);
  }, [lockDialog]);

  return {
    selectedLot,
    editDialog,
    lockDialog,
    updateLotMutation,
    lockLotMutation,
    handleEditLot,
    handleLockLot,
    handleUnlockLot,
    handleArchiveLot,
    handleCloseEdit,
    handleCloseLock,
    archiveLot,
  };
}
