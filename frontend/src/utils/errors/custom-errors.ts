/**
 * Custom Error Classes
 * アプリケーション全体で使用するカスタムエラークラス
 */

/**
 * APIエラーの基底クラス
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 認証エラー
 */
export class AuthenticationError extends ApiError {
  constructor(message = "認証に失敗しました") {
    super(message, 401, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * 認可エラー
 */
export class AuthorizationError extends ApiError {
  constructor(message = "この操作を実行する権限がありません") {
    super(message, 403, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * リソースが見つからない
 */
export class NotFoundError extends ApiError {
  constructor(message = "リソースが見つかりません") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * サーバーエラー
 */
export class ServerError extends ApiError {
  constructor(message = "サーバーエラーが発生しました") {
    super(message, 500, "SERVER_ERROR");
    this.name = "ServerError";
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

/**
 * ネットワークエラー
 */
export class NetworkError extends Error {
  constructor(message = "ネットワークエラーが発生しました") {
    super(message);
    this.name = "NetworkError";
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * HTTPレスポンスからApiErrorを生成
 */
export function createApiError(status: number, message?: string, details?: unknown): ApiError {
  const errorMessage = message || "エラーが発生しました";

  switch (true) {
    case status === 400:
      return new ValidationError(errorMessage, details);
    case status === 401:
      return new AuthenticationError(errorMessage);
    case status === 403:
      return new AuthorizationError(errorMessage);
    case status === 404:
      return new NotFoundError(errorMessage);
    case status >= 500:
      return new ServerError(errorMessage);
    default:
      return new ApiError(errorMessage, status, undefined, details);
  }
}
