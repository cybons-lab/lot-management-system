import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ordersApi from "@/features/orders/api";
import type {
  LotCandidate,
  LotAllocationRequest,
  LotAllocationResponse,
  SaveAllocationsResponse,
  WarehouseAlloc,
  OrdersListParams,
} from "@/types";

const keyOrderLine = (orderLineId: number) =>
  ["orders", "line", orderLineId] as const;
const keyCandidates = (orderLineId: number) =>
  ["orders", "line", orderLineId, "candidates"] as const;

export function useCandidateLots(orderLineId: number | undefined) {
  return useQuery<{ items: LotCandidate[] }>({
    queryKey: orderLineId
      ? keyCandidates(orderLineId)
      : ["orders", "line", "candidates", "disabled"],
    queryFn: () => ordersApi.getCandidateLots(orderLineId as number),
    enabled: !!orderLineId,
  });
}

export function useCreateAllocations(
  orderLineId: number,
  refetchParams?: OrdersListParams
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LotAllocationRequest) =>
      ordersApi.createLotAllocations(orderLineId, payload),
    onSuccess: (_res: LotAllocationResponse) => {
      qc.invalidateQueries(); // page側でkeys.orders(params) を使っていれば再取得される
    },
  });
}

export function useCancelAllocations(orderLineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any /* AllocationCancelRequest: 後続で型整備 */) =>
      ordersApi.cancelLotAllocations(orderLineId, payload),
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

export function useSaveWarehouseAllocations(orderLineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (allocations: WarehouseAlloc[]) =>
      ordersApi.saveWarehouseAllocations(orderLineId, allocations),
    onSuccess: (_res: SaveAllocationsResponse) => {
      qc.invalidateQueries();
    },
  });
}

export function useUpdateOrderLineStatus(orderLineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (newStatus: string) =>
      ordersApi.updateOrderLineStatus(orderLineId, newStatus),
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

export function useReMatchOrder(orderId: number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => ordersApi.reMatchOrder(orderId as number),
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}
