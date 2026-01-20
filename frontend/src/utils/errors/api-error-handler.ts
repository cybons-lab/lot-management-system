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

  // FE-02 Fix: Add new backend error codes
  ALREADY_RELEASED: "この予約は既に解放されています。",
  PROVISIONAL_RESERVATION: "入荷予定ベースの仮予約は確定できません。",
  LOT_NOT_FOUND: "指定されたロットが見つかりません。",
  LOT_NOT_ACTIVE: "指定されたロットは有効ではありません。",
  LOT_EXPIRED: "指定されたロットは有効期限が切れています。",
  LOT_LOCKED: "指定されたロットはロックされています。",
  SAP_REGISTRATION_FAILED: "SAP登録に失敗しました。システム管理者に連絡してください。",
  CANNOT_CANCEL_CONFIRMED: "確定済みの予約はキャンセルできません。SAP連携が必要です。",
  INVALID_STATE_TRANSITION: "この状態からの遷移は許可されていません。",

  // 競合関連
  CONFLICT: "他のユーザーが同時に操作を行ったため、処理が競合しました。再度お試しください。",
  DUPLICATE: "同じデータが既に存在します。",
  DUPLICATE_ENTRY: "同じデータが既に登録されています。",
  DUPLICATE_LOT_NUMBER: "同じロット番号が既に存在します。",
  DUPLICATE_ORDER: "同じ受注が既に存在します。",

  // バリデーション関連
  VALIDATION_ERROR: "入力内容に問題があります。入力値を確認してください。",
  INVALID_QUANTITY: "数量が不正です。正の数を入力してください。",
  INVALID_DATE: "日付が不正です。",
  INVALID_DATE_RANGE: "日付の範囲が不正です。開始日は終了日より前である必要があります。",
  REQUIRED_FIELD_MISSING: "必須項目が入力されていません。",

  // 受注関連
  ORDER_NOT_FOUND: "指定された受注が見つかりません。",
  ORDER_ALREADY_SHIPPED: "この受注は既に出荷済みです。",
  ORDER_ALREADY_CLOSED: "この受注は既にクローズされています。",
  ORDER_CANNOT_BE_MODIFIED: "この受注は変更できません。",

  // ユーザー関連
  USER_NOT_FOUND: "指定されたユーザーが見つかりません。",
  USER_ALREADY_EXISTS: "このユーザー名は既に使用されています。",
  INVALID_PASSWORD: "パスワードが正しくありません。",
  PASSWORD_TOO_WEAK: "パスワードが弱すぎます。より強力なパスワードを設定してください。",

  // OCR関連
  OCR_PROCESSING_FAILED: "OCR処理に失敗しました。画像を確認してください。",
  OCR_TIMEOUT: "OCR処理がタイムアウトしました。再度お試しください。",

  // 汎用
  NOT_FOUND: "データが見つかりません。既に削除された可能性があります。",
  FORBIDDEN: "この操作を行う権限がありません。",
  UNAUTHORIZED: "認証が必要です。再度ログインしてください。",
  INTERNAL_SERVER_ERROR: "サーバーエラーが発生しました。しばらく経ってから再度お試しください。",
  SERVICE_UNAVAILABLE: "サービスが一時的に利用できません。しばらく経ってから再度お試しください。",
  NETWORK_ERROR: "ネットワークエラーが発生しました。接続を確認してください。",
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
 * 在庫不足エラーの詳細メッセージを取得
 */
function getInsufficientStockMessage(details: Record<string, unknown>): string | null {
  const stockDetails = details as unknown as InsufficientStockDetails;
  if (stockDetails.required !== undefined && stockDetails.available !== undefined) {
    return `在庫が不足しています（必要: ${stockDetails.required}, 利用可能: ${stockDetails.available}）`;
  }
  return null;
}

/**
 * Problem+JSONからメッセージを取得
 */
function getMessageFromProblem(problem: ProblemJSON): string | null {
  // エラーコードからメッセージを取得
  if (problem.error_code && ERROR_CODE_MESSAGES[problem.error_code]) {
    // 在庫不足エラーの場合、詳細情報を含める
    if (problem.error_code === "INSUFFICIENT_STOCK" && problem.details) {
      const detailMessage = getInsufficientStockMessage(problem.details);
      if (detailMessage) return detailMessage;
    }
    return ERROR_CODE_MESSAGES[problem.error_code];
  }

  // detailフィールドがある場合はそれを使用
  if (problem.detail && !problem.detail.includes("HTTP Error")) {
    return problem.detail;
  }

  // titleフィールドがある場合
  if (problem.title && problem.title !== "Error") {
    return problem.title;
  }

  return null;
}

