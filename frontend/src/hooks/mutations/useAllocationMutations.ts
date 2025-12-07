/**
 * 引当更新系フック
 *
 * ロット引当の作成・取消のMutationロジックを集約
 */

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import {
  createAllocations,
  cancelAllocation,
  cancelAllocationsByLine,
  type CreateAllocationPayload,
  type AllocationResult,
} from "@/features/allocations/api";
import { QUERY_KEYS } from "@/services/api/query-keys";

/**
 * ロット引当作成フック
 *
 * @param options - Mutation オプション
 * @returns ロット引当作成のMutation結果
 *
 * @example
 * ```tsx
 * const allocateMutation = useCreateAllocations({
 *   onSuccess: () => {
 *     toast.success('引当を実行しました');
 *   }
 * });
 *
 * await allocateMutation.mutateAsync({
 *   order_line_id: 123,
 *   product_code: 'P001',
 *   allocations: [{ lot_id: 1, warehouse_code: 'W01', quantity: 100 }]
 * });
 * ```
 */
export function useCreateAllocations(options?: {
  onSuccess?: (data: AllocationResult) => void;
  onError?: (error: Error) => void;
}): UseMutationResult<AllocationResult, Error, CreateAllocationPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAllocations,
    onSuccess: (data, variables) => {
      // 受注詳細のキャッシュを無効化（引当情報が更新されるため）
      const orderId = data.order_id;
      if (orderId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.orders.detail(orderId),
        });
      }

      // 受注一覧のキャッシュも無効化
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orders.all,
      });

      // ロット一覧のキャッシュを無効化（在庫数が変わるため）
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.lots.all,
      });

      // 引当に使用したロットのキャッシュも無効化
      variables.allocations.forEach((alloc) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.lots.detail(alloc.lot?.id ?? alloc.lotId),
        });
      });

      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * ロット引当取消フック
 *
 * @param options - Mutation オプション
 * @returns ロット引当取消のMutation結果
 *
 * @example
 * ```tsx
 * const cancelMutation = useCancelAllocation({
 *   onSuccess: () => {
 *     toast.success('引当を取り消しました');
 *   }
 * });
 *
 * await cancelMutation.mutateAsync(123);
 * ```
 */
export function useCancelAllocation(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelAllocation,
    onSuccess: () => {
      // 受注詳細と一覧のキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orders.all,
      });

      // ロット一覧のキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.lots.all,
      });

      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * 複数ロット引当一括取消フック
 *
 * @param options - Mutation オプション
 * @returns 複数ロット引当一括取消のMutation結果
 */
export function useBulkCancelAllocations(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onProgress?: (current: number, total: number) => void;
}): UseMutationResult<void, Error, number[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (allocationIds: number[]) => {
      for (let i = 0; i < allocationIds.length; i++) {
        await cancelAllocation(allocationIds[i]);

        // 進捗通知
        options?.onProgress?.(i + 1, allocationIds.length);
      }
    },
    onSuccess: () => {
      // 受注とロットのキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orders.all,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.lots.all,
      });

      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * 受注明細の全引当取消フック
 *
 * @param _orderLineId - 受注明細ID (未使用、将来の実装用)
 * @param options - Mutation オプション
 * @returns 全引当取消のMutation結果
 */
/**
 * 受注明細の全引当取消フック
 *
 * @param options - Mutation オプション
 * @returns 全引当取消のMutation結果
 */
export function useCancelAllAllocationsForLine(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderLineId: number) => {
      await cancelAllocationsByLine(orderLineId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orders.all,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.lots.all,
      });

      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * 引当の自動実行フック
 * (FEFO方式で自動引当)
 *
 * @param options - Mutation オプション
 * @returns 自動引当のMutation結果
 *
 * @example
 * ```tsx
 * const autoAllocateMutation = useAutoAllocate({
 *   onSuccess: () => {
 *     toast.success('自動引当が完了しました');
 *   }
 * });
 *
 * await autoAllocateMutation.mutateAsync({
 *   order_line_id: 123,
 *   product_code: 'P001',
 *   quantity: 500
 * });
 * ```
 */
export function useAutoAllocate(options?: {
  onSuccess?: (data: AllocationResult) => void;
  onError?: (error: Error) => void;
}): UseMutationResult<AllocationResult, Error, { order_line_id: number; strategy?: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ order_line_id, strategy = "fefo" }) => {
      // Backend API: POST /api/allocations/auto-allocate
      const response = await fetch("/api/allocations/auto-allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_line_id, strategy }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "自動引当に失敗しました");
      }

      const data = await response.json();

      // AutoAllocateResponse を AllocationResult 形式に変換
      return {
        order_id: data.order_id,
        created_allocation_ids: data.allocated_lots.map((lot: { lot_id: number }) => lot.lot_id),
        message: data.message,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orders.all,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.lots.all,
      });

      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}
