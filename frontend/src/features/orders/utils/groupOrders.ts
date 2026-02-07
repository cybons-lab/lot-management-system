/**
 * 受注明細のグループ化ユーティリティ
 *
 * 【設計意図】グループ化ロジックの設計判断:
 *
 * 1. reduce パターンの採用
 *    理由: 配列を1回ループするだけでグループ化完了（O(n)）
 *    代替案:
 *    - filter + map を使う方法 → O(n²) になり非効率
 *    - for ループ → コードが冗長で可読性が低い
 *    メリット: 関数型プログラミングの慣用的なパターン
 *
 * 2. Record<string, GroupedOrderLine> の使用
 *    理由: キーによる高速な検索（O(1)）
 *    → if (!acc[key]) で既存グループの有無を即座に判定
 *    → 配列で find() すると O(n)
 *    最終的に Object.values() で配列に変換
 *
 * 3. "unknown" キーの使用
 *    理由: delivery_place_code や orderNumber が null/undefined の場合
 *    → "unknown" グループにまとめる
 *    業務上の意味:
 *    - 納入先未指定の受注を一箇所に集約
 *    - ユーザーが「未設定」明細を一目で確認可能
 *
 * 4. groupByDelivery の業務的意義
 *    用途: 配送ルート最適化
 *    例:
 *    - 同じ納入先（工場A）への3件の受注
 *    → 1回の配送でまとめて納品
 *    → 配送コスト削減
 *
 * 5. groupByOrder の業務的意義
 *    用途: 得意先別の受注管理
 *    例:
 *    - 得意先Xからの受注番号 ORDER-001
 *    → この受注に含まれる全明細を一覧表示
 *    → 受注単位での進捗確認
 *
 * 6. formatOrderCode の呼び出し
 *    理由: 受注番号のフォーマット統一
 *    → 顧客コード + 受注日付 等を組み合わせた表示用コード
 *    → グループキーとして一意性を保証
 */

import type { OrderLineRow } from "@/features/orders/hooks/useOrderLines";
import { formatOrderCode } from "@/shared/utils/order";

export interface GroupedOrderLine {
  deliveryPlaceCode?: string;
  deliveryPlaceName?: string;
  orderNumber?: string;
  customerName?: string;
  orderDate?: string;
  status?: string;
  lines: OrderLineRow[];
}

/**
 * 納入先単位でグループ化
 */
export function groupByDelivery(lines: OrderLineRow[]): GroupedOrderLine[] {
  // 【設計】reduce で O(n) の効率的なグループ化
  const grouped = lines.reduce<Record<string, GroupedOrderLine>>((acc, line) => {
    const key = line.delivery_place_code || "unknown";
    if (!acc[key]) {
      acc[key] = {
        ...(line.delivery_place_code ? { deliveryPlaceCode: line.delivery_place_code } : {}),
        ...(line.delivery_place_name ? { deliveryPlaceName: line.delivery_place_name } : {}),
        lines: [],
      };
    }
    acc[key].lines.push(line);
    return acc;
  }, {});

  return Object.values(grouped);
}

/**
 * 受注単位でグループ化
 */
export function groupByOrder(lines: OrderLineRow[]): GroupedOrderLine[] {
  const grouped = lines.reduce<Record<string, GroupedOrderLine>>((acc, line) => {
    // 【設計】formatOrderCode で受注番号を統一フォーマットに変換
    const code = formatOrderCode(line);
    const key = code || "unknown";
    if (!acc[key]) {
      acc[key] = {
        ...(code ? { orderNumber: code } : {}),
        ...(line.customer_name ? { customerName: line.customer_name } : {}),
        ...(line.order_date ? { orderDate: line.order_date } : {}),
        ...(line.order_status ? { status: line.order_status } : {}),
        lines: [],
      };
    }
    acc[key].lines.push(line);
    return acc;
  }, {});

  return Object.values(grouped);
}
