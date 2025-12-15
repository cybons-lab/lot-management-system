/**
 * API エラーハンドリングユーティリティ
 *
 * Problem+JSON形式のエラーレスポンスをユーザーフレンドリーなメッセージに変換
 */

import type { HTTPError } from "ky";

/**
 * Problem+JSON形式のエラーレスポンス
 * RFC 7807準拠
 */
export interface ProblemJSON {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  error_code?: string;
  errors?: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
  details?: Record<string, unknown>;
}

/**
 * 在庫不足エラーの詳細
 */
export interface InsufficientStockDetails {
  error: "INSUFFICIENT_STOCK";
  message: string;
  lot_id: number;
  lot_number?: string;
  required: number;
  available: number;
}

/**
 * エラーコードから日本語メッセージへのマッピング
 */
export const ERROR_CODE_MESSAGES: Record<string, string> = {
  // 在庫・引当関連
  INSUFFICIENT_STOCK:
    "在庫が不足しています。他のユーザーによって在庫が確保された可能性があります。",
  INSUFFICIENT_LOT_STOCK: "指定されたロットの在庫が不足しています。",
  ALREADY_CONFIRMED: "この引当は既に確定されています。",
  ALLOCATION_NOT_FOUND: "指定された引当が見つかりません。",

  // 競合関連
  CONFLICT: "他のユーザーが同時に操作を行ったため、処理が競合しました。再度お試しください。",
  DUPLICATE: "同じデータが既に存在します。",

  // バリデーション関連
  VALIDATION_ERROR: "入力内容に問題があります。入力値を確認してください。",

  // 汎用
  NOT_FOUND: "データが見つかりません。既に削除された可能性があります。",
  FORBIDDEN: "この操作を行う権限がありません。",
  INTERNAL_SERVER_ERROR: "サーバーエラーが発生しました。しばらく経ってから再度お試しください。",
};

/**
 * HTTPステータスコードからデフォルトメッセージへのマッピング
 */
export const STATUS_MESSAGES: Record<number, string> = {
  400: "リクエストが不正です。",
  401: "認証が必要です。再度ログインしてください。",
  403: "この操作を行う権限がありません。",
  404: "データが見つかりません。",
  409: "データが競合しています。画面を更新して再度お試しください。",
  422: "入力内容に問題があります。",
  500: "サーバーエラーが発生しました。",
  502: "サーバーに接続できません。",
  503: "サービスが一時的に利用できません。",
};

/**
 * HTTPErrorからProblem+JSON形式のエラーを抽出
 */
export async function extractProblemJSON(error: HTTPError): Promise<ProblemJSON | null> {
  try {
    const response = error.response;
    if (!response) return null;

    const body = await response.clone().json();
    if (body && typeof body === "object" && "status" in body) {
      return body as ProblemJSON;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * HTTPErrorからユーザーフレンドリーなメッセージを取得
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof Error && "response" in error) {
    const httpError = error as HTTPError;
    const status = httpError.response?.status;

    // まずエラーメッセージをチェック
    if (httpError.message && !httpError.message.includes("HTTP Error")) {
      return httpError.message;
    }

    // ステータスコードからメッセージを生成
    if (status && STATUS_MESSAGES[status]) {
      return STATUS_MESSAGES[status];
    }
  }

  if (error instanceof Error) {
    return error.message || "エラーが発生しました。";
  }

  return "予期しないエラーが発生しました。";
}

/**
 * HTTPErrorからエラーコードを取得
 */
export async function getErrorCode(error: HTTPError): Promise<string | null> {
  const problem = await extractProblemJSON(error);
  return problem?.error_code ?? null;
}

/**
 * 在庫不足エラーかどうかを判定
 * エラーコード INSUFFICIENT_STOCK または 409 ステータスで判定
 */
export async function isInsufficientStockError(error: unknown): Promise<boolean> {
  if (error instanceof Error && "response" in error) {
    const httpError = error as HTTPError;

    // First check: 409 status code
    if (httpError.response?.status !== 409) {
      return false;
    }

    // Try to extract error code from response body
    try {
      const body = await httpError.response.clone().json();
      // Check for error code in various formats
      const errorCode =
        body?.error_code || body?.error || (body?.detail as Record<string, unknown>)?.error;
      if (errorCode === "INSUFFICIENT_STOCK") {
        return true;
      }
    } catch {
      // If body parsing fails, fall back to status code check
    }

    // Fallback: 409 status is likely a stock conflict
    return true;
  }
  return false;
}

/**
 * 在庫不足エラーかどうかを判定（同期版）
 * レスポンスボディを読めない場合はステータスコードのみで判定
 */
export function isInsufficientStockErrorSync(error: unknown): boolean {
  if (error instanceof Error && "response" in error) {
    const httpError = error as HTTPError;
    return httpError.response?.status === 409;
  }
  return false;
}

/**
 * 競合エラー(409)かどうかを判定
 */
export function isConflictError(error: unknown): boolean {
  if (error instanceof Error && "response" in error) {
    const httpError = error as HTTPError;
    return httpError.response?.status === 409;
  }
  return false;
}

/**
 * バリデーションエラー(422)かどうかを判定
 */
export function isValidationError(error: unknown): boolean {
  if (error instanceof Error && "response" in error) {
    const httpError = error as HTTPError;
    return httpError.response?.status === 422;
  }
  return false;
}

/**
 * NotFoundエラー(404)かどうかを判定
 */
export function isNotFoundError(error: unknown): boolean {
  if (error instanceof Error && "response" in error) {
    const httpError = error as HTTPError;
    return httpError.response?.status === 404;
  }
  return false;
}

/**
 * 適切なトーストタイプを返す
 */
export function getToastVariant(error: unknown): "default" | "destructive" {
  if (isConflictError(error) || isValidationError(error)) {
    return "destructive";
  }
  return "destructive";
}

/**
 * エラーハンドリングのためのヘルパー関数
 *
 * @example
 * ```ts
 * try {
 *   await confirmAllocation(id);
 * } catch (error) {
 *   const { message, variant } = handleApiError(error);
 *   toast({ title: "エラー", description: message, variant });
 * }
 * ```
 */
export function handleApiError(error: unknown): {
  message: string;
  variant: "default" | "destructive";
  isRetryable: boolean;
} {
  const message = getUserFriendlyMessage(error);
  const variant = getToastVariant(error);

  // リトライ可能かどうかを判定（在庫不足や競合は再試行で解決する可能性あり）
  const isRetryable = isConflictError(error);

  return { message, variant, isRetryable };
}
