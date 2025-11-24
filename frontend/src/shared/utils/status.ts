/**
 * ステータス判定ユーティリティ
 * src/shared/utils/status.ts
 */

export type LotStatus = 'locked' | 'depleted' | 'available';

/**
 * ステータス表示の優先順位
 * 配列の先頭ほど優先度が高い
 */
const LOT_STATUS_PRIORITY: LotStatus[] = ['locked', 'depleted', 'available'];

/**
 * Lot オブジェクトから判定に必要な最小限のフィールド
 */
type LotLike = {
    status?: string;
    current_quantity?: number | string | null;
};

/**
 * ロットの状態から複数のステータスを判定して返す
 * 
 * @param lot - ロットオブジェクト（status と current_quantity を持つ）
 * @returns 優先度順にソートされたステータス配列
 * 
 * @example
 * getLotStatuses({ status: 'locked', current_quantity: 10 })
 * // => ['locked']
 * 
 * getLotStatuses({ status: 'active', current_quantity: 0 })
 * // => ['depleted']
 * 
 * getLotStatuses({ status: 'active', current_quantity: 50 })
 * // => ['available']
 */
export function getLotStatuses(lot: LotLike | null | undefined): LotStatus[] {
    if (!lot) return ['available']; // デフォルト

    const statuses: LotStatus[] = [];

    // ロック状態の判定
    if (lot.status === 'locked') {
        statuses.push('locked');
    }

    // 在庫数の判定
    const qty = Number(lot.current_quantity ?? 0);
    if (qty <= 0) {
        statuses.push('depleted');
    }
    if (qty > 0) {
        statuses.push('available');
    }

    // 重複除去
    const unique = Array.from(new Set(statuses));

    // 優先度順でソート
    unique.sort(
        (a, b) => LOT_STATUS_PRIORITY.indexOf(a) - LOT_STATUS_PRIORITY.indexOf(b),
    );

    // 何も判定されなかった場合のフォールバック
    return unique.length > 0 ? unique : ['available'];
}
