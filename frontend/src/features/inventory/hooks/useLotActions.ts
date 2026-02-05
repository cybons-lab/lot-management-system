import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useLotMutations } from "@/hooks/api/useLotMutations";
import { useUpdateLot, useLockLot, useUnlockLot } from "@/hooks/mutations";
import { useDialog } from "@/hooks/ui";
import type { LotUI } from "@/shared/libs/normalize";
import { getUserFriendlyMessageAsync } from "@/utils/errors/api-error-handler";

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
    onError: async (error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`ロットの更新に失敗しました: ${message}`);
    },
  });

  const lockLotMutation = useLockLot({
    onSuccess: () => {
      toast.success("ロットをロックしました");
      lockDialog.close();
      setSelectedLot(null);
      notifyLotsChanged();
    },
    onError: async (error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`ロックに失敗しました: ${message}`);
    },
  });

  const unlockLotMutation = useUnlockLot({
    onSuccess: () => {
      toast.success("ロットのロックを解除しました");
      notifyLotsChanged();
    },
    onError: async (error) => {
      const message = await getUserFriendlyMessageAsync(error);
      toast.error(`ロック解除に失敗しました: ${message}`);
    },
  });

  const { archiveLot, isArchiving } = useLotMutations();

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
      const hasInventory = Number(lot.current_quantity) > 0;

      if (hasInventory) {
        // 在庫がある場合はロット番号の確認が必要
        const confirmMessage = `ロット ${lot.lot_number} には在庫が残っています。\n\nアーカイブを続行するには、ロット番号を入力してください:`;
        const inputLotNumber = prompt(confirmMessage);

        if (!inputLotNumber) {
          // キャンセルまたは空入力
          return;
        }

        if (inputLotNumber !== lot.lot_number) {
          toast.error("ロット番号が一致しません");
          return;
        }

        // ロット番号が一致した場合、確認用ロット番号付きでアーカイブ
        await archiveLot({ id: lot.id, lotNumber: inputLotNumber });
        notifyLotsChanged();
      } else {
        // 在庫がない場合は通常の確認のみ
        if (
          confirm(
            `ロット ${lot.lot_number} をアーカイブしますか?\nアーカイブされたロットは通常の一覧からは非表示になります。`,
          )
        ) {
          await archiveLot({ id: lot.id });
          notifyLotsChanged();
        }
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
    handleUnarchiveLot: useCallback(
      async (lot: LotUI) => {
        if (
          confirm(
            `ロット ${lot.lot_number} のアーカイブを解除しますか?\nアーカイブ解除すると、再びロット一覧に表示されるようになります。`,
          )
        ) {
          setSelectedLot(lot);
          await updateLotMutation.mutateAsync({ status: "active" });
        }
      },
      [updateLotMutation],
    ),
    handleCloseEdit,
    handleCloseLock,
    archiveLot,
    isArchiving,
  };
}
