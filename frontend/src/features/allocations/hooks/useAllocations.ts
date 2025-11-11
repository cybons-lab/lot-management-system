// frontend/src/features/orders/hooks/useAllocations.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import * as ordersApi from "@/features/orders/api";
import type {
  LotCandidateResponse,
  LotAllocationRequest,
  WarehouseAlloc,
  AllocationCancelRequest,
} from "@/shared/types/aliases";
const keyCandidates = (orderLineId: number) =>
  ["orders", "line", orderLineId, "candidates"] as const;

/**
 * ロット候補を取得（product_id基準）
 */
export function useCandidateLots(
  orderLineId: number | undefined,
  productId?: number,
  warehouseId?: number,
) {
  const enabled = typeof orderLineId === "number" && orderLineId > 0 && typeof productId === "number";

  return useQuery<LotCandidateResponse>({
    queryKey: enabled
      ? [...keyCandidates(orderLineId!), productId ?? null, warehouseId ?? null]
      : ["orders", "line", "candidates", "disabled"],
    queryFn: async () => {
      if (!productId) {
        return { items: [] };
      }

      const serverData = await ordersApi.getCandidateLots({
        product_id: productId,
        warehouse_id: warehouseId,
        limit: 200,
      });

      // Map CandidateLotItem to LotCandidate format
      const mappedItems = serverData.items.map((item) => ({
        lot_id: item.lot_id,
        lot_number: item.lot_number,
        product_code: item.product_code ?? "",
        allocate_qty: item.free_qty,
        expiry_date: item.expiry_date,
        receipt_date: null, // Not provided by new API
        warehouse_code: item.warehouse_code,
        warehouse_name: null,
        base_unit: null,
        lot_unit: null,
        lot_unit_qty: null,
        conversion_factor: null,
        available_qty: item.free_qty,
      }));

      return {
        items: mappedItems,
        warnings: [],
      };
    },
    enabled,
  });
}

/**
 * ロット引当を作成（楽観的更新対応）
 */
export function useCreateAllocations(orderLineId: number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LotAllocationRequest) => {
      if (!orderLineId) {
        return Promise.reject(new Error("orderLineId is required"));
      }
      return ordersApi.createLotAllocations(orderLineId, payload);
    },
    onMutate: async (newAlloc: LotAllocationRequest) => {
      // 進行中のクエリをキャンセル
      await qc.cancelQueries({ queryKey: ["orders"] });

      // 現在のデータを保存（ロールバック用）
      const previousData = qc.getQueryData(["orders"]);

      // 楽観的更新: 候補ロットの在庫を即座に減算
      if (orderLineId) {
        qc.setQueriesData(
          { queryKey: keyCandidates(orderLineId) },
          (old: LotCandidateResponse | undefined) => {
            if (!old?.items) return old;
            return {
              ...old,
              items: old.items.map((lot) => {
                const allocItem = newAlloc.allocations.find(
                  (item: { lot_id: number; qty: number }) => item.lot_id === lot.lot_id,
                );
                if (!allocItem) return lot;
                const nextAvailable = Math.max(0, lot.available_qty ?? 0 - allocItem.qty);
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
      }

      return { previousData };
    },
    onError: (_err: Error, _vars: LotAllocationRequest, context?: { previousData: unknown }) => {
      // エラー時はロールバック
      if (context?.previousData) {
        qc.setQueryData(["orders"], context.previousData);
      }
    },
    onSettled: () => {
      // 最終的にサーバーデータで更新
      qc.invalidateQueries({ queryKey: ["orders"] });
      if (orderLineId) {
        qc.invalidateQueries({ queryKey: keyCandidates(orderLineId) });
      }
    },
  });
}

/**
 * 引当を取消
 */
export function useCancelAllocations(orderLineId: number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AllocationCancelRequest) => {
      if (!orderLineId) {
        return Promise.reject(new Error("orderLineId is required"));
      }
      return ordersApi.cancelLotAllocations(orderLineId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      if (orderLineId) {
        qc.invalidateQueries({ queryKey: keyCandidates(orderLineId) });
      }
    },
  });
}

/**
 * 倉庫別配分を保存（楽観的更新対応）
 */
export function useSaveWarehouseAllocations(orderLineId: number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (allocations: WarehouseAlloc[]) => {
      if (!orderLineId) {
        return Promise.reject(new Error("orderLineId is required"));
      }
      return ordersApi.saveWarehouseAllocations(orderLineId, allocations);
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["orders"] });
      const previousData = qc.getQueryData(["orders"]);
      return { previousData };
    },
    onError: (_err: Error, _vars: WarehouseAlloc[], context?: { previousData: unknown }) => {
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
    mutationFn: () => {
      if (!orderId) {
        return Promise.reject(new Error("orderId is required"));
      }
      return ordersApi.reMatchOrder(orderId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
