/**
 * Error Boundary Component
 * アプリケーション全体のエラーをキャッチするコンポーネント
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

import { ApiError } from "@/utils/errors/custom-errors";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * エラーバウンダリクラス
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

/**
 * デフォルトのエラー表示コンポーネント
 */
function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const isApiError = error instanceof ApiError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2 text-red-600">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-lg font-semibold">エラーが発生しました</h2>
        </div>

        <div className="mb-4 space-y-2">
          <p className="text-sm text-gray-700">{error.message}</p>
          {isApiError && (
            <>
              <p className="text-xs text-gray-500">
                ステータスコード: {(error as ApiError).status}
              </p>
              {(error as ApiError).code && (
                <p className="text-xs text-gray-500">エラーコード: {(error as ApiError).code}</p>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={reset}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          >
            再試行
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          >
            ページを再読み込み
          </button>
        </div>
      </div>
    </div>
  );
}
