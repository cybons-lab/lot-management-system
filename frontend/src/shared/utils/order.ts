import type { OrderLine, OrderResponse } from "@/shared/types/aliases";

/**
 * Format a human-readable identifier for an order.
 *
 * Preference order:
 * 1. customer_order_no (line-level business key)
 * 2. legacy order_no (if provided)
 * 3. fallback to database id with a leading #
 */
export function formatOrderCode(
  order:
    | Partial<OrderResponse>
    | Partial<OrderLine>
    | { id?: number | null; order_id?: number | null; customer_order_no?: string | null; order_no?: string | null }
    | null
    | undefined,
): string {
  if (!order) return "-";

  const code =
    (order as Record<string, unknown>).customer_order_no as string | null | undefined ??
    (order as Record<string, unknown>).order_no as string | null | undefined;
  if (code && code.trim().length > 0) return code;

  const id = (order as { order_id?: number | null }).order_id ?? (order as { id?: number | null }).id;
  if (id !== undefined && id !== null) {
    return `#${id}`;
  }

  return "-";
}
