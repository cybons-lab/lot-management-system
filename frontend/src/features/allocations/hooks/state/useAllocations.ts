// frontend/src/features/orders/hooks/useAllocations.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import * as ordersApi from "@/features/orders/api";
import type { WarehouseAllocationItem } from "@/features/orders/api";
import { getAllocationQueryKeys } from "@/services/api/query-keys";
import type { CandidateLotItem, ManualAllocationSavePayload } from "@/shared/types/schema";

// Temporary alias for missing type
type AllocationCancelRequest = { order_line_id?: number; allocation_ids?: number[] };
const keyCandidates = (orderLineId: number) =>
  ["orders", "line", orderLineId, "candidates"] as const;

/**
 * ロット候補を取得（product_group_id基準）
 * 識別キー: customer_code + product_code (+ delivery_place_code optional)
 */
// UI用の型定義
type LotCandidateResult = {
  items: CandidateLotItem[];
  warnings: string[];
};

/**
 * ロット候補を取得（product_group_id基準）
 * 識別キー: customer_code + product_code (+ delivery_place_code optional)
 */
export function useCandidateLots(orderLineId: number | undefined) {
  const enabled = typeof orderLineId === "number" && orderLineId > 0;

  return useQuery<LotCandidateResult>({
    queryKey: enabled
      ? [...keyCandidates(orderLineId!)]
      : ["orders", "line", "candidates", "disabled"],
    queryFn: async () => {
      if (!orderLineId) {
        return { items: [], warnings: [] };
      }

      const serverData = await ordersApi.getCandidateLots({
        order_line_id: orderLineId,
        limit: 200,
      });

      return {
        items: serverData.items ?? [],
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
    mutationFn: (payload: ManualAllocationSavePayload) => {
      if (!orderLineId) {
        return Promise.reject(new Error("orderLineId is required"));
      }
      return ordersApi.createLotAllocations(orderLineId, payload);
    },
    onMutate: async (newAlloc: ManualAllocationSavePayload) => {
      // 進行中のクエリをキャンセル
      await qc.cancelQueries({ queryKey: ["orders"] });

      // 現在のデータを保存(ロールバック用)
      const previousData = qc.getQueryData(["orders"]);

      // 楽観的更新: 候補ロットの在庫を即座に減算
      if (orderLineId) {
        qc.setQueriesData(
          { queryKey: keyCandidates(orderLineId) },
          (old: LotCandidateResult | undefined) => {
            if (!old?.items) return old;
            return {
              ...old,
              items: old.items.map((lot) => {
                const allocItem = newAlloc.allocations.find((item) => item.lot_id === lot.lot_id);
                if (!allocItem) return lot;

                const currentAvailable = Number(lot.available_quantity ?? 0);
                const nextAvailable = Math.max(0, currentAvailable - allocItem.quantity);

                return {
                  ...lot,
                  available_quantity: String(nextAvailable),
                };
              }),
            };
          },
        );
      }

      return { previousData };
    },
    onError: (
      _err: Error,
      _vars: ManualAllocationSavePayload,
      context?: { previousData: unknown },
    ) => {
      // エラー時はロールバック
      if (context?.previousData) {
        qc.setQueryData(["orders"], context.previousData);
      }
    },
    onSettled: () => {
      // 最終的にサーバーデータで更新 - 包括的に無効化
      const allocationKeys = getAllocationQueryKeys();
      allocationKeys.forEach((key) => {
        qc.invalidateQueries({ queryKey: key });
      });
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
      // 包括的に無効化
      const allocationKeys = getAllocationQueryKeys();
      allocationKeys.forEach((key) => {
        qc.invalidateQueries({ queryKey: key });
      });
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
    mutationFn: (allocations: ordersApi.WarehouseAllocationItem[]) => {
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
    onError: (
      _err: Error,
      _vars: WarehouseAllocationItem[],
      context?: { previousData: unknown },
    ) => {
      if (context?.previousData) {
        qc.setQueryData(["orders"], context.previousData);
      }
    },
    onSettled: () => {
      // 包括的に無効化
      const allocationKeys = getAllocationQueryKeys();
      allocationKeys.forEach((key) => {
        qc.invalidateQueries({ queryKey: key });
      });
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
      // 包括的に無効化
      const allocationKeys = getAllocationQueryKeys();
      allocationKeys.forEach((key) => {
        qc.invalidateQueries({ queryKey: key });
      });
    },
  });
}
