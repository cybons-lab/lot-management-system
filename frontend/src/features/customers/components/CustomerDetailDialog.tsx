/**
 * CustomerDetailDialog
 * 得意先詳細・編集ダイアログ
 */
import { Edit, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import type { CustomerUpdate } from "../api";
import { useCustomers } from "../hooks";

import { CustomerForm } from "./CustomerForm";

import { DeleteDialog, type DeleteType } from "@/components/common/DeleteDialog";
import { Button } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/layout/dialog";

interface CustomerDetailDialogProps {
  customerCode: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// eslint-disable-next-line max-lines-per-function, complexity
export function CustomerDetailDialog({
  customerCode,
  open,
  onOpenChange,
}: CustomerDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<DeleteType>("soft");

  // コード変更後の404を防ぐため、更新中は再取得を停止
  const [isCodeChanging, setIsCodeChanging] = useState(false);

  const { useGet, useUpdate, useSoftDelete, usePermanentDelete } = useCustomers();
  // ダイアログが開いていて、コード変更中でない場合のみクエリを有効化
  const { data: customer, isLoading } = useGet(open && !isCodeChanging ? customerCode || "" : "");
  const { mutate: updateCustomer, isPending: isUpdating } = useUpdate();
  const { mutate: softDelete, isPending: isSoftDeleting } = useSoftDelete();
  const { mutate: permanentDelete, isPending: isPermanentDeleting } = usePermanentDelete();
  const isDeleting = isSoftDeleting || isPermanentDeleting;

  const handleClose = useCallback(() => {
    setIsEditing(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleUpdate = useCallback(
    (data: { customer_code: string; customer_name: string }) => {
      if (!customerCode || !customer) return;

      // コード変更時は再取得を停止してからAPI呼び出し
      const isChangingCode = data.customer_code !== customerCode;
      if (isChangingCode) {
        setIsCodeChanging(true);
      }

      const updateData: CustomerUpdate = {
        customer_code: data.customer_code,
        customer_name: data.customer_name,
        version: customer.version,
      };
      updateCustomer(
        { id: customerCode, data: updateData },
        {
          onSuccess: () => {
            setIsEditing(false);
            // コード変更時はダイアログを閉じる
            if (isChangingCode) {
              handleClose();
              setIsCodeChanging(false);
            }
          },
          onError: () => {
            // エラー時は再取得を再開
            setIsCodeChanging(false);
          },
        },
      );
    },
    [customer, customerCode, updateCustomer, handleClose],
  );

  const handleConfirmDelete = useCallback(
    (endDate?: string | null) => {
      if (!customerCode || !customer) return;

      const onSuccess = () => {
        setIsDeleteDialogOpen(false);
        handleClose();
      };

      if (deleteType === "soft") {
        softDelete(
          { id: customerCode, version: customer.version, endDate: endDate || undefined },
          { onSuccess },
        );
      } else {
        permanentDelete({ id: customerCode, version: customer.version }, { onSuccess });
      }
    },
    [customer, customerCode, deleteType, softDelete, permanentDelete, handleClose],
  );

  if (!customerCode && !open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        {/* モーダル外クリックで閉じないように onInteractOutside を設定 */}
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
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">得意先コード</span>
                    <p className="font-mono text-lg font-medium">{customer.customer_code}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">得意先名</span>
                    <p className="text-lg font-medium">{customer.customer_name}</p>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">短縮名</span>
                  <p className="text-lg">{customer.short_name || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">作成日時</span>
                    <p className="text-sm text-gray-600">
                      {new Date(customer.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">更新日時</span>
                    <p className="text-sm text-gray-600">
                      {new Date(customer.updated_at).toLocaleString("ja-JP")}
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

      {/* 削除確認ダイアログ */}
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
