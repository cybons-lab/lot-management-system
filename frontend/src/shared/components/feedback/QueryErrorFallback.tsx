/**
 * QueryErrorFallback Component
 *
 * Displays a user-friendly error state for failed queries.
 * Use this component when `isError` is true in query results.
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError, error, refetch } = useProducts();
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (isError) return <QueryErrorFallback error={error} resetError={refetch} />;
 *
 * return <ProductTable products={data} />;
 * ```
 */

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui";

interface QueryErrorFallbackProps {
  /** The error object from the query */
  error: Error | null;
  /** Optional callback to reset/retry the query */
  resetError?: (() => void) | undefined;
  /** Custom title for the error display */
  title?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show a compact version */
  compact?: boolean;
}

/**
 * Extract user-friendly message from error object.
 */
function getErrorMessage(error: Error | null): string {
  if (!error) {
    return "予期しないエラーが発生しました";
  }
  return error.message || "エラーが発生しました";
}

export function QueryErrorFallback({
  error,
  resetError,
  title = "データの取得に失敗しました",
  className = "",
  compact = false,
}: QueryErrorFallbackProps) {
  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 ${className}`}
      >
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1">{getErrorMessage(error)}</span>
        {resetError && (
          <Button variant="ghost" size="sm" onClick={resetError} className="h-6 px-2">
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 p-6 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-red-800">{title}</h3>
          <p className="mt-1 text-sm text-red-600">{getErrorMessage(error)}</p>
          {resetError && (
            <Button variant="outline" size="sm" onClick={resetError} className="mt-3">
              <RefreshCw className="mr-2 h-4 w-4" />
              再試行
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
