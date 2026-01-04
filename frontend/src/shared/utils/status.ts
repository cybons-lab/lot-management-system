/**
 * ステータス判定ユーティリティ
 * src/shared/utils/status.ts
 */

export type LotStatus =
  | "locked"
  | "inspection_failed"
  | "inspection_pending"
  | "expired"
  | "depleted"
  | "available";

/**
 * ステータス表示の優先順位
 * 配列の先頭ほど優先度が高い
 *
 * 【設計意図】なぜこの優先順位なのか:
 *
 * 1. locked（最優先）
 *    理由: ロック状態は手動操作で設定される特別な状態
 *    用途: 品質問題や顧客専用在庫など、引当を完全に禁止する必要がある
 *    → 他のすべてのステータスより優先して表示
 *
 * 2. inspection_failed（2番目）
 *    理由: 検査不合格品は出荷できない（法的・品質的に重大）
 *    → 在庫があっても使えないことを明確に示す必要がある
 *
 * 3. inspection_pending（3番目）
 *    理由: 検査待ちの在庫は「条件付きで使えない」状態
 *    → 検査が完了すれば使える可能性があるため、failedより優先度は低い
 *
 * 4. expired（4番目）
 *    理由: 有効期限切れは顧客クレームに直結
 *    → depleted（在庫なし）より深刻な問題
 *
 * 5. depleted（5番目）
 *    理由: 在庫0は引当不可だが、入荷すれば使える
 *    → expired等の品質問題より優先度は低い
 *
 * 6. available（最下位）
 *    理由: 他に問題がなければ「引当可能」
 *    → デフォルトの正常状態
 *
 * この優先順位により、最も重要な警告を先頭に表示できる。
 */
const LOT_STATUS_PRIORITY: LotStatus[] = [
  "locked",
  "inspection_failed",
  "inspection_pending",
  "expired",
  "depleted",
  "available",
];

/**
 * Lot オブジェクトから判定に必要な最小限のフィールド
 */
type LotLike = {
  status?: string;
  current_quantity?: number | string | null;
  inspection_status?: string;
  expiry_date?: string | null;
};

/**
 * ロットの状態から複数のステータスを判定して返す
 *
 * 【設計意図】なぜ複数のステータスを返すのか:
 *
 * 1. 複合的な状態の表現
 *    理由: 1つのロットに複数の問題が同時に存在する可能性
 *    例: 「検査待ち」かつ「在庫あり」→ ['inspection_pending', 'available']
 *    → すべての状態を返すことで、UIで適切に表示できる
 *
 * 2. 優先度順のソート
 *    理由: 最も重要な問題を先頭に配置
 *    → UI側で statuses[0] を取得すれば、最重要ステータスを表示可能
 *    → または全ステータスをバッジで並べて表示することも可能
 *
 * 3. 有効期限判定のsetHours(0,0,0,0)
 *    理由: 時刻部分を無視して「日付のみ」で比較
 *    例:
 *    - expiry_date: "2024-01-15T23:59:59"（有効期限: 1月15日）
 *    - today: "2024-01-16T00:00:01"（今日: 1月16日）
 *    → 時刻を0時に統一しないと、1月15日の23:59:59が「まだ有効」と判定される
 *    → setHours(0,0,0,0)で日付のみを比較し、正確に「期限切れ」を判定
 *
 * 4. デフォルト値 ['available']
 *    理由: lot が null/undefined でも、安全にステータスを返す
 *    → UIで常にステータス配列を扱えるようにする（nullチェック不要）
 *
 * @param lot - ロットオブジェクト
 * @returns 優先度順にソートされたステータス配列
 *
 * @example
 * getLotStatuses({ status: 'locked', current_quantity: 10 })
 * // => ['locked']
 *
 * getLotStatuses({ status: 'active', current_quantity: 0 })
 * // => ['depleted']
 *
 * getLotStatuses({ status: 'active', current_quantity: 50, inspection_status: 'pending' })
 * // => ['inspection_pending', 'available']
 */
export function getLotStatuses(lot: LotLike | null | undefined): LotStatus[] {
  if (!lot) return ["available"]; // デフォルト

  const statuses: LotStatus[] = [];

  // ロック状態の判定（最優先）
  if (lot.status === "locked") {
    statuses.push("locked");
  }

  // 検査ステータスの判定
  if (lot.inspection_status === "failed") {
    statuses.push("inspection_failed");
  } else if (lot.inspection_status === "pending") {
    statuses.push("inspection_pending");
  }

  // 有効期限の判定
  // 【重要】setHours(0,0,0,0)で時刻を無視し、日付のみで比較
  if (lot.expiry_date) {
    const expiryDate = new Date(lot.expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時刻を0時に統一
    if (expiryDate < today) {
      statuses.push("expired");
    }
  }

  // 在庫数の判定
  const qty = Number(lot.current_quantity ?? 0);
  if (qty <= 0) {
    statuses.push("depleted");
  } else {
    statuses.push("available");
  }

  // 重複除去
  const unique = Array.from(new Set(statuses));

  // 優先度順でソート
  unique.sort((a, b) => LOT_STATUS_PRIORITY.indexOf(a) - LOT_STATUS_PRIORITY.indexOf(b));

  // 何も判定されなかった場合のフォールバック
  return unique.length > 0 ? unique : ["available"];
}
