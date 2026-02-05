/**
 * Supplier Mutation Hooks
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";
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
    // onError is handled by global MutationCache
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  const isConflictError = (error: unknown) =>
    error instanceof HTTPError && error.response?.status === 409;
  return useMutation({
    mutationFn: ({ supplierCode, data }: { supplierCode: string; data: SupplierUpdate }) =>
      updateSupplier(supplierCode, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suppliersQueryKey });
      toast.success("仕入先を更新しました");
    },
    onError: (error) => {
      if (isConflictError(error)) {
        toast.error("他のユーザーが更新しました。最新データを取得して再度お試しください。");
        queryClient.invalidateQueries({ queryKey: suppliersQueryKey });
      }
    },
    // onError is handled by global MutationCache
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  const isConflictError = (error: unknown) =>
    error instanceof HTTPError && error.response?.status === 409;
  return useMutation({
    mutationFn: ({ supplierCode, version }: { supplierCode: string; version: number }) =>
      deleteSupplier(supplierCode, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suppliersQueryKey });
      toast.success("仕入先を削除しました");
    },
    onError: (error) => {
      if (isConflictError(error)) {
        toast.error("他のユーザーが更新しました。最新データを取得して再度お試しください。");
        queryClient.invalidateQueries({ queryKey: suppliersQueryKey });
      }
    },
    // onError is handled by global MutationCache
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
    // onError is handled by global MutationCache
  });
}
