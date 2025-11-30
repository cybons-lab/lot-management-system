import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useCreateLot, useUpdateLot, useLockLot, useUnlockLot } from "@/hooks/mutations";
import { useDialog } from "@/hooks/ui";
import type { LotUI } from "@/shared/libs/normalize";

/**
 * ロット操作のmutationとダイアログ管理
 */
export function useLotMutations(allLots: LotUI[]) {
    const createDialog = useDialog();
    const editDialog = useDialog();
    const lockDialog = useDialog();
    const [selectedLot, setSelectedLot] = useState<LotUI | null>(null);

    const createLotMutation = useCreateLot({
        onSuccess: () => {
            toast.success("ロットを作成しました");
            createDialog.close();
        },
        onError: (error) => toast.error(`作成に失敗しました: ${error.message}`),
    });

    const updateLotMutation = useUpdateLot(selectedLot?.id ?? 0, {
        onSuccess: () => {
            toast.success("ロットを更新しました");
            editDialog.close();
            setSelectedLot(null);
        },
        onError: (error) => toast.error(`更新に失敗しました: ${error.message}`),
    });

    const lockLotMutation = useLockLot({
        onSuccess: () => {
            toast.success("ロットをロックしました");
            lockDialog.close();
            setSelectedLot(null);
        },
        onError: (error) => toast.error(`ロックに失敗しました: ${error.message}`),
    });

    const unlockLotMutation = useUnlockLot({
        onSuccess: () => {
            toast.success("ロットのロックを解除しました");
        },
        onError: (error) => toast.error(`ロック解除に失敗しました: ${error.message}`),
    });

    const handleEdit = useCallback(
        (lot: LotUI) => {
            const lotData = allLots.find((l) => l.id === lot.id);
            if (lotData) {
                setSelectedLot(lotData);
                editDialog.open();
            }
        },
        [allLots, editDialog],
    );

    const handleLock = useCallback(
        (lot: LotUI) => {
            const lotData = allLots.find((l) => l.id === lot.id);
            if (lotData) {
                setSelectedLot(lotData);
                lockDialog.open();
            }
        },
        [allLots, lockDialog],
    );

    const handleUnlock = useCallback(
        async (lot: LotUI) => {
            if (confirm(`ロット ${lot.lot_number} のロックを解除しますか？`)) {
                await unlockLotMutation.mutateAsync({ id: lot.id });
            }
        },
        [unlockLotMutation],
    );

    return {
        selectedLot,
        createDialog,
        editDialog,
        lockDialog,
        createLotMutation,
        updateLotMutation,
        lockLotMutation,
        unlockLotMutation,
        handleEdit,
        handleLock,
        handleUnlock,
        setSelectedLot,
    };
}
