/**
 * エラーロガーサービス
 *
 * フロントエンドアプリケーションの集約的なエラーログ機能を提供します。
 * 開発モードではコンソールに出力し、エラーレベルのログはバックエンドにも送信します。
 */

/**
 * エラーログエントリ
 */
export interface ErrorLogEntry {
  /** タイムスタンプ（ISO形式） */
  timestamp: string;
  /** ログレベル */
  level: "error" | "warning" | "info";
  /** エラー発生元 */
  source: string;
  /** エラーメッセージ */
  message: string;
  /** スタックトレース */
  stack?: string;
  /** 追加のコンテキスト情報 */
  context?: Record<string, unknown>;
  /** ユーザーエージェント */
  userAgent?: string;
  /** 発生URL */
  url?: string;
}

/**
 * エラーロガークラス
 *
 * シングルトンパターンでエラーログを管理します。
 */
class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private readonly maxLogs = 100;

  /**
   * 指定レベルでログを記録
   *
   * @param level - ログレベル（error/warning/info）
   * @param source - エラー発生元
   * @param error - エラーオブジェクトまたはメッセージ
   * @param context - 追加のコンテキスト情報
   */
  log(
    level: ErrorLogEntry["level"],
    source: string,
    error: Error | string,
    context?: Record<string, unknown>,
  ): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      source,
      message: typeof error === "string" ? error : error.message,
      ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
      ...(context ? { context } : {}),
      ...(navigator.userAgent ? { userAgent: navigator.userAgent } : {}),
      ...(window.location.href ? { url: window.location.href } : {}),
    };

    this.logs.push(entry);

    // Limit log size
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output in development
    if (import.meta.env.DEV) {
      const logMethod =
        level === "error" ? console.error : level === "warning" ? console.warn : console.log;
      logMethod(`[${level.toUpperCase()}] ${source}:`, error, context);
    }

    // Send to backend for all levels (info, warning, error)
    import("@/shared/utils/logger")
      .then((module) => {
        const Logger = module?.Logger;
        if (!Logger) return;

        // Extract file info from stack trace
        const fileInfo = this.extractFileInfo(entry.stack);
        const fileStr = fileInfo ? ` @ ${fileInfo}` : "";
        const contextStr = context ? ` | ${JSON.stringify(context)}` : "";
        const message = `[${source}] ${entry.message}${fileStr}${contextStr}`;

        switch (level) {
          case "error":
            Logger.error(message);
            break;
          case "warning":
            Logger.warning(message);
            break;
          case "info":
            Logger.info(message);
            break;
        }
      })
      .catch((err) => {
        console.warn("Failed to import Logger:", err);
      });
  }

  /**
   * エラーを記録
   *
   * @param source - エラー発生元
   * @param error - エラーオブジェクトまたはメッセージ
   * @param context - 追加のコンテキスト情報
   */
  error(source: string, error: Error | string, context?: Record<string, unknown>): void {
    this.log("error", source, error, context);
  }

  /**
   * 警告を記録
   *
   * @param source - 警告発生元
   * @param error - エラーオブジェクトまたはメッセージ
   * @param context - 追加のコンテキスト情報
   */
  warning(source: string, error: Error | string, context?: Record<string, unknown>): void {
    this.log("warning", source, error, context);
  }

  /**
   * 情報を記録
   *
   * @param source - 情報発生元
   * @param message - メッセージ
   * @param context - 追加のコンテキスト情報
   */
  info(source: string, message: string, context?: Record<string, unknown>): void {
    this.log("info", source, message, context);
  }

  /**
   * 全ログを取得
   *
   * @returns ログエントリの配列（コピー）
   */
  getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  /**
   * 全ログをクリア
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * スタックトレースからファイル情報を抽出
   *
   * @param stack - スタックトレース文字列
   * @returns ファイル名:行番号 形式の文字列、または undefined
   */
  private extractFileInfo(stack?: string): string | undefined {
    if (!stack) return undefined;

    // スタックトレースから最初の有効な行を取得
    // 例: "    at Component (http://localhost:5173/src/features/orders/OrderPage.tsx:45:12)"
    const lines = stack.split("\n");
    for (const line of lines) {
      // URLからファイルパスを抽出
      const match = line.match(/(?:https?:\/\/[^/]+)?\/src\/(.*?):(\d+):\d+/);
      if (match) {
        const [, filePath, lineNum] = match;
        return `${filePath}:${lineNum}`;
      }
    }

    return undefined;
  }
}

// シングルトンインスタンス
export const errorLogger = new ErrorLogger();

/**
 * エラーログを記録する便利関数
 *
 * @param source - エラー発生元
 * @param error - エラーオブジェクトまたはメッセージ
 * @param context - 追加のコンテキスト情報
 */
export const logError = (
  source: string,
  error: Error | string,
  context?: Record<string, unknown>,
) => {
  errorLogger.error(source, error, context);
};

/**
 * 警告ログを記録する便利関数
 *
 * @param source - 警告発生元
 * @param error - エラーオブジェクトまたはメッセージ
 * @param context - 追加のコンテキスト情報
 */
export const logWarning = (
  source: string,
  error: Error | string,
  context?: Record<string, unknown>,
) => {
  errorLogger.warning(source, error, context);
};

/**
 * 情報ログを記録する便利関数
 *
 * @param source - 情報発生元
 * @param message - メッセージ
 * @param context - 追加のコンテキスト情報
 */
export const logInfo = (source: string, message: string, context?: Record<string, unknown>) => {
  errorLogger.info(source, message, context);
};
