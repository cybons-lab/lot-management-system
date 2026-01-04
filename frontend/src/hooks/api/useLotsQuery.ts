/**
 * ロット情報取得用のカスタムフック（正規化版）
 *
 * TanStack Queryを使用してロット情報をフェッチし、UI用に正規化します。
 * バックエンドのレスポンスをLotUI型に変換して返します。
 */

import { useQuery } from "@tanstack/react-query";

import { getLots } from "@/features/inventory/api";
import { normalizeLot, type LotUI } from "@/shared/libs/normalize";
import type { paths } from "@/types/api";

type LotsQueryBase = paths["/api/lots"]["get"]["parameters"]["query"];

/** クエリパラメータ（納品場所コードフィルタを含む拡張版） */
type LotsQuery = LotsQueryBase & { delivery_place_code?: string | null };

type LotResponseBase =
  paths["/api/lots"]["get"]["responses"][200]["content"]["application/json"][number];

/** ロットレスポンス（納品場所情報とロック情報を含む拡張版） */
type LotResponse = LotResponseBase & {
  delivery_place_id?: number | null;
  delivery_place_code?: string | null;
  delivery_place_name?: string | null;
  locked_quantity?: string | null;
  lock_reason?: string | null;
};

/**
 * ロット一覧を取得し、UI用に正規化するフック
 *
 * バックエンドAPIからロット情報を取得し、normalizeLot関数でUI表示用の形式に変換します。
 * キャッシュは30秒間有効で、マウント時に再取得を行います。
 *
 * @param params - クエリパラメータ（製品コード、倉庫コード、納品場所コード等）
 * @returns TanStack QueryのuseQuery結果（dataはLotUI[]型に変換済み）
 *
 * @example
 * ```tsx
 * const { data: lots, isLoading } = useLotsQuery({ product_code: 'PROD001' });
 * ```
 */
export const useLotsQuery = (params?: LotsQuery) =>
  useQuery<LotResponse[], Error, LotUI[]>({
    queryKey: ["lots", params],
    queryFn: () => getLots(params),
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    select: (data) =>
      (data ?? []).map((item) =>
        normalizeLot(
          item as unknown as Record<string, unknown> & {
            lot_id: number;
            product_id: number;
            warehouse_id: number;
          },
        ),
      ),
  });
