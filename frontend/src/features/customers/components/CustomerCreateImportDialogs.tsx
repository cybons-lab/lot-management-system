import { CustomerForm } from "./CustomerForm";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";
import { MasterImportDialog } from "@/features/masters/components/MasterImportDialog";

export function CustomerCreateImportDialogs({
  isCreateOpen,
  isImportOpen,
  isCreating,
  close,
  handleCreate,
}: any) {
  return (
    <>
      <Dialog open={isCreateOpen} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>得意先新規登録</DialogTitle>
          </DialogHeader>
          <CustomerForm onSubmit={handleCreate} onCancel={close} isSubmitting={isCreating} />
        </DialogContent>
      </Dialog>
      <MasterImportDialog
        open={isImportOpen}
        onOpenChange={(o) => !o && close()}
        title="得意先マスタ インポート"
        group="customer"
      />
    </>
  );
}
