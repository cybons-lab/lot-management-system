import { BulkPermanentDeleteDialog, BulkSoftDeleteDialog } from "@/components/common";

export function CustomerBulkDialogs({
  isAdmin,
  isOpen,
  onOpenChange,
  count,
  isPending,
  onConfirmP,
  onConfirmS,
}: any) {
  return isAdmin ? (
    <BulkPermanentDeleteDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      selectedCount={count}
      onConfirm={onConfirmP}
      isPending={isPending}
      title="一括削除"
      description={`${count} 件を完全に削除します。`}
    />
  ) : (
    <BulkSoftDeleteDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      selectedCount={count}
      onConfirm={onConfirmS}
      isPending={isPending}
      title="一括無効化"
      description={`${count} 件を無効化します。`}
    />
  );
}
