/**
 * ステータス判定ユーティリティ
 * src/shared/utils/status.ts
 */

export type LotStatus = "expired" | "rejected" | "qc_hold" | "empty" | "available";

/**
 * ステータス表示の優先順位
 * 配列の先頭ほど優先度が高い
 *
 * 【設計意図】なぜこの優先順位なのか:
 *
 * 1. expired（最優先）
 *    理由: 有効期限切れは誤出庫の重大リスク
 *
 * 2. rejected
 *    理由: 検査不合格/廃棄は出庫不可
 *
 * 3. qc_hold
 *    理由: 検査待ち/保留中は出庫不可だが、解除される可能性がある
 *
 * 4. empty
 *    理由: 在庫0は出庫不可だが入荷で解消可能
 *
 * 5. available（最下位）
 *    理由: 他に問題がなければ「引当可能」
 *
 * この優先順位により、最も重要な警告を先頭に表示できる。
 */
const LOT_STATUS_PRIORITY: LotStatus[] = ["expired", "rejected", "qc_hold", "empty", "available"];

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
 * // => ['qc_hold']
 *
 * getLotStatuses({ status: 'active', current_quantity: 0 })
 * // => ['empty']
 *
 * getLotStatuses({ status: 'active', current_quantity: 50, inspection_status: 'pending' })
 * // => ['qc_hold']
 */
export function getLotStatuses(lot: LotLike | null | undefined): LotStatus[] {
  if (!lot) return ["available"]; // デフォルト

  const statuses: LotStatus[] = [];

  // 検査・保留状態の判定
  if (lot.inspection_status === "failed") {
    statuses.push("rejected");
  } else if (lot.inspection_status === "pending") {
    statuses.push("qc_hold");
  }

  if (lot.status === "quarantine" || lot.status === "locked") {
    statuses.push("qc_hold");
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
    statuses.push("empty");
  } else if (statuses.length === 0) {
    statuses.push("available");
  }

  // 重複除去
  const unique = Array.from(new Set(statuses));

  // 優先度順でソート
  unique.sort((a, b) => LOT_STATUS_PRIORITY.indexOf(a) - LOT_STATUS_PRIORITY.indexOf(b));

  // 何も判定されなかった場合のフォールバック
  return unique.length > 0 ? unique : ["available"];
}
