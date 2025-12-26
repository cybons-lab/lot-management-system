/**
 * 情報行表示コンポーネント
 *
 * ラベルと値を横並びで表示する汎用コンポーネントです。
 * 詳細画面やサマリー表示で使用されます。
 */

/**
 * InfoRowコンポーネントのProps
 */
type Props = {
  /** ラベルテキスト */
  label: string;
  /** 表示する値 */
  value: string | number;
  /** ハイライト表示するかどうか（デフォルト: false） */
  highlight?: boolean;
};

/**
 * 情報行を表示
 *
 * @param props - コンポーネントプロパティ
 * @returns 情報行コンポーネント
 *
 * @example
 * ```tsx
 * <InfoRow label="受注番号" value="ORD-001" />
 * <InfoRow label="合計金額" value={10000} highlight />
 * ```
 */
export function InfoRow({ label, value, highlight }: Props) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}:</span>
      <span className={highlight ? "font-semibold text-sky-700" : "font-medium text-gray-900"}>
        {value}
      </span>
    </div>
  );
}
