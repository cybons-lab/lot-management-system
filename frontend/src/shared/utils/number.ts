/**
 * number.ts
 *
 * 数値フォーマット用ユーティリティ
 * - Intl.NumberFormatを使用した日本語ロケールでの数値整形
 */

/**
 * 日本語ロケールの数値フォーマッター
 * @example
 * nf.format(1234567.89) // "1,234,567.89"
 */
export const nf = new Intl.NumberFormat("ja-JP");

/**
 * 数値を日本語ロケールでフォーマット
 * null/undefined は 0 として扱う
 *
 * @param n - フォーマットする数値（または文字列、null、undefined）
 * @returns フォーマットされた文字列
 *
 * @example
 * fmt(1234567) // "1,234,567"
 * fmt(null) // "0"
 * fmt(undefined) // "0"
 * fmt("1234.56") // "1,234.56"
 */
export const fmt = (n?: number | string | null): string => {
  if (n == null) return "0";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(num)) return "0";
  return nf.format(num);
};

/**
 * 小数点以下の桁数を指定して数値をフォーマット
 *
 * @param n - フォーマットする数値
 * @param decimals - 小数点以下の桁数（デフォルト: 2）
 * @returns フォーマットされた文字列
 *
 * @example
 * fmtDecimal(1234.5678, 2) // "1,234.57"
 * fmtDecimal(1234, 0) // "1,234"
 */
export const fmtDecimal = (n?: number | string | null, decimals = 2): string => {
  if (n == null) return "0";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(num)) return "0";

  const formatter = new Intl.NumberFormat("ja-JP", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return formatter.format(num);
};
