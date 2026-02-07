import { useCallback, useState } from "react";

import type { CustomerUpdate } from "../api";
import { useCustomers } from "../hooks";

import { type DeleteType } from "@/components/common/DeleteDialog";

interface UseCustomerDetailProps {
  customerCode: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function useCustomerDetail({ customerCode, open, onOpenChange }: UseCustomerDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<DeleteType>("soft");
  const [isCodeChanging, setIsCodeChanging] = useState(false);

  const { useGet, useUpdate, useSoftDelete, usePermanentDelete } = useCustomers();

  // ダイアログが開いていて、コード変更中でない場合のみクエリを有効化
  const queryEnabled = open && !isCodeChanging;
  const { data: customer, isLoading } = useGet(queryEnabled ? customerCode || "" : "");

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
            if (isChangingCode) {
              handleClose();
              setIsCodeChanging(false);
            }
          },
          onError: () => {
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

  return {
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
  };
}
