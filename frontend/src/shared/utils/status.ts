/**
 * ステータス判定ユーティリティ
 * src/shared/utils/status.ts
 */

export type LotStatus =
  | "archived"
  | "expired"
  | "rejected"
  | "qc_hold"
  | "pending_receipt"
  | "empty"
  | "available";

/**
 * ステータス表示の優先順位
 * 配列の先頭ほど優先度が高い
 *
 * 【設計意図】なぜこの優先順位なのか:
 *
 * 1. archived（最優先）
 *    理由: アーカイブ済みは「管理対象外」であり、他の警告よりもこの状態が支配的
 *
 * 2. expired
 *    理由: 有効期限切れは誤出庫の重大リスク
 *
 * 3. rejected
 *    理由: 検査不合格/廃棄は出庫不可
 *
 * 4. qc_hold
 *    理由: 検査待ち/保留中は出庫不可だが、解除される可能性がある
 *
 * 5. pending_receipt
 *    理由: 未入荷は出庫不可だが、入荷予定がある
 *
 * 6. empty
 *    理由: 在庫0は出庫不可だが入荷で解消可能
 *
 * 7. available（最下位）
 *    理由: 他に問題がなければ「引当可能」
 *
 * この優先順位により、最も重要な警告を先頭に表示できる。
 */
const LOT_STATUS_PRIORITY: LotStatus[] = [
  "archived",
  "expired",
  "rejected",
  "qc_hold",
  "pending_receipt",
  "empty",
  "available",
];

/**
 * Lot オブジェクトから判定に必要な最小限のフィールド
 */
interface LotLike {
  status?: string;
  current_quantity?: number | string | null;
  inspection_status?: string;
  expiry_date?: string | null;
  received_date?: string | null;
}

/**
 * 未入荷判定ヘルパー
 */
function isPendingReceipt(receivedDate: string | null | undefined): boolean {
  if (!receivedDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const received = new Date(receivedDate);
  received.setHours(0, 0, 0, 0);

  return received > today;
}

/**
 * 有効期限切れ判定ヘルパー
 */
function isExpired(expiryDate: string | null | undefined): boolean {
  if (!expiryDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  return expiry < today;
}

/**
 * 検査・保留ステータス判定ヘルパー
 */
function isQcHold(lot: LotLike): boolean {
  return (
    lot.inspection_status === "pending" || lot.status === "quarantine" || lot.status === "locked"
  );
}

/**
 * ロットの状態から複数のステータスを判定して返す
 */
export function getLotStatuses(lot: LotLike | null | undefined): LotStatus[] {
  if (!lot) return ["available"];

  const statuses: LotStatus[] = [];

  // 基本ステータス判定
  if (lot.status === "archived") statuses.push("archived");

  // 検査・保留
  if (lot.inspection_status === "failed") {
    statuses.push("rejected");
  } else if (isQcHold(lot)) {
    statuses.push("qc_hold");
  }

  // 未入荷判定
  if (isPendingReceipt(lot.received_date)) {
    statuses.push("pending_receipt");
  }

  // 有効期限
  if (isExpired(lot.expiry_date)) {
    statuses.push("expired");
  }

  // 在庫数
  if (Number(lot.current_quantity ?? 0) <= 0) {
    statuses.push("empty");
  }

  // フォールバック
  if (statuses.length === 0) return ["available"];

  // 優先度順でソート（重複除去含む）
  return Array.from(new Set(statuses)).sort(
    (a, b) => LOT_STATUS_PRIORITY.indexOf(a) - LOT_STATUS_PRIORITY.indexOf(b),
  );
}
