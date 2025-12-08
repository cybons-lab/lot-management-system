import type { OrderLine, OrderResponse } from "@/shared/types/aliases";

/**
 * Format a human-readable identifier for an order.
 *
 * Preference order:
 * 1. customer_order_no (line-level business key from customer)
 * 2. sap_order_no (line-level SAP business key)
 * 3. fallback to database id with a leading #
 */
export function formatOrderCode(
  order:
    | Partial<OrderResponse>
    | Partial<OrderLine>
    | {
        id?: number | null;
        order_id?: number | null;
        customer_order_no?: string | null;
        sap_order_no?: string | null;
      }
    | null
    | undefined,
): string {
  if (!order) return "-";

  // Priority 1: Customer order number
  const customerOrderNo = (order as { customer_order_no?: string | null }).customer_order_no;
  if (customerOrderNo && customerOrderNo.trim().length > 0) {
    return customerOrderNo;
  }

  // Priority 2: SAP order number
  const sapOrderNo = (order as { sap_order_no?: string | null }).sap_order_no;
  if (sapOrderNo && sapOrderNo.trim().length > 0) {
    return `SAP: ${sapOrderNo}`;
  }

  // Fallback: Database ID
  const id =
    (order as { order_id?: number | null }).order_id ?? (order as { id?: number | null }).id;
  if (id !== undefined && id !== null) {
    return `#${id}`;
  }

  return "-";
}
