import { useCustomerDetail } from "../hooks/useCustomerDetail";

import { CustomerDetailActions } from "./CustomerDetailActions";
import { CustomerDetailView } from "./CustomerDetailView";
import { CustomerForm } from "./CustomerForm";

import { DeleteDialog } from "@/components/common/DeleteDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";

interface CustomerDetailDialogProps {
  customerCode: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetailDialog(props: CustomerDetailDialogProps) {
  const { customerCode, open } = props;
  const {
    customer,
    isLoading,
    isEditing,
    setIsEditing,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    deleteType,
    setDeleteType,
    isDeleting,
    isUpdating,
    handleClose,
    handleUpdate,
    handleConfirmDelete,
  } = useCustomerDetail(props);

  if (!customerCode && !open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "得意先編集" : "得意先詳細"}
              {customer && (
                <span className="ml-4 text-sm font-normal text-muted-foreground">
                  {customer.customer_code}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {isLoading || !customer ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
            </div>
          ) : isEditing ? (
            <CustomerForm
              customer={customer}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              isSubmitting={isUpdating}
            />
          ) : (
            <div className="space-y-6">
              <CustomerDetailView customer={customer} />
              <CustomerDetailActions
                onEdit={() => setIsEditing(true)}
                onDelete={() => setIsDeleteDialogOpen(true)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {customer && (
        <DeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
            if (!open) setDeleteType("soft");
          }}
          type={deleteType}
          title={
            deleteType === "soft" ? "得意先を無効化しますか？" : "得意先を完全に削除しますか？"
          }
          itemName="得意先"
          onConfirm={handleConfirmDelete}
          isPending={isDeleting}
          onSwitchToPermanent={() => setDeleteType("permanent")}
          confirmationPhrase={customer.customer_code}
        />
      )}
    </>
  );
}
