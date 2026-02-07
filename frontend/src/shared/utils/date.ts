/**
 * 日付ユーティリティ
 *
 * プロジェクト全体で使用する日付関連の関数を提供。
 * date-fnsライブラリをベースに、プロジェクト固有の要件に対応。
 *
 * @module shared/utils/date
 */

import {
  format,
  parseISO,
  isSameDay as dateFnsIsSameDay,
  startOfDay,
  differenceInDays,
} from "date-fns";

// ========================================
// Section 1: 型定義
// ========================================

/**
 * 日付入力の型
 */
export type DateInput = string | Date | null | undefined;

/**
 * 日付フォーマットオプション
 */
export interface FormatDateOptions {
  /** フォーマット文字列（デフォルト: "yyyy/MM/dd"） */
  format?: string;
  /** フォールバック値（日付が無効な場合に返す文字列） */
  fallback?: string;
}

// ========================================
// Section 2: フォーマット関数（表示用）
// ========================================

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
  date: DateInput,
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
export function formatDateTime(date: DateInput): string {
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
export function formatDateForInput(date: DateInput): string {
  return formatDate(date, "yyyy-MM-dd");
}

/**
 * 日付をYYYY-MM-DD形式でフォーマット（マップキー用）
 *
 * date-fnsを使わずに直接フォーマットする高速版。
 *
 * @param date - フォーマット対象
 * @returns YYYY-MM-DD形式の文字列
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 日付をYYYY-MM-DD形式にフォーマット
 *
 * formatDateKeyのエイリアス（互換性維持用）
 */
export function formatYmd(value: DateInput): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return formatDateKey(d);
}

// ========================================
// Section 3: 日付計算関数
// ========================================

/**
 * 指定月の全日付を取得
 *
 * @param targetMonth - 対象月（月内のいずれかの日付）
 * @returns 月内の全日付の配列
 *
 * @example
 * getDatesForMonth(new Date(2024, 0, 15)) // 2024年1月の全31日
 */
export function getDatesForMonth(targetMonth: Date): Date[] {
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => new Date(year, month, index + 1));
}

/**
 * 翌月1日〜10日の日付を取得
 *
 * SAP予測データが翌月10日まで含むため、forecast機能で使用。
 *
 * @param targetMonth - 基準月
 * @returns 翌月1-10日の日付配列
 */
export function getDatesForNextMonthFirst10Days(targetMonth: Date): Date[] {
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();
  const nextMonthStart = new Date(year, month + 1, 1);

  return Array.from(
    { length: 10 },
    (_, index) => new Date(nextMonthStart.getFullYear(), nextMonthStart.getMonth(), index + 1),
  );
}

/**
 * 2つの日付が同じ日かチェック（時刻無視）
 *
 * @param date1 - 比較対象1
 * @param date2 - 比較対象2
 * @returns 同じ日ならtrue
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return dateFnsIsSameDay(date1, date2);
}

/**
 * 過去の日付かチェック
 *
 * @param date - チェック対象の日付
 * @param referenceDate - 基準日（デフォルト: 今日の0時）
 * @returns 過去日ならtrue
 */
export function isPastDate(date: Date, referenceDate?: Date): boolean {
  const ref = referenceDate ?? startOfDay(new Date());
  return date < ref;
}

/**
 * 今日の0時を取得
 *
 * @returns Date object representing today at 00:00:00
 */
export function getTodayStart(): Date {
  return startOfDay(new Date());
}

/**
 * 月の開始日を取得
 *
 * @param date - 対象月内のいずれかの日付
 * @returns 月初の日付（1日の0時）
 */
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * 2つの日付の差分を日数で計算
 *
 * @param date1 - 比較対象1
 * @param date2 - 比較対象2
 * @returns 日数差（date1 - date2）
 */
export function diffDays(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === "string" ? new Date(date1) : date1;
  const d2 = typeof date2 === "string" ? new Date(date2) : date2;
  return differenceInDays(d1, d2);
}

// ========================================
// Section 4: バリデーション関数
// ========================================

/**
 * 日付が有効かどうかをチェック
 *
 * @param value - チェック対象
 * @returns 有効な日付ならtrue
 */
export function isValidDate(value?: unknown): boolean {
  if (!value) return false;
  const d = new Date(String(value));
  return !Number.isNaN(d.getTime());
}

/**
 * 安全に日付をパース
 *
 * @param value - パース対象
 * @returns Date オブジェクトまたは null
 */
export function parseDate(value: DateInput): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
}
