import { BulkPermanentDeleteDialog, BulkSoftDeleteDialog } from "@/components/common";

interface MasterBulkDialogProps {
  isAdmin: boolean;
  isOpen: boolean;
  onOpenChange: (o: boolean) => void;
  count: number;
  isPending: boolean;
  onConfirmPermanent: () => void;
  onConfirmSoft: (endDate: string | null) => void;
  entityName: string;
}

/**
 * 権限に応じて一括完全削除または一括無効化を切り替える共通ダイアログ
 */
export function MasterBulkDialog({
  isAdmin,
  isOpen,
  onOpenChange,
  count,
  isPending,
  onConfirmPermanent,
  onConfirmSoft,
  entityName,
}: MasterBulkDialogProps) {
  if (isAdmin) {
    return (
      <BulkPermanentDeleteDialog
        open={isOpen}
        onOpenChange={onOpenChange}
        selectedCount={count}
        onConfirm={onConfirmPermanent}
        isPending={isPending}
        title={`選択した${entityName}を完全に削除しますか？`}
        description={`選択された ${count} 件の${entityName}を完全に削除します。この操作は取り消せません。`}
      />
    );
  }

  return (
    <BulkSoftDeleteDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      selectedCount={count}
      onConfirm={onConfirmSoft}
      isPending={isPending}
      title={`選択した${entityName}を無効化しますか？`}
      description={`選択された ${count} 件の${entityName}を無効化します。`}
    />
  );
}
