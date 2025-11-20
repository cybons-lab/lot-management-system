/**
 * Pure business logic functions for lot allocation calculations
 * These functions have no side effects and are easily testable
 */

import type { CandidateLotItem } from "../../api";

import type { LineAllocations } from "./allocationActionTypes";
import { getFreeQuantity } from "./allocationFieldHelpers";

/**
 * Calculate FEFO (First Expiry First Out) auto allocation
 * @param params - Calculation parameters
 * @param params.requiredQty - Total quantity required for the order line
 * @param params.dbAllocatedQty - Quantity already allocated in the database
 * @param params.candidateLots - List of candidate lots (should be pre-sorted by expiry date)
 * @returns Allocation map (lotId -> quantity)
 * @pure No side effects
 */
export function calculateAutoAllocation(params: {
  requiredQty: number;
  dbAllocatedQty: number;
  candidateLots: CandidateLotItem[];
}): LineAllocations {
  const { requiredQty, dbAllocatedQty, candidateLots } = params;

  // Calculate remaining quantity to allocate
  let remaining = requiredQty - dbAllocatedQty;

  const newLineAllocations: LineAllocations = {};

  // Iterate through candidate lots (assumed to be sorted by FEFO)
  for (const lot of candidateLots) {
    if (remaining <= 0) break;

    const lotId = lot.lot_id;
    const freeQty = getFreeQuantity(lot);

    // Allocate as much as possible from this lot
    const allocateQty = Math.min(remaining, freeQty);

    if (allocateQty > 0) {
      newLineAllocations[lotId] = allocateQty;
      remaining -= allocateQty;
    }
  }

  return newLineAllocations;
}

/**
 * Clamp allocation quantity within valid range
 * @param params - Clamping parameters
 * @param params.value - Input value to clamp
 * @param params.maxAllowed - Maximum allowed value
 * @returns Clamped value (0 <= result <= maxAllowed)
 * @pure No side effects
 */
export function clampAllocationQuantity(params: { value: number; maxAllowed: number }): number {
  const { value, maxAllowed } = params;

  // Ensure value is finite
  const safeValue = Number.isFinite(value) ? value : 0;

  // Clamp between 0 and maxAllowed
  return Math.max(0, Math.min(maxAllowed, safeValue));
}

/**
 * Check if total allocated quantity exceeds required quantity
 * @param params - Check parameters
 * @param params.requiredQty - Total quantity required
 * @param params.dbAllocated - Quantity already allocated in database
 * @param params.uiAllocated - Quantity allocated in UI (pending save)
 * @returns True if over-allocated, false otherwise
 * @pure No side effects
 */
export function checkOverAllocation(params: {
  requiredQty: number;
  dbAllocated: number;
  uiAllocated: number;
}): boolean {
  const { requiredQty, dbAllocated, uiAllocated } = params;
  return dbAllocated + uiAllocated > requiredQty;
}

/**
 * Calculate total UI allocated quantity for a line
 * @param allocations - Allocation map (lotId -> quantity)
 * @returns Total allocated quantity
 * @pure No side effects
 */
export function calculateTotalUiAllocated(allocations: LineAllocations): number {
  return Object.values(allocations).reduce((sum, quantity) => sum + quantity, 0);
}

/**
 * Remove zero-quantity allocations from allocation map
 * @param allocations - Allocation map (lotId -> quantity)
 * @returns Cleaned allocation map with zero quantities removed
 * @pure No side effects
 */
export function removeZeroAllocations(allocations: LineAllocations): LineAllocations {
  const cleaned: LineAllocations = {};

  for (const [lotIdStr, quantity] of Object.entries(allocations)) {
    if (quantity > 0) {
      cleaned[Number(lotIdStr)] = quantity;
    }
  }

  return cleaned;
}

/**
 * Convert allocation map to API payload format
 * @param allocations - Allocation map (lotId -> quantity)
 * @returns Array of allocation objects suitable for API
 * @pure No side effects
 */
export function convertAllocationsToPayload(
  allocations: LineAllocations,
): Array<{ lot_id: number; quantity: number }> {
  return Object.entries(allocations)
    .map(([lotIdStr, qty]) => ({
      lot_id: Number(lotIdStr),
      quantity: Number(qty),
    }))
    .filter((item) => item.quantity > 0);
}
