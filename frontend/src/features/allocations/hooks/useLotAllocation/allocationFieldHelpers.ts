/**
 * Field helper functions for handling legacy field names
 * These functions abstract away the complexity of supporting both new and legacy field names
 */

import type { CandidateLotItem } from "../../api";

import type { OrderLine } from "@/shared/types/aliases";

/**
 * Get order quantity from OrderLine (handles legacy field names)
 * @param line - Order line object
 * @returns Order quantity as number
 */
export function getOrderQuantity(line: OrderLine): number {
  return Number(line.order_quantity ?? line.quantity ?? 0);
}

/**
 * Get allocated quantity from OrderLine (handles legacy field names)
 * @param line - Order line object
 * @returns Allocated quantity as number
 */
export function getAllocatedQuantity(line: OrderLine): number {
  return Number(line.allocated_qty ?? line.allocated_quantity ?? 0);
}

/**
 * Get free quantity from CandidateLotItem (handles legacy field names)
 * @param lot - Candidate lot item
 * @returns Free quantity as number
 */
export function getFreeQuantity(lot: CandidateLotItem): number {
  return Number(lot.free_qty ?? lot.current_quantity ?? 0);
}

/**
 * Get order ID from OrderLine (handles legacy field names)
 * @param line - Order line object
 * @returns Order ID or null
 */
export function getOrderId(line: OrderLine): number | null {
  return line.order_id ?? null;
}
