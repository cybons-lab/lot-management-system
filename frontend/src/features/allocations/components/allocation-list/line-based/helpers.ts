import type { OrderWithLinesResponse, OrderLine } from "@/shared/types/aliases";

export function getCustomerName(
  order: OrderWithLinesResponse,
  customerMap: Record<number, string>,
): string {
  if (order.customer_id) {
    return customerMap[order.customer_id] || order.customer_name || "顧客未設定";
  }
  return order.customer_name || "顧客未設定";
}

export function getProductName(line: OrderLine, productMap: Record<number, string>): string {
  if (line.product_name) return line.product_name;
  if (line.product_group_id && productMap[line.product_group_id])
    return productMap[line.product_group_id];
  return "商品名不明";
}

export function getDeliveryPlaceName(
  order: OrderWithLinesResponse,
  line: OrderLine,
): string | undefined {
  // 明細の納入先 > オーダーの納入先 > 未設定
  if (line.delivery_place_name) return line.delivery_place_name;
  if (order.delivery_place_name) return order.delivery_place_name;
  return undefined;
}
