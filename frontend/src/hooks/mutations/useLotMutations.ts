/**
 * ロット更新系フック
 *
 * ロットの作成・更新・削除のMutationロジックを集約
 */

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { createLot, updateLot, deleteLot } from "@/services/api/lot-service";
import { QUERY_KEYS } from "@/services/api/query-keys";
import type { LotResponse } from "@/shared/types/aliases";
import type { LotCreateInput, LotUpdateInput } from "@/utils/validators";

/**
 * ロット作成フック
 *
 * @param options - Mutation オプション
 * @returns ロット作成のMutation結果
 *
 * @example
 * ```tsx
 * const createLotMutation = useCreateLot({
 *   onSuccess: () => {
 *     toast.success('ロットを作成しました');
 *   }
 * });
 *
 * await createLotMutation.mutateAsync(newLotData);
 * ```
 */
export function useCreateLot(options?: {
  onSuccess?: (data: LotResponse) => void;
  onError?: (error: Error) => void;
}): UseMutationResult<LotResponse, Error, LotCreateInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLot,
    onSuccess: (data: LotResponse) => {
      // ロット一覧のキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.lots.all,
      });

      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * ロット更新フック
 *
 * @param lotId - 更新対象のロットID
 * @param options - Mutation オプション
 * @returns ロット更新のMutation結果
 *
 * @example
 * ```tsx
 * const updateLotMutation = useUpdateLot(123, {
 *   onSuccess: () => {
 *     toast.success('ロットを更新しました');
 *   }
 * });
 *
 * await updateLotMutation.mutateAsync(updatedData);
 * ```
 */
export function useUpdateLot(
  lotId: number,
  options?: {
    onSuccess?: (data: LotResponse) => void;
    onError?: (error: Error) => void;
  },
): UseMutationResult<LotResponse, Error, LotUpdateInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LotUpdateInput) => updateLot(lotId, data),
    onSuccess: (data: LotResponse) => {
      // 特定ロットのキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.lots.detail(lotId),
      });

      // ロット一覧のキャッシュも無効化
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.lots.all,
      });

      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * ロット削除フック
 *
 * @param options - Mutation オプション
 * @returns ロット削除のMutation結果
 *
 * @example
 * ```tsx
 * const deleteLotMutation = useDeleteLot({
 *   onSuccess: () => {
 *     toast.success('ロットを削除しました');
 *   }
 * });
 *
 * await deleteLotMutation.mutateAsync(123);
 * ```
 */
export function useDeleteLot(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteLot,
    onSuccess: (_: void, lotId: number) => {
      // 削除されたロットのキャッシュを削除
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.lots.detail(lotId),
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
 * ロット一括作成フック
 *
 * @param options - Mutation オプション
 * @returns ロット一括作成のMutation結果
 */
export function useBulkCreateLots(options?: {
  onSuccess?: (data: LotResponse[]) => void;
  onError?: (error: Error) => void;
  onProgress?: (current: number, total: number) => void;
}): UseMutationResult<LotResponse[], Error, LotCreateInput[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lotsData: LotCreateInput[]) => {
      const results: LotResponse[] = [];

      for (let i = 0; i < lotsData.length; i++) {
        const lotData = lotsData[i];
        const result = await createLot(lotData);
        results.push(result);

        // 進捗通知
        options?.onProgress?.(i + 1, lotsData.length);
      }

      return results;
    },
    onSuccess: (data: LotResponse[]) => {
      // ロット一覧のキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.lots.all,
      });

      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * ロットステータス更新フック
 * (簡易版 - ステータスのみ更新)
 *
 * @param lotId - 更新対象のロットID
 * @param options - Mutation オプション
 * @returns ロットステータス更新のMutation結果
 */
export function useUpdateLotStatus(
  lotId: number,
  options?: {
    onSuccess?: (data: LotResponse) => void;
    onError?: (error: Error) => void;
  },
): UseMutationResult<LotResponse, Error, LotUpdateInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LotUpdateInput) => updateLot(lotId, data),
    onSuccess: (data: LotResponse) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.lots.detail(lotId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.lots.all,
      });

      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}
