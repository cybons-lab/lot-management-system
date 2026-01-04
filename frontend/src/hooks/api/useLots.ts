/**
 * ロット情報取得用のカスタムフック
 *
 * TanStack Queryを使用してロット情報をフェッチ・キャッシュします。
 */

import { useQuery } from "@tanstack/react-query";

import { http as fetchApi } from "@/shared/api/http-client";
import type { paths } from "@/types/api";

type LotsList = paths["/api/lots"]["get"]["responses"]["200"]["content"]["application/json"];
type LotsQuery = paths["/api/lots"]["get"]["parameters"]["query"];
type LotDetail =
  paths["/api/lots/{lot_id}"]["get"]["responses"]["200"]["content"]["application/json"];

/**
 * ロット一覧を取得するフック
 *
 * @param params - クエリパラメータ（製品コード、倉庫コード等のフィルタ）
 * @returns TanStack QueryのuseQuery結果（data, isLoading, error等）
 *
 * @example
 * ```tsx
 * const { data: lots, isLoading } = useLots({ product_code: 'PROD001' });
 * ```
 */
export function useLots(params?: LotsQuery) {
  return useQuery({
    queryKey: ["lots", params],
    queryFn: () =>
      fetchApi.get<LotsList>("/lots", {
        searchParams: params as Record<string, string | number | boolean | undefined>,
      }),
  });
}

/**
 * 単一ロットの詳細情報を取得するフック
 *
 * @param lotId - ロットID
 * @returns TanStack QueryのuseQuery結果（data, isLoading, error等）
 *
 * @example
 * ```tsx
 * const { data: lot, isLoading } = useLot(123);
 * ```
 */
export function useLot(lotId: number | string) {
  return useQuery({
    queryKey: ["lot", lotId],
    queryFn: () => fetchApi.get<LotDetail>(`/lots/${lotId}`),
    enabled: !!lotId,
  });
}
