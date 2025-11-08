// frontend/src/features/orders/hooks/useAllocations.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ordersApi from "@/features/orders/api";
import type {
  LotCandidate,
  LotCandidateResponse,
  LotAllocationRequest,
  LotAllocationResponse,
  SaveAllocationsResponse,
  WarehouseAlloc,
  OrdersListParams,
  AllocationCancelRequest,
} from "@/types/legacy";

const keyOrderLine = (orderLineId: number) => ["orders", "line", orderLineId] as const;
const keyCandidates = (orderLineId: number) =>
  ["orders", "line", orderLineId, "candidates"] as const;

/**
 * ロット候補を取得（品番一致フィルタ対応）
 */
export function useCandidateLots(
  orderLineId: number | undefined,
  productCode?: string,
  customerCode?: string,
) {
  return useQuery<LotCandidateResponse>({
    queryKey: orderLineId
      ? [...keyCandidates(orderLineId), productCode, customerCode]
      : ["orders", "line", "candidates", "disabled"],
    queryFn: () =>
      ordersApi.getCandidateLots(orderLineId as number, {
        product_code: productCode,
        customer_code: customerCode,
      }),
    enabled: !!orderLineId,
    select: (data) => {
      if (!productCode) return data;
      return {
        ...data,
        items: data.items.filter((lot) => lot.product_code === productCode),
      };
    },
  });
}

/**
 * ロット引当を作成（楽観的更新対応）
 */
export function useCreateAllocations(orderLineId: number, refetchParams?: OrdersListParams) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LotAllocationRequest) =>
      ordersApi.createLotAllocations(orderLineId, payload),
    onMutate: async (newAlloc) => {
      // 進行中のクエリをキャンセル
      await qc.cancelQueries({ queryKey: ["orders"] });

      // 現在のデータを保存（ロールバック用）
      const previousData = qc.getQueryData(["orders"]);

      // 楽観的更新: 候補ロットの在庫を即座に減算
      qc.setQueriesData(
        { queryKey: keyCandidates(orderLineId) },
        (old: LotCandidateResponse | undefined) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.map((lot) => {
              const allocItem = newAlloc.allocations.find((item) => item.lot_id === lot.lot_id);
              if (!allocItem) return lot;
              const nextAvailable = Math.max(0, lot.available_qty - allocItem.qty);
              const factor =
                lot.conversion_factor && lot.conversion_factor > 0 ? lot.conversion_factor : 1;
              const nextLotUnitQty =
                typeof lot.lot_unit_qty === "number"
                  ? Math.max(0, lot.lot_unit_qty - allocItem.qty / factor)
                  : lot.lot_unit_qty;

              return {
                ...lot,
                available_qty: nextAvailable,
                lot_unit_qty: nextLotUnitQty,
              };
            }),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // エラー時はロールバック
      if (context?.previousData) {
        qc.setQueryData(["orders"], context.previousData);
      }
    },
    onSettled: () => {
      // 最終的にサーバーデータで更新
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: keyCandidates(orderLineId) });
    },
  });
}

/**
 * 引当を取消
 */
export function useCancelAllocations(orderLineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AllocationCancelRequest) =>
      ordersApi.cancelLotAllocations(orderLineId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: keyCandidates(orderLineId) });
    },
  });
}

/**
 * 倉庫別配分を保存（楽観的更新対応）
 */
export function useSaveWarehouseAllocations(orderLineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (allocations: WarehouseAlloc[]) =>
      ordersApi.saveWarehouseAllocations(orderLineId, allocations),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["orders"] });
      const previousData = qc.getQueryData(["orders"]);
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        qc.setQueryData(["orders"], context.previousData);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

/**
 * 受注明細のステータスを更新
 */
export function useUpdateOrderLineStatus(orderLineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (newStatus: string) => ordersApi.updateOrderLineStatus(orderLineId, newStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

/**
 * 受注の再マッチング
 */
export function useReMatchOrder(orderId: number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => ordersApi.reMatchOrder(orderId as number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
