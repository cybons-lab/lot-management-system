/**
 * useWarehouseMutations - 倉庫のCRUD + Bulk Mutations
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: warehousesQueryKey }),
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ warehouseCode, data }: { warehouseCode: string; data: WarehouseUpdate }) =>
      updateWarehouse(warehouseCode, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: warehousesQueryKey }),
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (warehouseCode: string) => deleteWarehouse(warehouseCode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: warehousesQueryKey }),
  });
}

export function useBulkUpsertWarehouses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: WarehouseBulkRow[]) => bulkUpsertWarehouses(rows),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: warehousesQueryKey }),
  });
}
