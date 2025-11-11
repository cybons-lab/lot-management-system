// frontend/src/features/allocations/hooks/useAllocationActions.ts
import {
  useCandidateLots,
  useCreateAllocations,
  useCancelAllocations,
  useSaveWarehouseAllocations,
} from "@/features/allocations/hooks/useAllocations";

/**
 * 引当操作をまとめたカスタムフック（product_id基準）
 */
export function useAllocationActions(lineId?: number, productId?: number, warehouseId?: number) {
  const enabled = typeof lineId === "number" && lineId > 0;
  const candidatesQ = useCandidateLots(enabled ? lineId : undefined, productId, warehouseId);
  const createAlloc = useCreateAllocations(enabled ? lineId : undefined);
  const cancelAlloc = useCancelAllocations(enabled ? lineId : undefined);
  const saveWareAlloc = useSaveWarehouseAllocations(enabled ? lineId : undefined);
  return { candidatesQ, createAlloc, cancelAlloc, saveWareAlloc, enabled };
}
