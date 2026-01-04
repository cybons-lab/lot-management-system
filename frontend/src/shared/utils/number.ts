/**
 * number.ts
 *
 * 数値フォーマット用ユーティリティ
 * - Intl.NumberFormatを使用した日本語ロケールでの数値整形
 *
 * 【設計意図】数値フォーマットの設計判断:
 *
 * 1. なぜ Intl.NumberFormat を使うのか
 *    理由: ブラウザ標準APIで国際化対応の数値フォーマット
 *    代替案との比較:
 *    - toLocaleString(): 毎回新しいフォーマッターを生成（パフォーマンス低下）
 *    - 手動フォーマット（正規表現）: バグが起きやすい、国際化対応が困難
 *    - Intl.NumberFormat: 一度生成したフォーマッターを再利用可能（高速）
 *    メリット:
 *    - ロケール対応が自動（日本: "1,234.56"、ドイツ: "1.234,56"）
 *    - 標準APIのため、追加ライブラリ不要
 *
 * 2. "ja-JP" ロケールの使用理由（L13）
 *    理由: ターゲットユーザーは日本の自動車部品商社
 *    日本のフォーマット規則:
 *    - 千の位区切り: カンマ（,）
 *    - 小数点: ピリオド（.）
 *    例: 1234567.89 → "1,234,567.89"
 *    将来的な多言語対応:
 *    - ユーザーの言語設定に応じて動的に切り替え可能
 *    - 例: new Intl.NumberFormat(getUserLocale())
 *
 * 3. fmt() のnull/undefined → "0" 変換（L29）
 *    理由: UIでの表示を確実にする（空白セルを避ける）
 *    業務シナリオ:
 *    - データベースから取得した在庫数が null（未設定）
 *    → テーブル表示で空白にすると「データがない」のか「0個」なのか不明
 *    → "0" と表示することで「在庫ゼロ」を明示
 *    代替案:
 *    - null/undefined → ""（空文字）: 数値カラムで空白は違和感
 *    - null/undefined → "-"（ハイフン）: 「未入力」の意味と混同
 *    → "0" が最も明確
 *
 * 4. 文字列型の受け入れ（L30）
 *    理由: API レスポンスで数値が文字列として返される場合に対応
 *    背景:
 *    - DECIMAL型（例: 在庫数、金額）はJSON で文字列として送信される
 *    → "1234.56" を parseFloat() で変換
 *    - 型安全性: TypeScript で number | string | null を許容
 *    メリット:
 *    - API 型定義とフォーマット関数の間で変換が不要
 *    - 呼び出し側が型変換を意識しなくて良い
 *
 * 5. Number.isNaN() チェック（L31）
 *    理由: 不正な文字列を安全に処理
 *    問題:
 *    - parseFloat("abc") → NaN
 *    → そのまま nf.format(NaN) すると "NaN" と表示される
 *    解決:
 *    - Number.isNaN(num) でチェック → "0" を返す
 *    メリット:
 *    - UIに "NaN" が表示されるバグを防止
 *    - エラーログに記録して後で調査可能（将来的な改善）
 *
 * 6. fmtDecimal() の設計（L46-57）
 *    理由: 小数点以下の桁数を統一する
 *    業務要件:
 *    - 金額: 小数点以下2桁（1,234.56円）
 *    - 数量: 小数点以下3桁（1,234.567個）
 *    - 重量: 小数点以下1桁（1,234.5kg）
 *    実装:
 *    - minimumFractionDigits: 最小桁数（不足分は0埋め）
 *    - maximumFractionDigits: 最大桁数（超過分は四捨五入）
 *    例:
 *    - fmtDecimal(1234.5, 2) → "1,234.50"（0埋め）
 *    - fmtDecimal(1234.5678, 2) → "1,234.57"（四捨五入）
 *
 * 7. nf を export する理由（L13）
 *    理由: カスタムフォーマットが必要な場合の拡張性
 *    用途:
 *    - fmt() で不十分な場合、直接 nf.format() を使用
 *    - 例: パーセント表示（new Intl.NumberFormat("ja-JP", { style: "percent" })）
 *    - 例: 通貨表示（new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" })）
 *    メリット:
 *    - 一貫した "ja-JP" ロケールを保ちつつ、柔軟なフォーマット対応
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
