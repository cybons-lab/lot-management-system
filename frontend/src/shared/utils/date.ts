/**
 * date.ts
 *
 * 安全な日付処理ユーティリティ
 * - 不正な日付値（null, 空文字, "0000-00-00", 無効な形式）を適切に処理
 * - フォーマットエラーでUIが壊れないようガード
 */

import { format, isValid, parseISO } from "date-fns";

// ============================================
// 型定義
// ============================================

/**
 * 日付として受け入れ可能な値の型
 */
export type DateInput = string | number | Date | null | undefined;

/**
 * フォーマットオプション
 */
export interface FormatDateOptions {
  /** フォールバック文字列（デフォルト: "-"） */
  fallback?: string;
  /** 日付フォーマット（デフォルト: "yyyy/MM/dd"） */
  formatString?: string;
}

// ============================================
// 不正値判定
// ============================================

/**
 * 不正な日付値かどうかを判定
 * @param value - チェックする値
 * @returns true: 不正な日付, false: 有効な可能性あり
 */
function isInvalidDateValue(value: DateInput): boolean {
  if (value == null) return true;
  if (value === "") return true;

  // 文字列の場合
  if (typeof value === "string") {
    // "0000-00-00" や "0000-00-00T00:00:00" などの形式
    if (value.startsWith("0000")) return true;
    // 空白のみ
    if (value.trim() === "") return true;
  }

  return false;
}

// ============================================
// 安全なパース
// ============================================

/**
 * 安全に日付をパース
 * @param value - パースする値
 * @returns 有効なDateオブジェクト、または null
 *
 * @example
 * parseSafeDate("2024-01-15") // Date object
 * parseSafeDate(null) // null
 * parseSafeDate("") // null
 * parseSafeDate("0000-00-00") // null
 * parseSafeDate("invalid") // null
 */
export function parseSafeDate(value: DateInput): Date | null {
  // 不正値チェック
  if (isInvalidDateValue(value)) {
    return null;
  }

  try {
    // Dateオブジェクトの場合
    if (value instanceof Date) {
      return isValid(value) ? value : null;
    }

    // 数値の場合（Unix timestamp）
    if (typeof value === "number") {
      const date = new Date(value);
      return isValid(date) ? date : null;
    }

    // 文字列の場合
    if (typeof value === "string") {
      // ISO形式でパース
      const date = parseISO(value);
      return isValid(date) ? date : null;
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================
// フォーマット
// ============================================

/**
 * 安全に日付をフォーマット
 * @param value - フォーマットする日付
 * @param options - オプション
 * @returns フォーマットされた文字列、または fallback 文字列
 *
 * @example
 * formatDate("2024-01-15") // "2024/01/15"
 * formatDate(null) // "-"
 * formatDate("", { fallback: "未設定" }) // "未設定"
 * formatDate("0000-00-00") // "-"
 * formatDate("2024-01-15", { formatString: "yyyy-MM-dd" }) // "2024-01-15"
 */
export function formatDate(value: DateInput, options: FormatDateOptions = {}): string {
  const { fallback = "-", formatString = "yyyy/MM/dd" } = options;

  const date = parseSafeDate(value);
  if (!date) {
    return fallback;
  }

  try {
    return format(date, formatString);
  } catch {
    return fallback;
  }
}

/**
 * 日時をフォーマット（時刻含む）
 * @param value - フォーマットする日時
 * @param options - オプション
 * @returns フォーマットされた文字列、または fallback 文字列
 *
 * @example
 * formatDateTime("2024-01-15T14:30:00") // "2024/01/15 14:30"
 * formatDateTime(null) // "-"
 */
export function formatDateTime(value: DateInput, options: FormatDateOptions = {}): string {
  const { fallback = "-", formatString = "yyyy/MM/dd HH:mm" } = options;

  return formatDate(value, { fallback, formatString });
}

/**
 * 日付を短い形式でフォーマット（年なし）
 * @param value - フォーマットする日付
 * @param options - オプション
 * @returns フォーマットされた文字列、または fallback 文字列
 *
 * @example
 * formatDateShort("2024-01-15") // "01/15"
 */
export function formatDateShort(value: DateInput, options: FormatDateOptions = {}): string {
  const { fallback = "-", formatString = "MM/dd" } = options;

  return formatDate(value, { fallback, formatString });
}

/**
 * 相対的な日付表示（今日、昨日、明日など）
 * @param value - 比較する日付
 * @returns 相対表示文字列
 *
 * @example
 * formatRelativeDate(today) // "今日"
 * formatRelativeDate(yesterday) // "昨日"
 * formatRelativeDate(tomorrow) // "明日"
 * formatRelativeDate(someOldDate) // "2024/01/15"
 */
export function formatRelativeDate(value: DateInput): string {
  const date = parseSafeDate(value);
  if (!date) {
    return "-";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "今日";
  if (diffDays === -1) return "昨日";
  if (diffDays === 1) return "明日";

  return formatDate(date);
}
