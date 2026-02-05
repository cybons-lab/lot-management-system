/**
 * useWarehouseMutations - 倉庫のCRUD + Bulk Mutations
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { toast } from "sonner";

import {
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  bulkUpsertWarehouses,
  type WarehouseCreate,
  type WarehouseUpdate,
} from "../api";
import type { WarehouseBulkRow } from "../types/bulk-operation";

// Query key for cache invalidation
const warehousesQueryKey = ["warehouses"] as const;

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WarehouseCreate) => createWarehouse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehousesQueryKey });
      toast.success("倉庫を登録しました");
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  const isConflictError = (error: unknown) =>
    error instanceof HTTPError && error.response?.status === 409;
  return useMutation({
    mutationFn: ({ warehouseCode, data }: { warehouseCode: string; data: WarehouseUpdate }) =>
      updateWarehouse(warehouseCode, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehousesQueryKey });
      toast.success("倉庫を更新しました");
    },
    onError: (error) => {
      if (isConflictError(error)) {
        toast.error("他のユーザーが更新しました。最新データを取得して再度お試しください。");
        queryClient.invalidateQueries({ queryKey: warehousesQueryKey });
      }
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  const isConflictError = (error: unknown) =>
    error instanceof HTTPError && error.response?.status === 409;
  return useMutation({
    mutationFn: ({ warehouseCode, version }: { warehouseCode: string; version: number }) =>
      deleteWarehouse(warehouseCode, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehousesQueryKey });
      toast.success("倉庫を削除しました");
    },
    onError: (error) => {
      if (isConflictError(error)) {
        toast.error("他のユーザーが更新しました。最新データを取得して再度お試しください。");
        queryClient.invalidateQueries({ queryKey: warehousesQueryKey });
      }
    },
  });
}

export function useBulkUpsertWarehouses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: WarehouseBulkRow[]) => bulkUpsertWarehouses(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehousesQueryKey });
      toast.success("倉庫を一括登録しました");
    },
  });
}
