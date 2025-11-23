import type { CandidateLotItem } from "../api";

import type { OrderLine, OrderWithLinesResponse } from "@/shared/types/aliases";

/**
 * レガシーフィールド対応ユーティリティ
 * 2026-02-15までの移行期限を考慮
 */

/**
 * 受注明細から顧客名を取得
 * 優先順位: propCustomerName > order.customer_name > orderLine.customer_name
 */
export function getCustomerName(
  order: OrderWithLinesResponse | undefined,
  orderLine: OrderLine | null,
  propCustomerName?: string,
): string {
  if (propCustomerName) return propCustomerName;
  if (order?.customer_name) return order.customer_name;
  if (orderLine?.customer_name) return orderLine.customer_name;
  return "顧客未設定";
}

/**
 * 受注明細から納入先名を取得
 * 優先順位: orderLine.delivery_place_name > candidateLots[0].delivery_place_name
 */
export function getDeliveryPlaceName(
  orderLine: OrderLine | null,
  candidateLots: CandidateLotItem[],
): string {
  if (orderLine?.delivery_place_name) return orderLine.delivery_place_name;
  if (candidateLots.length > 0 && candidateLots[0].delivery_place_name) {
    return candidateLots[0].delivery_place_name;
  }
  return "納入先未設定";
}

/**
 * 受注明細から品名を取得
 * 優先順位: propProductName > orderLine.product_name
 */
export function getProductName(orderLine: OrderLine | null, propProductName?: string): string {
  if (propProductName) return propProductName;
  if (orderLine?.product_name) return orderLine.product_name;
  return "品名不明";
}
