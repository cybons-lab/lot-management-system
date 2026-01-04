/**
 * エラーバウンダリーコンポーネント
 *
 * Reactコンポーネントのエラーを捕捉し、フォールバックUIを表示します。
 * エラーはエラーロガーサービスを使用して記録されます。
 * 開発モードではエラー詳細を表示します。
 *
 * 【設計意図】Error Boundary の設計判断:
 *
 * 1. なぜ Error Boundary が必要なのか
 *    理由: Reactコンポーネント内のエラーでアプリ全体が停止するのを防ぐ
 *    問題:
 *    - 通常、React コンポーネント内で未処理のエラーが発生すると、
 *      アプリケーション全体が真っ白になる（白い画面）
 *    - ユーザーは何が起きたか分からず、リロード以外の対処方法がない
 *    解決:
 *    - Error Boundary でエラーを捕捉し、フォールバックUIを表示
 *    → ユーザーに「エラーが発生した」ことを明示的に伝える
 *
 * 2. なぜ Class Component を使うのか（L35）
 *    理由: React 18 時点で Error Boundary は Class Component のみサポート
 *    制限:
 *    - Functional Component (hooks) では Error Boundary を実装できない
 *    - componentDidCatch() ライフサイクルメソッドが必要
 *    将来:
 *    - React 19 で Functional Component 版が提供される可能性あり
 *    → その時点で移行を検討
 *
 * 3. getDerivedStateFromError vs componentDidCatch（L41-53）
 *    理由: 役割分担（レンダリング vs 副作用）
 *    getDerivedStateFromError (L41-43):
 *    - 用途: エラー発生時に状態を更新（hasError: true）
 *    - 制約: 副作用（ログ送信等）を実行できない
 *    - タイミング: レンダリングフェーズで実行
 *    componentDidCatch (L45-53):
 *    - 用途: エラーログの記録、外部サービスへの通知
 *    - 副作用OK: ログ送信、Sentry通知等
 *    - タイミング: コミットフェーズで実行
 *
 * 4. カスタム fallback の設計（L20, L58-60）
 *    理由: ページごとに異なるエラー表示を可能にする
 *    例:
 *    ```tsx
 *    <ErrorBoundary fallback={<CustomErrorPage />}>
 *      <ExpensiveComponent />
 *    </ErrorBoundary>
 *    ```
 *    用途:
 *    - ダッシュボード: 「データ取得に失敗しました」
 *    - フォーム: 「送信中にエラーが発生しました」
 *    → 状況に応じた適切なメッセージ表示
 *
 * 5. デフォルト UI の日本語メッセージ（L80, L84）
 *    理由: エンドユーザーは日本の自動車部品商社の社員
 *    メッセージ:
 *    - 「エラーが発生しました」: 状況を明確に説明
 *    - 「ページを再読み込み」: 具体的な対処方法を提示
 *    メリット:
 *    - 技術知識のないユーザーでも対処可能
 *    - サポート部門への問い合わせ削減
 *
 * 6. window.location.reload() の使用（L88）
 *    理由: エラー状態から確実に復旧する最も簡単な方法
 *    動作:
 *    - ページ全体をリロード → React の状態もリセット
 *    - エラーが一時的なものなら、リロードで解決
 *    代替案:
 *    - setState でエラーフラグをリセット → エラー原因が残る可能性
 *    - navigate(-1) で前のページに戻る → エラーが再発する可能性
 *    トレードオフ:
 *    - 利点: 確実にエラー状態から復旧
 *    - 欠点: 入力中のデータが失われる可能性
 *
 * 7. 開発モードでのエラー詳細表示（L94-105）
 *    理由: 開発者のデバッグ効率化
 *    表示内容:
 *    - error.message: エラーメッセージ
 *    - error.stack: スタックトレース（エラー発生箇所）
 *    セキュリティ:
 *    - import.meta.env.DEV でチェック → 本番環境では非表示
 *    → 内部実装の詳細をユーザーに見せない
 *
 * 8. onError カスタムハンドラー（L22, L52）
 *    理由: エラー発生時の追加処理を柔軟に実装
 *    用途:
 *    - 特定のエラーをSentryに送信
 *    - アナリティクス（エラー発生率の測定）
 *    - カスタムアラート表示
 *    例:
 *    ```tsx
 *    <ErrorBoundary onError={(error) => {
 *      sendToSentry(error);
 *      analytics.track("error", { message: error.message });
 *    }}>
 *      <App />
 *    </ErrorBoundary>
 *    ```
 *
 * 9. componentStack の記録（L48）
 *    理由: エラーが発生したコンポーネントツリーを把握
 *    例:
 *    ```
 *    in ProductList
 *      in Dashboard
 *        in App
 *    ```
 *    → どのコンポーネントでエラーが起きたか特定可能
 *    メリット:
 *    - バグ修正時に原因箇所を素早く特定
 *    - 同じエラーが複数箇所で起きた場合の識別
 *
 * 10. Error Boundary の配置戦略
 *     推奨:
 *     - アプリ全体を1つのError Boundaryでラップ（最低限）
 *     - 重要な機能ごとに個別のError Boundary（推奨）
 *     例:
 *     ```tsx
 *     <ErrorBoundary>  // アプリ全体
 *       <Header />
 *       <ErrorBoundary>  // ダッシュボード専用
 *         <Dashboard />
 *       </ErrorBoundary>
 *       <ErrorBoundary>  // サイドバー専用
 *         <Sidebar />
 *       </ErrorBoundary>
 *     </ErrorBoundary>
 *     ```
 *     メリット: ダッシュボードでエラーが起きても、サイドバーは動作し続ける
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

import { logError } from "@/services/error-logger";

/**
 * ErrorBoundaryのProps
 */
interface Props {
  /** ラップする子コンポーネント */
  children: ReactNode;
  /** カスタムフォールバックUI */
  fallback?: ReactNode;
  /** エラー発生時のカスタムハンドラ */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * ErrorBoundaryの状態
 */
interface State {
  /** エラー発生フラグ */
  hasError: boolean;
  /** エラーオブジェクト */
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error
    logError("ErrorBoundary", error, {
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="max-w-md rounded-lg bg-white p-8 shadow-lg">
            <div className="mb-4 flex items-center">
              <svg
                className="mr-2 h-6 w-6 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-xl font-bold text-gray-900">エラーが発生しました</h2>
            </div>

            <p className="mb-4 text-gray-600">
              申し訳ございません。予期しないエラーが発生しました。
            </p>

            <button
              onClick={() => window.location.reload()}
              className="rounded bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-600"
            >
              ページを再読み込み
            </button>

            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-500">
                  エラー詳細（開発モード）
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs text-red-600">
                  {this.state.error.message}
                  {"\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
