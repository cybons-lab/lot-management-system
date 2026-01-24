/**
 * TanStack Query Client Configuration
 *
 * Provides global error handling for queries and mutations.
 */

import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { toast } from "sonner";

import { logError } from "@/services/error-logger";
import { AuthorizationError } from "@/utils/errors/custom-errors";

/**
 * Extract user-friendly error message from error object.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "予期しないエラーが発生しました";
}

/**
 * Query cache with global error handling.
 *
 * - Logs all query errors
 * - Shows toast only for refetch failures (not initial loads)
 *
 * 【設計意図】なぜ初回ロードとリフェッチでトースト表示を分けるのか:
 *
 * 1. ユーザー体験の向上
 *    - 初回ロード失敗: 画面にエラー表示（ErrorBoundary等）を見せる
 *      → トーストは不要（画面全体でエラーを伝えているため）
 *    - リフェッチ失敗: 既存データを表示中、バックグラウンド更新が失敗
 *      → トーストで「更新失敗」を通知（ユーザーは古いデータを見ていることに気づく）
 *
 * 2. ノイズの削減
 *    理由: 初回ロード時のエラーで毎回トーストを出すと、画面が煩雑になる
 *    → エラー画面で十分に情報を伝えられる場合は、トーストを抑制
 *
 * 3. 判定ロジック
 *    条件: query.state.data !== undefined
 *    意味: すでにキャッシュデータがある（= 過去に成功した取得がある）
 *    → この状態でエラーが発生 = リフェッチ失敗
 */
const queryCache = new QueryCache({
  onError: (error, query) => {
    // Only show toast for queries that already have data (refetch failures)
    // Initial load failures should be handled by component UI (isError state)
    if (query.state.data !== undefined) {
      toast.error(`データ更新に失敗しました: ${getErrorMessage(error)}`);
    }

    // Always log to error logger
    logError("QueryCache", error instanceof Error ? error : new Error(String(error)), {
      queryKey: JSON.stringify(query.queryKey),
    });
  },
});

/**
 * Mutation cache with global error handling.
 *
 * - Logs all mutation errors
 * - Shows toast for failures (can be suppressed via meta.suppressErrorToast)
 *
 * 【設計意図】なぜMutationはデフォルトでトーストを表示するのか:
 *
 * 1. Queryとの違い
 *    - Query: データ取得（読み取り専用）
 *      → 失敗してもリトライやキャッシュで対応可能、ユーザーへの影響は限定的
 *    - Mutation: データ変更（書き込み）
 *      → 失敗すると、ユーザーの意図した操作が実行されない
 *      → 明確なフィードバックが必須
 *
 * 2. ユーザーの期待との一致
 *    例: 「保存」ボタンを押した場合
 *    - 成功: トースト「保存しました」
 *    - 失敗: トースト「保存に失敗しました」
 *    → アクションに対する明確なフィードバックが必要
 *
 * 3. suppressErrorToast オプション
 *    用途: 独自のエラーハンドリングを実装する場合
 *    例:
 *    - フォームバリデーションエラーを画面に表示する場合
 *    - カスタムエラーダイアログを出す場合
 *    → デフォルトのトーストを抑制し、代わりに独自のUIでエラーを伝える
 *
 * 使用例:
 * ```ts
 * useMutation({
 *   mutationFn: updateOrder,
 *   meta: { suppressErrorToast: true }, // グローバルトーストを抑制
 *   onError: (error) => {
 *     // カスタムエラーハンドリング
 *     showCustomErrorDialog(error);
 *   }
 * })
 * ```
 */
const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    // Show toast unless explicitly suppressed
    const suppressToast = mutation.meta?.suppressErrorToast as boolean | undefined;
    if (!suppressToast) {
      toast.error(`操作に失敗しました: ${getErrorMessage(error)}`);
    }

    // Always log to error logger
    logError("MutationCache", error instanceof Error ? error : new Error(String(error)), {
      mutationKey: mutation.options.mutationKey
        ? JSON.stringify(mutation.options.mutationKey)
        : undefined,
    });
  },
});

/**
 * Configured QueryClient instance.
 *
 * 【設計意図】各デフォルト設定の根拠:
 *
 * 1. staleTime: 5分（queries）
 *    理由: 在庫データは頻繁に変更されるが、秒単位での更新は不要
 *    → 5分間は「新鮮」とみなし、再取得をスキップ
 *    メリット: 不要なAPI呼び出しを削減、サーバー負荷軽減
 *    トレードオフ: 最大5分古いデータを表示する可能性
 *    運用でカバー: ユーザーが明示的に「再読み込み」すれば最新データを取得
 *
 * 2. retry: 1（queries）
 *    理由: ネットワーク一時的な不安定性に対応
 *    → 1回リトライすれば、多くの一時的エラーは解決
 *    トレードオフ: 2回以上のリトライは無駄な待ち時間を増やす
 *    根拠: バックエンドのHTTP clientも2回リトライ設定
 *    → フロントエンド1回 × バックエンド2回 = 実質的に複数回試行
 *
 * 3. refetchOnWindowFocus: false
 *    理由: 在庫管理では、タブ切り替えのたびにデータ再取得は不要
 *    例: 営業が「受注画面」と「在庫画面」を行き来する場合
 *    → 毎回自動再取得すると、意図しないタイミングでデータが更新される
 *    → ユーザーが明示的に「更新」ボタンを押した時のみ再取得
 *    メリット: 予期しないデータ変更を防ぐ、API呼び出し削減
 *
 * 4. retry: 0（mutations）
 *    理由: データ変更操作は冪等性がない（POSTでの二重登録リスク）
 *    → 自動リトライすると、同じ受注が2重登録される可能性
 *    → 失敗したら、ユーザーに明示的にエラーを伝え、手動で再実行を促す
 *    バックエンドとの一貫性: バックエンドHTTP clientもPOSTはリトライしない設計
 */
export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        if (error instanceof AuthorizationError) {
          return false;
        }
        if (error instanceof HTTPError) {
          const status = error.response?.status;
          if (status === 401 || status === 403) {
            return false;
          }
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (_failureCount, error) => {
        if (error instanceof AuthorizationError) {
          return false;
        }
        if (error instanceof HTTPError) {
          const status = error.response?.status;
          if (status === 401 || status === 403) {
            return false;
          }
        }
        return false;
      },
    },
  },
});
