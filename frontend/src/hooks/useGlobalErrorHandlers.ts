/**
 * グローバルエラーハンドラーフック
 *
 * アプリケーション全体の未キャッチエラーとPromise拒否をハンドリングし、
 * エラーログサービスに記録します。
 */

import { useEffect } from "react";

import { logError } from "@/services/error-logger";

/**
 * グローバルエラーハンドラーをセットアップするフック
 *
 * このフックはアプリケーションのルートコンポーネントで使用し、
 * 以下のエラーを捕捉します：
 * - window.onerrorで捕捉される未キャッチエラー
 * - window.onunhandledrejectionで捕捉されるPromise拒否
 *
 * @example
 * ```tsx
 * function App() {
 *   useGlobalErrorHandlers();
 *   return <Router />;
 * }
 * ```
 */
export function useGlobalErrorHandlers() {
  useEffect(() => {
    // 未キャッチエラーをハンドリング
    const handleError = (event: ErrorEvent) => {
      logError("Global", event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    // 未処理のPromise拒否をハンドリング
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError("UnhandledRejection", event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);
}
