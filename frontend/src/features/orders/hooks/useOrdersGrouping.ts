/**
 * 受注明細のグループ化を管理するカスタムフック
 *
 * 【設計意図】グループ化フックの設計判断:
 *
 * 1. useMemo による最適化
 *    理由: グループ化処理は計算コストが高い（O(n)の reduce 操作）
 *    → lines または mode が変わらない限り、再計算しない
 *    メリット:
 *    - 大量の明細（100件以上）でもスムーズな操作
 *    - 親コンポーネントの再レンダリング時も、不要な再計算を避ける
 *
 * 2. 2種類のグループモード
 *    delivery: 納入先単位でグループ化
 *    - 用途: 同じ納入先への複数受注をまとめて表示
 *    - 業務上の意味: 同じ工場への配送をまとめて管理
 *
 *    order: 受注単位でグループ化
 *    - 用途: 受注番号ごとに明細を整理
 *    - 業務上の意味: 得意先ごとの受注内容を確認
 *
 * 3. 条件分岐による切り替え
 *    理由: ユーザーがUIで表示モードを切り替え可能
 *    → mode パラメータで動的に切り替え
 *    例: 「納入先別」「受注別」タブ切り替え
 */

import { useMemo } from "react";

import type { OrderLineRow } from "@/features/orders/hooks/useOrderLines";
import {
  groupByDelivery,
  groupByOrder,
  type GroupedOrderLine,
} from "@/features/orders/utils/groupOrders";

type GroupMode = "delivery" | "order";

export function useOrdersGrouping(lines: OrderLineRow[], mode: GroupMode): GroupedOrderLine[] {
  return useMemo(() => {
    if (mode === "delivery") {
      return groupByDelivery(lines);
    } else {
      return groupByOrder(lines);
    }
  }, [lines, mode]);
}
