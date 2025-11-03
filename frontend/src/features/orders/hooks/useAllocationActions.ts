// frontend/src/features/orders/hooks/useAllocationActions.ts
import {
  useCandidateLots,
  useCreateAllocations,
  useCancelAllocations,
  useSaveWarehouseAllocations,
} from "@/features/orders/hooks/useAllocations";

export function useAllocationActions(lineId?: number) {
  const enabled = typeof lineId === "number" && lineId > 0;
  const candidatesQ = useCandidateLots(enabled ? lineId : undefined);
  const createAlloc = useCreateAllocations(lineId ?? 0);
  const cancelAlloc = useCancelAllocations(lineId ?? 0);
  const saveWareAlloc = useSaveWarehouseAllocations(lineId ?? 0);
  return { candidatesQ, createAlloc, cancelAlloc, saveWareAlloc, enabled };
}
