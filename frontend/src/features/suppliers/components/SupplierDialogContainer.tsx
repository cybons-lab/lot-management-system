import { SupplierBulkDialog } from "./SupplierBulkDialog";
import { SupplierDetailDialog } from "./SupplierDetailDialog";
import { SupplierForm } from "./SupplierForm";

import { SoftDeleteDialog, PermanentDeleteDialog, RestoreDialog } from "@/components/common";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { MasterImportDialog } from "@/features/masters/components/MasterImportDialog";

interface SupplierDialogContainerProps {
    p: any;
}

export function SupplierDialogContainer({ p }: SupplierDialogContainerProps) {
    const { dlgs } = p;
    return (
        <>
            <Dialog open={dlgs.isCreateOpen} onOpenChange={(o) => !o && dlgs.close()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>仕入先新規登録</DialogTitle></DialogHeader>
                    <SupplierForm onSubmit={p.handleCreate} onCancel={dlgs.close} isSubmitting={p.create.isPending} />
                </DialogContent>
            </Dialog>
            <MasterImportDialog open={dlgs.isImportOpen} onOpenChange={(o) => !o && dlgs.close()} title="仕入先マスタ インポート" group="supply" />
            <SoftDeleteDialog open={dlgs.isSoftDeleteOpen} onOpenChange={(o) => !o && dlgs.close()} title="仕入先を無効化しますか？" description={`${dlgs.deletingItem?.supplier_name}（${dlgs.deletingItem?.supplier_code}）を無効化します。`} onConfirm={p.handleSoftDelete} isPending={p.softDel.isPending} onSwitchToPermanent={dlgs.switchToPermanentDelete} />
            <PermanentDeleteDialog open={dlgs.isPermanentDeleteOpen} onOpenChange={(o) => !o && dlgs.close()} onConfirm={p.handlePermanentDelete} isPending={p.permDel.isPending} title="仕入先を完全に削除しますか？" description={`${dlgs.deletingItem?.supplier_name} を完全に削除します。`} confirmationPhrase={dlgs.deletingItem?.supplier_code || "delete"} />
            <RestoreDialog open={dlgs.isRestoreOpen} onOpenChange={(o) => !o && dlgs.close()} onConfirm={p.handleRestore} isPending={p.rest.isPending} title="仕入先を復元しますか？" description={`${dlgs.restoringItem?.supplier_name} を有効状態に戻します。`} />
            <SupplierBulkDialog isAdmin={p.isAdmin} isOpen={p.isBulkOpen} onOpenChange={p.setIsBulkOpen} count={p.selectedIds.length} isPending={p.isBulkDeleting} onConfirmP={() => p.executeBulkWithStatus(p.permDel.mutateAsync, "完全削除")} onConfirmS={(e) => p.executeBulkWithStatus((d: any) => p.softDel.mutateAsync({ ...d, endDate: e || undefined }), "無効化")} />
            <SupplierDetailDialog supplierCode={p.selectedSupplierCode} open={!!p.selectedSupplierCode} onOpenChange={(o) => !o && p.setSelectedSupplierCode(null)} />
        </>
    );
}