/**
 * HTTPErrorからユーザーフレンドリーなメッセージを取得（非同期版）
 * Problem+JSONからエラーコードを解析し、適切なメッセージを返す
 */
export async function getUserFriendlyMessageAsync(error: unknown): Promise<string> {
  if (error instanceof Error && "response" in error) {
    const httpError = error as HTTPError;
    const status = httpError.response?.status;

    // Problem+JSONからエラー情報を取得
    const problem = await extractProblemJSON(httpError);
    if (problem) {
      const message = getMessageFromProblem(problem);
      if (message) return message;
    }

    // ステータスコードからメッセージを生成
    if (status && STATUS_MESSAGES[status]) {
      return STATUS_MESSAGES[status];
    }
  }

  // 同期版にフォールバック
  return getUserFriendlyMessage(error);
}

/**
 * HTTPErrorからユーザーフレンドリーなメッセージを取得（同期版）
 * レスポンスボディを読めない場合はステータスコードからメッセージを生成
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof Error && "response" in error) {
    const httpError = error as HTTPError;
    const status = httpError.response?.status;

    // ステータスコードからメッセージを生成
    if (status && STATUS_MESSAGES[status]) {
      return STATUS_MESSAGES[status];
    }

    // エラーメッセージをチェック（HTTP Errorは除外）
    if (httpError.message && !httpError.message.includes("HTTP Error")) {
      return httpError.message;
    }
  }

  if (error instanceof Error) {
    // 技術的なメッセージをフィルタリング
    const msg = error.message;
    if (msg && !msg.includes("HTTP Error") && !msg.includes("fetch")) {
      return msg;
    }
    return "エラーが発生しました。";
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
  if (!(error instanceof Error && "response" in error)) {
    return false;
  }

  const httpError = error as HTTPError;

  // 409 status code check
  if (httpError.response?.status !== 409) {
    return false;
  }

  // Try to extract error code, fallback to true for any 409
  try {
    const body = await httpError.response.clone().json();
    const errorCode = body?.error_code || body?.error;
    return errorCode === "INSUFFICIENT_STOCK" || true;
  } catch {
    // If body parsing fails, 409 is likely a stock conflict
    return true;
  }
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
 * エラーハンドリングのためのヘルパー関数（同期版）
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

/**
 * エラーハンドリングのためのヘルパー関数（非同期版）
 * Problem+JSONからエラーコードを解析し、より詳細なメッセージを返す
 *
 * @example
 * ```ts
 * try {
 *   await confirmAllocation(id);
 * } catch (error) {
 *   const { message, variant } = await handleApiErrorAsync(error);
 *   toast.error(message);
 * }
 * ```
 */
export async function handleApiErrorAsync(error: unknown): Promise<{
  message: string;
  variant: "default" | "destructive";
  isRetryable: boolean;
  errorCode?: string;
}> {
  const message = await getUserFriendlyMessageAsync(error);
  const variant = getToastVariant(error);

  // エラーコードを取得
  let errorCode: string | undefined;
  if (error instanceof Error && "response" in error) {
    const problem = await extractProblemJSON(error as HTTPError);
    errorCode = problem?.error_code ?? undefined;
  }

  // リトライ可能かどうかを判定（在庫不足や競合は再試行で解決する可能性あり）
  const isRetryable = isConflictError(error);

  return { message, variant, isRetryable, errorCode };
}

/**
 * Mutation用のonErrorハンドラを生成
 * 操作名を指定すると「{操作名}に失敗しました: {エラーメッセージ}」形式でトーストを表示
 *
 * @example
 * ```ts
 * const mutation = useMutation({
 *   mutationFn: createOrder,
 *   onError: createErrorHandler("受注作成"),
 * });
 * ```
 */
export function createErrorHandler(
  operationName: string,
  toast: { error: (message: string) => void },
): (error: unknown) => Promise<void> {
  return async (error: unknown) => {
    const { message } = await handleApiErrorAsync(error);
    toast.error(`${operationName}に失敗しました: ${message}`);
  };
}
