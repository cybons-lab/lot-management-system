/**
 * 受注情報取得用のカスタムフック
 *
 * TanStack Queryを使用して受注情報をフェッチ・キャッシュします。
 */

import { useQuery } from "@tanstack/react-query";

import { http as fetchApi } from "@/shared/api/http-client";
import type { paths } from "@/types/api";

type OrdersList = paths["/api/orders"]["get"]["responses"]["200"]["content"]["application/json"];
type OrdersQuery = paths["/api/orders"]["get"]["parameters"]["query"];
type OrderDetail =
  paths["/api/orders/{order_id}"]["get"]["responses"]["200"]["content"]["application/json"];

/**
 * 受注一覧を取得するフック
 *
 * @param params - クエリパラメータ（ステータス、顧客コード等のフィルタ）
 * @returns TanStack QueryのuseQuery結果（data, isLoading, error等）
 *
 * @example
 * ```tsx
 * const { data: orders, isLoading } = useOrders({ status: 'open' });
 * ```
 */
export function useOrders(params?: OrdersQuery) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () =>
      fetchApi.get<OrdersList>("/orders", {
        searchParams: params as Record<string, string | number | boolean | undefined>,
      }),
  });
}

/**
 * 単一受注の詳細情報を取得するフック
 *
 * @param orderId - 受注ID
 * @returns TanStack QueryのuseQuery結果（data, isLoading, error等）
 *
 * @example
 * ```tsx
 * const { data: order, isLoading } = useOrder(456);
 * ```
 */
export function useOrder(orderId: number | string) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchApi.get<OrderDetail>(`/orders/${orderId}`),
    enabled: !!orderId,
  });
}

/**
 * 受注詳細情報を取得するフック（スタブ実装）
 *
 * @param _orderId - 受注ID（未使用）
 * @returns 空のデータとローディング状態
 * @deprecated 実装が必要です
 */
export function useOrderDetail(_orderId?: number) {
  return { data: undefined, isLoading: false } as const;
}

/**
 * ドラッグ&ドロップによる引当操作用フック（スタブ実装）
 *
 * @returns 引当関数とペンディング状態
 * @deprecated 実装が必要です
 */
export function useDragAssign() {
  return { assign: () => {}, isPending: false } as const;
}
