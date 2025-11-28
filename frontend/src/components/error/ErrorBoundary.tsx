/**
 * Error Boundary Component
 *
 * Catches React component errors and displays fallback UI.
 * Logs errors using the error logger service.
 */

import { Component, ErrorInfo, ReactNode } from "react";
import { logError } from "@/services/error-logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
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
