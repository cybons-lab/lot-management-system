/**
 * Supplier Mutation Hooks
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { SupplierCreate, SupplierUpdate } from "../api";
import { createSupplier, updateSupplier, deleteSupplier, bulkUpsertSuppliers } from "../api";
import type { SupplierBulkRow } from "../types/bulk-operation";

// Query key for cache invalidation
const suppliersQueryKey = ["suppliers"] as const;

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SupplierCreate) => createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suppliersQueryKey });
      toast.success("仕入先を登録しました");
    },
    onError: () => toast.error("仕入先の登録に失敗しました"),
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierCode, data }: { supplierCode: string; data: SupplierUpdate }) =>
      updateSupplier(supplierCode, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suppliersQueryKey });
      toast.success("仕入先を更新しました");
    },
    onError: () => toast.error("仕入先の更新に失敗しました"),
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (supplierCode: string) => deleteSupplier(supplierCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suppliersQueryKey });
      toast.success("仕入先を削除しました");
    },
    onError: () => toast.error("仕入先の削除に失敗しました"),
  });
}

export function useBulkUpsertSuppliers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: SupplierBulkRow[]) => bulkUpsertSuppliers(rows),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: suppliersQueryKey });
      const { summary } = result;
      if (result.status === "success") {
        toast.success(`${summary.total}件の処理が完了しました`);
      } else if (result.status === "partial") {
        toast.warning(`${summary.total}件中${summary.failed}件が失敗しました`);
      } else {
        toast.error("すべての処理が失敗しました");
      }
    },
    onError: () => toast.error("一括処理に失敗しました"),
  });
}
