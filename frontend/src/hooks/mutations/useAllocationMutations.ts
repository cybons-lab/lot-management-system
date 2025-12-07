/**
 * 引当更新系フック
 *
 * ロット引当の作成・取消のMutationロジックを集約
 */

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import {
  createAllocations,
  cancelAllocation,
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
export function useCancelAllAllocationsForLine(
  _orderLineId: number,
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  },
): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // TODO(将来): バックエンドに受注明細単位の一括取消APIが実装されたら置き換え
      // API: POST /api/allocations/cancel-by-order-line
      // 優先度: 将来対応 (現状は個別キャンセルで対応可能)
      // 現状は個別に取り消す必要がある

      // 一旦、受注詳細を取得して引当IDを集める必要があるが、
      // ここでは簡易的にエラーをスローする
      throw new Error("受注明細単位の一括取消は未実装です");
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
}): UseMutationResult<
  AllocationResult,
  Error,
  { order_line_id: number; product_code: string; quantity: number }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      order_line_id: _order_line_id,
      product_code: _product_code,
      quantity: _quantity,
    }) => {
      // TODO(将来): バックエンドに自動引当APIが実装されたら置き換え
      // API: POST /api/allocations/auto-allocate (FEFO方式)
      // 優先度: 将来対応 (現状は手動引当で対応可能)
      // 現状は手動で候補ロットを取得してFEFO方式で引当を実行する

      throw new Error("自動引当機能は未実装です");
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
