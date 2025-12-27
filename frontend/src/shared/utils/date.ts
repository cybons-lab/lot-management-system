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
 * 【設計意図】
 *
 * 1. デフォルトフォーマット "yyyy/MM/dd"
 *    理由: 日本のビジネス文書で一般的な形式
 *    → このシステムのユーザーは日本の自動車部品商社
 *    → 受注書、納品書、在庫レポート等で統一されたフォーマットが必要
 *
 * 2. parseISO()の使用
 *    理由: バックエンドから返却される日付はISO 8601形式（"2024-01-15T00:00:00Z"）
 *    → parseISO()は厳密なISO形式パース専用で、パフォーマンスが良い
 *    → new Date()よりもタイムゾーン処理が安全
 *
 * 3. fallbackオプション
 *    理由: null/undefinedの日付を空文字列ではなく"-"等で表示したいケースがある
 *    例: 在庫一覧で「有効期限なし」を"-"で表示
 *    → オプションで指定可能にすることで柔軟性を確保
 *
 * 4. try-catchによるエラーハンドリング
 *    理由: 不正な日付文字列（"invalid"等）が渡された場合にアプリがクラッシュしないよう
 *    → エラーをconsole.warnで記録し、fallbackを返す
 *    → ユーザーには最低限の情報を表示し続ける
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
