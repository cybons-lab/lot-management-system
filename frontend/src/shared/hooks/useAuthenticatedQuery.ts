/**
 * 認証対応 useQuery フック
 *
 * 【設計意図】
 * - 認証が必要なAPIを呼ぶuseQueryで、トークンの有無と認証状態の読み込み完了を
 *   自動的に考慮してクエリの発火を制御する
 * - これにより、401エラーの不要な発生を防止する
 *
 * 【使い方】
 * - httpAuthを使うAPI呼び出しは、useQueryの代わりにこのフックを使用する
 * - enabled オプションは追加の条件として機能する（AND条件）
 */

import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
  type QueryKey,
} from "@tanstack/react-query";

import { useAuth } from "@/features/auth/AuthContext";
import { hasAuthToken } from "@/shared/auth/token";

/**
 * 認証対応 useQuery
 *
 * - isAuthLoading中はクエリを発火しない（セッション復元中の401防止）
 * - トークンがない場合もクエリを発火しない
 *
 * @example
 * ```typescript
 * const { data, isLoading } = useAuthenticatedQuery({
 *   queryKey: ["ocr-results", params],
 *   queryFn: () => ocrResultsApi.list(params),
 * });
 * ```
 */
export function useAuthenticatedQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>): UseQueryResult<TData, TError> {
  const { isLoading: isAuthLoading } = useAuth();

  // 認証状態読み込み中、またはトークンなしの場合はクエリを無効化
  const authReady = !isAuthLoading && hasAuthToken();

  return useQuery({
    ...options,
    // ユーザー指定の enabled と認証状態を AND で結合
    enabled: (options.enabled ?? true) && authReady,
  });
}

/**
 * 認証対応 useQuery（公開API用）
 *
 * 認証不要だが、認証状態の読み込みを待ちたい場合に使用
 * （ログイン状態によって挙動を変えたい画面など）
 */
export function useAuthAwareQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>): UseQueryResult<TData, TError> {
  const { isLoading: isAuthLoading } = useAuth();

  return useQuery({
    ...options,
    // 認証状態の読み込み完了を待つ（トークン有無は不問）
    enabled: (options.enabled ?? true) && !isAuthLoading,
  });
}
