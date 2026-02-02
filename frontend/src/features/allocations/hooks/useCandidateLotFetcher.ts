/**
 * Hook to fetch candidate lots from cache
 *
 * 【設計意図】なぜキャッシュから取得するのか（API呼び出ししない）:
 *
 * 1. パフォーマンス最適化
 *    理由: useLotAllocationLogicで全明細分の候補ロットを事前取得（prefetch）
 *    → useQueries を使って、画面表示時に一括フェッチ済み
 *    → 自動引当等の処理では、キャッシュから読み取るだけで済む
 *    メリット: API呼び出しが不要 → レスポンスが高速、サーバー負荷削減
 *
 * 2. queryClient.getQueryData の使用
 *    理由: React Queryのキャッシュから同期的にデータを取得
 *    → useQueryは非同期（ローディング状態が発生）
 *    → getQueryDataは同期的（キャッシュがあれば即座に返す）
 *    用途: 自動引当ロジック内で、候補ロットをその場で取得
 *
 * 3. Type guard（型ガード）の必要性
 *    理由: queryClient.getQueryDataは unknown 型を返す
 *    → cache?.items が配列であることを確認
 *    → 型安全性を保ち、ランタイムエラーを防ぐ
 *
 * 4. 空配列を返す理由
 *    ケース: キャッシュがまだ存在しない（prefetchが完了していない）
 *    → 空配列を返すことで、呼び出し側でエラーが発生しない
 *    → 自動引当は「候補なし」として処理（引当0件）
 */

import type { QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { ALLOCATION_CONSTANTS } from "../constants";
import type { CandidateLotFetcher } from "../types";

import { allocationCandidatesKeys } from "./api/useAllocationCandidates";

/**
 * Hook to fetch candidate lots from cache
 * @param queryClient - TanStack Query client
 * @returns Function to fetch candidate lots by line ID
 */
export function useCandidateLotFetcher(queryClient: QueryClient): CandidateLotFetcher {
  return useCallback<CandidateLotFetcher>(
    (lineId, productId) => {
      const cache = queryClient.getQueryData<{ items?: unknown[] }>(
        allocationCandidatesKeys.list({
          order_line_id: lineId,
          supplier_item_id: productId,
          strategy: ALLOCATION_CONSTANTS.QUERY_STRATEGY.FEFO,
          limit: ALLOCATION_CONSTANTS.CANDIDATE_LOTS_LIMIT,
        }),
      );

      // Type guard: Ensure items is an array
      // 【設計】配列チェックの理由: getQueryDataはunknown型を返すため、ランタイム型検証が必須
      if (!cache?.items || !Array.isArray(cache.items)) {
        return [];
      }

      // Return as CandidateLotItem array (assuming items conform to type)
      return cache.items as ReturnType<CandidateLotFetcher>;
    },
    [queryClient],
  );
}
