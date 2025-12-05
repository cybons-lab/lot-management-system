// frontend/src/features/allocations/hooks/useAllocationActions.ts
import {
  useCandidateLots,
  useCreateAllocations,
  useCancelAllocations,
  useSaveWarehouseAllocations,
} from "../state/useAllocations";

/**
 * 引当操作をまとめたカスタムフック
 * 識別キー: customer_code + product_code (+ delivery_place_code optional)
 * warehouse_idは識別に使用しない（在庫所在情報のみ）
 */
export function useAllocationActions(lineId?: number) {
  const enabled = typeof lineId === "number" && lineId > 0;
  const candidatesQ = useCandidateLots(enabled ? lineId : undefined);
  const createAlloc = useCreateAllocations(enabled ? lineId : undefined);
  const cancelAlloc = useCancelAllocations(enabled ? lineId : undefined);
  const saveWareAlloc = useSaveWarehouseAllocations(enabled ? lineId : undefined);
  return { candidatesQ, createAlloc, cancelAlloc, saveWareAlloc, enabled };
}
