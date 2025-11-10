/**
 * Common UI Components
 * ローディングとエラー表示用の共通コンポーネント
 */

import { AlertCircle, Loader2 } from "lucide-react";

import { ApiError } from "@/utils/errors/custom-errors";

/**
 * ローディングスピナー
 */
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
    </div>
  );
}

/**
 * フルページローディング
 */
export function LoadingPage({ message = "読み込み中..." }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      <p className="mt-4 text-sm text-gray-600">{message}</p>
    </div>
  );
}

/**
 * エラー表示
 */
export function ErrorDisplay({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const isApiError = error instanceof ApiError;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
        <div className="flex-1">
          <h3 className="font-medium text-red-900">エラーが発生しました</h3>
          <p className="mt-1 text-sm text-red-700">{error.message}</p>
          {isApiError && (
            <p className="mt-1 text-xs text-red-600">ステータス: {(error as ApiError).status}</p>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800"
            >
              再試行
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * フルページエラー表示
 */
export function ErrorPage({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const isApiError = error instanceof ApiError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2 text-red-600">
          <AlertCircle className="h-6 w-6" />
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
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              再試行
            </button>
          )}
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

/**
 * 空のステート表示
 */
export function EmptyState({
  title = "データがありません",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
