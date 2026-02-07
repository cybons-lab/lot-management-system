import { SoftDeleteDialog, PermanentDeleteDialog, RestoreDialog } from "@/components/common";

export function CustomerActionDialogs({
  dlgs,
  isSDeleting,
  isPDeleting,
  isRestoring,
  handlers,
}: any) {
  return (
    <>
      <SoftDeleteDialog
        open={dlgs.isSoftDeleteOpen}
        onOpenChange={(o) => !o && dlgs.close()}
        title="無効化"
        description={`${dlgs.deletingItem?.customer_name} を無効化します。`}
        onConfirm={handlers.handleSoftDelete}
        isPending={isSDeleting}
        onSwitchToPermanent={dlgs.switchToPermanentDelete}
      />
      <PermanentDeleteDialog
        open={dlgs.isPermanentDeleteOpen}
        onOpenChange={(o) => !o && dlgs.close()}
        onConfirm={handlers.handlePermanentDelete}
        isPending={isPDeleting}
        title="完全削除"
        description={`${dlgs.deletingItem?.customer_name} を削除します。`}
        confirmationPhrase={dlgs.deletingItem?.customer_code || "delete"}
      />
      <RestoreDialog
        open={dlgs.isRestoreOpen}
        onOpenChange={(o) => !o && dlgs.close()}
        onConfirm={handlers.handleRestore}
        isPending={isRestoring}
        title="復元"
        description={`${dlgs.restoringItem?.customer_name} を復元します。`}
      />
    </>
  );
}
