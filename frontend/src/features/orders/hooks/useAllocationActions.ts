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
  const createAlloc = useCreateAllocations(lineId ?? 0);
  const cancelAlloc = useCancelAllocations(lineId ?? 0);
  const saveWareAlloc = useSaveWarehouseAllocations(lineId ?? 0);
  return { candidatesQ, createAlloc, cancelAlloc, saveWareAlloc, enabled };
}
