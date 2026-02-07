import { SupplierDetailDialog } from "./SupplierDetailDialog";
import { SupplierForm } from "./SupplierForm";

import {
  SoftDeleteDialog,
  PermanentDeleteDialog,
  RestoreDialog,
  BulkPermanentDeleteDialog,
  BulkSoftDeleteDialog,
} from "@/components/common";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { MasterImportDialog } from "@/features/masters/components/MasterImportDialog";

interface SupplierDialogContainerProps {
  p: any;
}

export function SupplierDialogContainer({ p }: SupplierDialogContainerProps) {
  return (
    <>
      <Dialog open={p.dlgs.isCreateOpen} onOpenChange={(o) => !o && p.dlgs.close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>仕入先新規登録</DialogTitle>
          </DialogHeader>
          <SupplierForm
            onSubmit={p.handleCreate}
            onCancel={p.dlgs.close}
            isSubmitting={p.create.isPending}
          />
        </DialogContent>
      </Dialog>

      <MasterImportDialog
        open={p.dlgs.isImportOpen}
        onOpenChange={(o) => !o && p.dlgs.close()}
        title="仕入先マスタ インポート"
        group="supply"
      />

      <SoftDeleteDialog
        open={p.dlgs.isSoftDeleteOpen}
        onOpenChange={(o) => !o && p.dlgs.close()}
        title="仕入先を無効化しますか？"
        description={`${p.dlgs.deletingItem?.supplier_name}（${p.dlgs.deletingItem?.supplier_code}）を無効化します。`}
        onConfirm={p.handleSoftDelete}
        isPending={p.softDel.isPending}
        onSwitchToPermanent={p.dlgs.switchToPermanentDelete}
      />

      <PermanentDeleteDialog
        open={p.dlgs.isPermanentDeleteOpen}
        onOpenChange={(o) => !o && p.dlgs.close()}
        onConfirm={p.handlePermanentDelete}
        isPending={p.permDel.isPending}
        title="仕入先を完全に削除しますか？"
        description={`${p.dlgs.deletingItem?.supplier_name} を完全に削除します。`}
        confirmationPhrase={p.dlgs.deletingItem?.supplier_code || "delete"}
      />

      <RestoreDialog
        open={p.dlgs.isRestoreOpen}
        onOpenChange={(o) => !o && p.dlgs.close()}
        onConfirm={p.handleRestore}
        isPending={p.rest.isPending}
        title="仕入先を復元しますか？"
        description={`${p.dlgs.restoringItem?.supplier_name} を有効状態に戻します。`}
      />

      {p.isAdmin ? (
        <BulkPermanentDeleteDialog
          open={p.isBulkOpen}
          onOpenChange={p.setIsBulkOpen}
          selectedCount={p.selectedIds.length}
          onConfirm={() => p.executeBulk(p.permDel.mutateAsync, "完全削除")}
          isPending={p.isBulkDeleting}
          title="選択した仕入先を完全に削除しますか？"
          description={`選択された ${p.selectedIds.length} 件の仕入先を完全に削除します。`}
        />
      ) : (
        <BulkSoftDeleteDialog
          open={p.isBulkOpen}
          onOpenChange={p.setIsBulkOpen}
          selectedCount={p.selectedIds.length}
          onConfirm={(e: string | null) =>
            p.executeBulk(
              (d: any) => p.softDel.mutateAsync({ ...d, endDate: e || undefined }),
              "無効化",
            )
          }
          isPending={p.isBulkDeleting}
          title="選択した仕入先を無効化しますか？"
          description={`選択された ${p.selectedIds.length} 件の仕入先を無効化します。`}
        />
      )}

      <SupplierDetailDialog
        supplierCode={p.selectedSupplierCode}
        open={!!p.selectedSupplierCode}
        onOpenChange={(o) => !o && p.setSelectedSupplierCode(null)}
      />
    </>
  );
}
