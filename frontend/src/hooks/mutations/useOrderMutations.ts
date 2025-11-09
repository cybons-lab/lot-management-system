/**
 * 受注更新系フック
 * 
 * 受注の作成・更新・削除のMutationロジックを集約
 */

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { createOrder, updateOrder, deleteOrder } from '@/services/api/order-service';
import { QUERY_KEYS } from '@/services/api/query-keys';
import type { OrderCreate, OrderUpdate, OrderDetail } from '@/utils/validators/order-schemas';

/**
 * 受注作成フック
 * 
 * @param options - Mutation オプション
 * @returns 受注作成のMutation結果
 * 
 * @example
 * ```tsx
 * const createOrderMutation = useCreateOrder({
 *   onSuccess: () => {
 *     toast.success('受注を作成しました');
 *   }
 * });
 * 
 * await createOrderMutation.mutateAsync(newOrderData);
 * ```
 */
export function useCreateOrder(
  options?: {
    onSuccess?: (data: OrderDetail) => void;
    onError?: (error: Error) => void;
  }
): UseMutationResult<OrderDetail, Error, OrderCreate> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createOrder,
    onSuccess: (data) => {
      // 受注一覧のキャッシュを無効化
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.orders.all 
      });
      
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * 受注更新フック
 * 
 * @param orderId - 更新対象の受注ID
 * @param options - Mutation オプション
 * @returns 受注更新のMutation結果
 * 
 * @example
 * ```tsx
 * const updateOrderMutation = useUpdateOrder(123, {
 *   onSuccess: () => {
 *     toast.success('受注を更新しました');
 *   }
 * });
 * 
 * await updateOrderMutation.mutateAsync(updatedData);
 * ```
 */
export function useUpdateOrder(
  orderId: number,
  options?: {
    onSuccess?: (data: OrderDetail) => void;
    onError?: (error: Error) => void;
  }
): UseMutationResult<OrderDetail, Error, OrderUpdate> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => updateOrder(orderId, data),
    onSuccess: (data) => {
      // 特定受注のキャッシュを無効化
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.orders.detail(orderId) 
      });
      
      // 受注一覧のキャッシュも無効化
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.orders.all 
      });
      
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * 受注削除フック
 * 
 * @param options - Mutation オプション
 * @returns 受注削除のMutation結果
 * 
 * @example
 * ```tsx
 * const deleteOrderMutation = useDeleteOrder({
 *   onSuccess: () => {
 *     toast.success('受注を削除しました');
 *   }
 * });
 * 
 * await deleteOrderMutation.mutateAsync(123);
 * ```
 */
export function useDeleteOrder(
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteOrder,
    onSuccess: (_, orderId) => {
      // 削除された受注のキャッシュを削除
      queryClient.removeQueries({ 
        queryKey: QUERY_KEYS.orders.detail(orderId) 
      });
      
      // 受注一覧のキャッシュを無効化
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.orders.all 
      });
      
      options?.onSuccess?.();
    },
    onError: options?.onError,
  });
}

/**
 * 受注ステータス更新フック
 * (簡易版 - ステータスのみ更新)
 * 
 * @param orderId - 更新対象の受注ID
 * @param options - Mutation オプション
 * @returns 受注ステータス更新のMutation結果
 * 
 * @example
 * ```tsx
 * const updateStatusMutation = useUpdateOrderStatus(123, {
 *   onSuccess: () => {
 *     toast.success('ステータスを更新しました');
 *   }
 * });
 * 
 * await updateStatusMutation.mutateAsync('shipped');
 * ```
 */
export function useUpdateOrderStatus(
  orderId: number,
  options?: {
    onSuccess?: (data: OrderDetail) => void;
    onError?: (error: Error) => void;
  }
): UseMutationResult<OrderDetail, Error, string> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (status: string) => updateOrder(orderId, { status }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.orders.detail(orderId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.orders.all 
      });
      
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

/**
 * 受注一括作成フック
 * 
 * @param options - Mutation オプション
 * @returns 受注一括作成のMutation結果
 */
export function useBulkCreateOrders(
  options?: {
    onSuccess?: (data: OrderDetail[]) => void;
    onError?: (error: Error) => void;
    onProgress?: (current: number, total: number) => void;
  }
): UseMutationResult<OrderDetail[], Error, OrderCreate[]> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ordersData: OrderCreate[]) => {
      const results: OrderDetail[] = [];
      
      for (let i = 0; i < ordersData.length; i++) {
        const orderData = ordersData[i];
        const result = await createOrder(orderData);
        results.push(result);
        
        // 進捗通知
        options?.onProgress?.(i + 1, ordersData.length);
      }
      
      return results;
    },
    onSuccess: (data) => {
      // 受注一覧のキャッシュを無効化
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.orders.all 
      });
      
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}
