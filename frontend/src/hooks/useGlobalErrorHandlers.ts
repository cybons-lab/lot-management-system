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
 * 【設計意図】なぜグローバルエラーハンドラーが必要なのか:
 *
 * 1. 予期しないエラーの検知
 *    理由: すべてのコンポーネントでtry-catchを書くのは現実的ではない
 *    → 漏れたエラーをグローバルハンドラーで捕捉し、記録する
 *    例: サードパーティライブラリのバグ、非同期処理のエラー
 *
 * 2. 2種類のハンドラーが必要な理由
 *    - window.onerror: 同期的なエラー（未定義変数、型エラー等）
 *    - window.onunhandledrejection: 非同期エラー（Promise拒否）
 *    → Reactアプリでは非同期処理が多いため、両方のカバーが必須
 *
 * 3. エラー情報の記録
 *    目的: 本番環境でのエラー発生時に原因を追跡
 *    → filename、lineno、colnoを記録することで、どのファイルの何行目でエラーが発生したかを特定
 *    → バックエンドログと合わせて、問題の全体像を把握
 *
 * 4. useEffectのクリーンアップ
 *    理由: ホットリロード時やテスト時に、イベントリスナーの多重登録を防ぐ
 *    → メモリリーク防止、正常なアンマウント処理
 *
 * 5. React Error Boundaryとの使い分け
 *    - Error Boundary: Reactコンポーネントツリー内のレンダリングエラーをキャッチ
 *    - Global Handler: Reactの外で発生したエラー（イベントハンドラ、setTimeout等）をキャッチ
 *    → 両方を組み合わせることで、あらゆるエラーを捕捉
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
    // 未キャッチエラーをハンドリング（同期エラー）
    const handleError = (event: ErrorEvent) => {
      logError("Global", event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    // 未処理のPromise拒否をハンドリング（非同期エラー）
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError("UnhandledRejection", event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // クリーンアップ: イベントリスナーの多重登録を防ぐ
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);
}
