// frontend/src/features/orders/hooks/useAllocationActions.ts
import {
  useCandidateLots,
  useCreateAllocations,
  useCancelAllocations,
  useSaveWarehouseAllocations,
} from "@/features/orders/hooks/useAllocations";

/**
 * 引当操作をまとめたカスタムフック
 */
export function useAllocationActions(
  lineId?: number,
  productCode?: string,
  customerCode?: string
) {
  const enabled = typeof lineId === "number" && lineId > 0;
  const candidatesQ = useCandidateLots(
    enabled ? lineId : undefined,
    productCode,
    customerCode
  );
  const createAlloc = useCreateAllocations(enabled ? lineId : undefined);
  const cancelAlloc = useCancelAllocations(enabled ? lineId : undefined);
  const saveWareAlloc = useSaveWarehouseAllocations(enabled ? lineId : undefined);
  return { candidatesQ, createAlloc, cancelAlloc, saveWareAlloc, enabled };
}
