/**
 * UomConversionsDeleteRestoreDialogs - 削除/復元確認ダイアログ群
 */
import type { UomConversionResponse } from "../api";

import { SoftDeleteDialog, PermanentDeleteDialog, RestoreDialog } from "@/components/common";

interface UomConversionsDeleteRestoreDialogsProps {
  deletingItem: UomConversionResponse | null;
  deleteMode: "soft" | "permanent";
  restoringItem: UomConversionResponse | null;
  onCloseDeleteDialog: () => void;
  onCloseRestoreDialog: () => void;
  onSwitchToPermanent: () => void;
  onSoftDelete: (endDate: string | null) => void;
  onPermanentDelete: () => void;
  onRestore: () => void;
  isSoftDeleting: boolean;
  isPermanentDeleting: boolean;
  isRestoring: boolean;
}

export function UomConversionsDeleteRestoreDialogs({
  deletingItem,
  deleteMode,
  restoringItem,
  onCloseDeleteDialog,
  onCloseRestoreDialog,
  onSwitchToPermanent,
  onSoftDelete,
  onPermanentDelete,
  onRestore,
  isSoftDeleting,
  isPermanentDeleting,
  isRestoring,
}: UomConversionsDeleteRestoreDialogsProps) {
  return (
    <>
      <SoftDeleteDialog
        open={!!deletingItem && deleteMode === "soft"}
        onOpenChange={(open) => !open && onCloseDeleteDialog()}
        title="単位換算を無効化しますか？"
        description={`${deletingItem?.product_name} (${deletingItem?.external_unit}) の設定を無効化します。`}
        onConfirm={onSoftDelete}
        isPending={isSoftDeleting}
        onSwitchToPermanent={onSwitchToPermanent}
      />

      <PermanentDeleteDialog
        open={!!deletingItem && deleteMode === "permanent"}
        onOpenChange={(open) => !open && onCloseDeleteDialog()}
        onConfirm={onPermanentDelete}
        isPending={isPermanentDeleting}
        title="単位換算を完全に削除しますか？"
        description={`${deletingItem?.product_name} (${deletingItem?.external_unit}) の設定を完全に削除します。`}
        confirmationPhrase={deletingItem?.external_unit || "delete"}
      />

      <RestoreDialog
        open={!!restoringItem}
        onOpenChange={(open) => !open && onCloseRestoreDialog()}
        onConfirm={onRestore}
        isPending={isRestoring}
        title="設定を復元しますか？"
        description={`${restoringItem?.product_name} (${restoringItem?.external_unit}) の設定を有効状態に戻します。`}
      />
    </>
  );
}
