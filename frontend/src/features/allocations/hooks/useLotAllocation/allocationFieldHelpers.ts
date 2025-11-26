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
  const converted = Number(line.converted_quantity);
  if (Number.isFinite(converted)) {
    return converted;
  }

  const baseQuantity = Number(line.order_quantity ?? line.quantity ?? 0);
  const internalUnit = line.product_internal_unit ?? line.unit ?? null;
  const externalUnit = line.product_external_unit ?? null;
  const orderUnit = line.unit ?? externalUnit ?? internalUnit ?? null;
  const qtyPerInternalUnit = Number(line.product_qty_per_internal_unit ?? 0);

  if (!internalUnit || !Number.isFinite(qtyPerInternalUnit) || qtyPerInternalUnit <= 0) {
    return baseQuantity;
  }

  // Already in the internal (inventory) unit
  if (orderUnit === internalUnit) {
    return baseQuantity;
  }

  // Convert external order units to internal units when possible
  if (externalUnit && orderUnit === externalUnit) {
    return baseQuantity / qtyPerInternalUnit;
  }

  return baseQuantity;
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
  return Number(lot.available_quantity ?? 0);
}

/**
 * Get order ID from OrderLine (handles legacy field names)
 * @param line - Order line object
 * @returns Order ID or null
 */
export function getOrderId(line: OrderLine): number | null {
  return line.order_id ?? null;
}
