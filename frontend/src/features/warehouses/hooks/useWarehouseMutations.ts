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
} from "../api/warehouses-api";
import type { WarehouseBulkRow } from "../types/bulk-operation";

import { WAREHOUSES_QUERY_KEY } from "./useWarehousesQuery";

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WarehouseCreate) => createWarehouse(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WAREHOUSES_QUERY_KEY }),
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ warehouseCode, data }: { warehouseCode: string; data: WarehouseUpdate }) =>
      updateWarehouse(warehouseCode, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WAREHOUSES_QUERY_KEY }),
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (warehouseCode: string) => deleteWarehouse(warehouseCode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WAREHOUSES_QUERY_KEY }),
  });
}

export function useBulkUpsertWarehouses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: WarehouseBulkRow[]) => bulkUpsertWarehouses(rows),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WAREHOUSES_QUERY_KEY }),
  });
}
