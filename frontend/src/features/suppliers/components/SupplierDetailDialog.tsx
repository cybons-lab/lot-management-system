/**
 * SupplierDetailDialog
 * 仕入先詳細・編集ダイアログ
 */
import { Edit, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import type { SupplierUpdate } from "../api";
import { useSuppliers } from "../hooks";

import { SupplierForm } from "./SupplierForm";

import { DeleteDialog, type DeleteType } from "@/components/common/DeleteDialog";
import { Button } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";

interface SupplierDetailDialogProps {
  supplierCode: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierDetailDialog({
  supplierCode,
  open,
  onOpenChange,
}: SupplierDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<DeleteType>("soft");

  const { useGet, useUpdate, useSoftDelete, usePermanentDelete } = useSuppliers();
  const { data: supplier, isLoading } = useGet(supplierCode || "");
  const { mutate: updateSupplier, isPending: isUpdating } = useUpdate();
  const { mutate: softDelete, isPending: isSoftDeleting } = useSoftDelete();
  const { mutate: permanentDelete, isPending: isPermanentDeleting } = usePermanentDelete();
  const isDeleting = isSoftDeleting || isPermanentDeleting;

  const handleClose = useCallback(() => {
    setIsEditing(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleUpdate = useCallback(
    (data: { supplier_code: string; supplier_name: string }) => {
      if (!supplierCode) return;

      const updateData: SupplierUpdate = {
        supplier_code: data.supplier_code,
        supplier_name: data.supplier_name,
      };
      updateSupplier(
        { id: supplierCode, data: updateData },
        {
          onSuccess: () => {
            setIsEditing(false);
          },
        },
      );
    },
    [supplierCode, updateSupplier],
  );

  const handleConfirmDelete = useCallback(
    (endDate?: string | null) => {
      if (!supplierCode) return;

      const onSuccess = () => {
        setIsDeleteDialogOpen(false);
        handleClose();
      };

      if (deleteType === "soft") {
        softDelete({ id: supplierCode, endDate: endDate || undefined }, { onSuccess });
      } else {
        permanentDelete(supplierCode, { onSuccess });
      }
    },
    [supplierCode, deleteType, softDelete, permanentDelete, handleClose],
  );

  if (!supplierCode && !open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "仕入先編集" : "仕入先詳細"}
              {supplier && (
                <span className="ml-4 text-sm font-normal text-muted-foreground">
                  {supplier.supplier_code}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {isLoading || !supplier ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
            </div>
          ) : isEditing ? (
            <SupplierForm
              supplier={supplier}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              isSubmitting={isUpdating}
            />
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">仕入先コード</span>
                    <p className="font-mono text-lg font-medium">{supplier.supplier_code}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">仕入先名</span>
                    <p className="text-lg font-medium">{supplier.supplier_name}</p>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">短縮名</span>
                  <p className="text-lg">{supplier.short_name || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">作成日時</span>
                    <p className="text-sm text-gray-600">
                      {new Date(supplier.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">更新日時</span>
                    <p className="text-sm text-gray-600">
                      {new Date(supplier.updated_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  編集
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  削除
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {supplier && (
        <DeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
            if (!open) setDeleteType("soft");
          }}
          type={deleteType}
          title={
            deleteType === "soft" ? "仕入先を無効化しますか？" : "仕入先を完全に削除しますか？"
          }
          itemName="仕入先"
          onConfirm={handleConfirmDelete}
          isPending={isDeleting}
          onSwitchToPermanent={() => setDeleteType("permanent")}
          confirmationPhrase={supplier.supplier_code}
        />
      )}
    </>
  );
}
