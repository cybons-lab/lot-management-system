/**
 * 日付フォーマットユーティリティ
 *
 * date-fnsを使用して日付文字列やDateオブジェクトをフォーマットします。
 */

import { format, parseISO } from "date-fns";

/**
 * 日付フォーマットオプション
 */
export type FormatDateOptions = {
  /** フォーマット文字列（デフォルト: "yyyy/MM/dd"） */
  format?: string;
  /** フォールバック値（日付が無効な場合に返す文字列） */
  fallback?: string;
};

/**
 * 日付を指定フォーマットで文字列化
 *
 * @param date - フォーマットする日付（ISO文字列またはDateオブジェクト）
 * @param optionsOrFormat - フォーマット文字列またはオプションオブジェクト（デフォルト: "yyyy/MM/dd"）
 * @returns フォーマット済み日付文字列、無効な場合は空文字列
 *
 * @example
 * ```ts
 * formatDate("2024-01-15") // "2024/01/15"
 * formatDate(new Date(), "yyyy-MM-dd") // "2024-01-15"
 * formatDate(null, { fallback: "-" }) // "-"
 * ```
 */
export function formatDate(
  date: string | Date | null | undefined,
  optionsOrFormat: string | FormatDateOptions = "yyyy/MM/dd",
): string {
  const formatStr =
    typeof optionsOrFormat === "string"
      ? optionsOrFormat
      : (optionsOrFormat.format ?? "yyyy/MM/dd");
  const fallback = typeof optionsOrFormat === "object" ? (optionsOrFormat.fallback ?? "") : "";

  if (!date) return fallback;

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    console.warn("Invalid date passed to formatDate:", date, error);
    return fallback;
  }
}

/**
 * 日付を日時フォーマット（YYYY/MM/DD HH:mm）で文字列化
 *
 * @param date - フォーマットする日付
 * @returns フォーマット済み日時文字列
 *
 * @example
 * ```ts
 * formatDateTime("2024-01-15T10:30:00") // "2024/01/15 10:30"
 * ```
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, "yyyy/MM/dd HH:mm");
}

/**
 * 日付をHTML input[type="date"]用フォーマット（YYYY-MM-DD）で文字列化
 *
 * @param date - フォーマットする日付
 * @returns input要素用の日付文字列
 *
 * @example
 * ```ts
 * formatDateForInput("2024-01-15") // "2024-01-15"
 * formatDateForInput(new Date()) // "2024-01-15"
 * ```
 */
export function formatDateForInput(date: string | Date | null | undefined): string {
  return formatDate(date, "yyyy-MM-dd");
}
