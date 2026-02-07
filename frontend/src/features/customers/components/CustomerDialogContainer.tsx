import { CustomerActionDialogs } from "./CustomerActionDialogs";
import { CustomerBulkDialogs } from "./CustomerBulkDialogs";
import { CustomerCreateImportDialogs } from "./CustomerCreateImportDialogs";
import { CustomerDetailDialog } from "./CustomerDetailDialog";

interface CustomerDialogContainerProps {
  p: any;
}

export function CustomerDialogContainer({ p }: CustomerDialogContainerProps) {
  return (
    <>
      <CustomerCreateImportDialogs
        isCreateOpen={p.dlgs.isCreateOpen}
        isImportOpen={p.dlgs.isImportOpen}
        isCreating={p.create.isPending}
        close={p.dlgs.close}
        handleCreate={p.handleCreate}
      />
      <CustomerActionDialogs
        dlgs={p.dlgs}
        isSDeleting={p.softDel.isPending}
        isPDeleting={p.permDel.isPending}
        isRestoring={p.rest.isPending}
        handlers={p}
      />
      <CustomerBulkDialogs
        isAdmin={p.isAdmin}
        isOpen={p.isBulkOpen}
        onOpenChange={p.setIsBulkOpen}
        count={p.selectedIds.length}
        isPending={p.isBulkDeleting}
        onConfirmP={() => p.executeBulk(p.permDel.mutateAsync, "完全削除")}
        onConfirmS={(e: any) =>
          p.executeBulk(
            (d: any) => p.softDel.mutateAsync({ ...d, endDate: e || undefined }),
            "無効化",
          )
        }
      />
      <CustomerDetailDialog
        customerCode={p.selectedCustomerCode}
        open={!!p.selectedCustomerCode}
        onOpenChange={(o) => !o && p.setSelectedCustomerCode(null)}
      />
    </>
  );
}
