/**
 * SmartRead Feature Logger
 *
 * 開発環境でのみデバッグログを出力するロガー。
 * 本番環境では info/debug レベルのログを抑制。
 *
 * 使用例:
 *   import { logger } from "../utils/logger";
 *   logger.info("タスク同期開始", { taskId, configId });
 *   logger.debug("詳細データ", data);
 *   logger.error("同期失敗", error);
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const LOG_PREFIX = "[SmartRead]";

/**
 * 環境に応じたログレベル
 * - development: debug以上を出力
 * - production: warn以上のみ出力
 */
const getMinLogLevel = (): LogLevel => {
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    return "debug";
  }
  return "warn";
};

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * ログ出力すべきかどうかを判定
 */
const shouldLog = (level: LogLevel): boolean => {
  const minLevel = getMinLogLevel();
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
};

/**
 * コンテキストをフォーマット
 */
const formatContext = (context?: LogContext): string => {
  if (!context || Object.keys(context).length === 0) {
    return "";
  }
  try {
    return " " + JSON.stringify(context);
  } catch {
    return " [context serialization failed]";
  }
};

/**
 * SmartRead用ロガー
 */
export const logger = {
  /**
   * デバッグログ（開発環境のみ）
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog("debug")) return;
    console.debug(`${LOG_PREFIX} ${message}${formatContext(context)}`);
  },

  /**
   * 情報ログ（開発環境のみ）
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog("info")) return;
    console.info(`${LOG_PREFIX} ${message}${formatContext(context)}`);
  },

  /**
   * 警告ログ（常に出力）
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog("warn")) return;
    console.warn(`${LOG_PREFIX} ${message}${formatContext(context)}`);
  },

  /**
   * エラーログ（常に出力）
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    if (!shouldLog("error")) return;
    const errorInfo = error instanceof Error ? { name: error.name, message: error.message } : error;
    console.error(`${LOG_PREFIX} ${message}`, errorInfo, context ? formatContext(context) : "");
  },

  /**
   * グループ開始（開発環境のみ）
   */
  group(label: string): void {
    if (!shouldLog("debug")) return;
    console.group(`${LOG_PREFIX} ${label}`);
  },

  /**
   * グループ終了（開発環境のみ）
   */
  groupEnd(): void {
    if (!shouldLog("debug")) return;
    console.groupEnd();
  },

  /**
   * 処理時間計測開始（開発環境のみ）
   */
  time(label: string): void {
    if (!shouldLog("debug")) return;
    console.time(`${LOG_PREFIX} ${label}`);
  },

  /**
   * 処理時間計測終了（開発環境のみ）
   */
  timeEnd(label: string): void {
    if (!shouldLog("debug")) return;
    console.timeEnd(`${LOG_PREFIX} ${label}`);
  },
};

/**
 * 操作ログ用ヘルパー
 * 処理の開始・終了・保存をログ出力
 */
export const operationLogger = {
  /**
   * 処理開始
   */
  start(operation: string, context?: LogContext): void {
    logger.info(`${operation} 開始`, context);
  },

  /**
   * 処理成功
   */
  success(operation: string, context?: LogContext): void {
    logger.info(`${operation} 完了`, context);
  },

  /**
   * 処理失敗
   */
  failure(operation: string, error: unknown, context?: LogContext): void {
    logger.error(`${operation} 失敗`, error, context);
  },

  /**
   * データ保存
   */
  saved(dataType: string, count: number, context?: LogContext): void {
    logger.info(`${dataType} を保存しました`, { count, ...context });
  },
};
