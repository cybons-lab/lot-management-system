import { WarehouseBulkImportDialog } from "./WarehouseBulkImportDialog";
import { WarehouseDetailDialog } from "./WarehouseDetailDialog";
import { WarehouseForm } from "./WarehouseForm";

import {
  SoftDeleteDialog,
  PermanentDeleteDialog,
  RestoreDialog,
  BulkPermanentDeleteDialog,
  BulkSoftDeleteDialog,
} from "@/components/common";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";

interface WarehouseDialogContainerProps {
  p: any;
}

export function WarehouseDialogContainer({ p }: WarehouseDialogContainerProps) {
  const { dlgs } = p;
  return (
    <>
      <Dialog open={dlgs.isCreateOpen} onOpenChange={(o) => !o && dlgs.close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>倉庫新規登録</DialogTitle>
          </DialogHeader>
          <WarehouseForm
            onSubmit={p.handleCreate}
            onCancel={dlgs.close}
            isSubmitting={p.create.isPending}
          />
        </DialogContent>
      </Dialog>
      <WarehouseBulkImportDialog
        open={dlgs.isImportOpen}
        onOpenChange={(o) => !o && dlgs.close()}
      />
      <SoftDeleteDialog
        open={dlgs.isSoftDeleteOpen}
        onOpenChange={(o) => !o && dlgs.close()}
        title="倉庫を無効化しますか？"
        description={`${dlgs.deletingItem?.warehouse_name}（${dlgs.deletingItem?.warehouse_code}）を無効化します。`}
        onConfirm={p.handleSoftDelete}
        isPending={p.softDel.isPending}
        onSwitchToPermanent={dlgs.switchToPermanentDelete}
      />
      <PermanentDeleteDialog
        open={dlgs.isPermanentDeleteOpen}
        onOpenChange={(o) => !o && dlgs.close()}
        onConfirm={p.handlePermanentDelete}
        isPending={p.permDel.isPending}
        title="倉庫を完全に削除しますか？"
        description={`${dlgs.deletingItem?.warehouse_name} を完全に削除します。`}
        confirmationPhrase={dlgs.deletingItem?.warehouse_code || "delete"}
      />
      <RestoreDialog
        open={dlgs.isRestoreOpen}
        onOpenChange={(o) => !o && dlgs.close()}
        onConfirm={p.handleRestore}
        isPending={p.rest.isPending}
        title="倉庫を復元しますか？"
        description={`${dlgs.restoringItem?.warehouse_name} を有効状態に戻します。`}
      />
      {p.isAdmin ? (
        <BulkPermanentDeleteDialog
          open={p.isBulkOpen}
          onOpenChange={p.setIsBulkOpen}
          selectedCount={p.selectedIds.length}
          onConfirm={() => p.executeBulkWithStatus(p.permDel.mutateAsync, "完全削除")}
          isPending={p.isBulkDeleting}
          title="選択した倉庫を完全に削除しますか？"
          description={`選択された ${p.selectedIds.length} 件の倉庫を完全に削除します。`}
        />
      ) : (
        <BulkSoftDeleteDialog
          open={p.isBulkOpen}
          onOpenChange={p.setIsBulkOpen}
          selectedCount={p.selectedIds.length}
          onConfirm={(e) =>
            p.executeBulkWithStatus(
              (d: any) => p.softDel.mutateAsync({ ...d, endDate: e || undefined }),
              "無効化",
            )
          }
          isPending={p.isBulkDeleting}
          title="選択した倉庫を無効化しますか？"
          description={`選択された ${p.selectedIds.length} 件の倉庫を無効化します。`}
        />
      )}
      <WarehouseDetailDialog
        warehouseCode={p.selectedWarehouseCode}
        open={!!p.selectedWarehouseCode}
        onOpenChange={(o) => !o && p.setSelectedWarehouseCode(null)}
      />
    </>
  );
}
