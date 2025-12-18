import type { CandidateLotItem } from "@/features/allocations/api";

export interface Allocation {
  id?: number;
  lot_id: number;
  allocated_quantity?: number | string;
  quantity?: number;
  allocation_type?: string;
}

/**
 * Calculate the total quantity of allocations that are persisted in the DB with a specific type.
 */
export function calculateDbAllocationsTotal(
  allocations: Allocation[] | undefined | null,
  type: "hard" | "soft",
): number {
  if (!Array.isArray(allocations)) return 0;
  return allocations
    .filter((a) => a.allocation_type === type)
    .reduce((sum, a) => sum + Number(a.allocated_quantity || a.quantity || 0), 0);
}

/**
 * Calculate total quantity from a map of lot allocations (local state).
 */
export function calculateTotalAllocated(lotAllocations: Record<number, number>): number {
  return Object.values(lotAllocations).reduce((sum, qty) => sum + qty, 0);
}

/**
 * Determine if there are unsaved changes by comparing local state with DB state.
 */
export function checkUnsavedChanges(
  lotAllocations: Record<number, number>,
  dbAllocations: Allocation[] | undefined | null,
): boolean {
  // Calculate totals
  const localTotal = calculateTotalAllocated(lotAllocations);

  // Calculate DB total
  const safeDbAllocations = Array.isArray(dbAllocations) ? dbAllocations : [];
  const dbTotal = safeDbAllocations.reduce(
    (sum, a) => sum + Number(a.allocated_quantity || a.quantity || 0),
    0,
  );

  // Quick check: totals differ
  if (localTotal !== dbTotal) return true;
  // If both are 0, no changes
  if (localTotal === 0 && dbTotal === 0) return false;

  // Detailed check: compare per lot
  const dbAllocMap = new Map<number, number>();
  safeDbAllocations.forEach((a) => {
    if (a.lot_id) {
      dbAllocMap.set(a.lot_id, Number(a.allocated_quantity || a.quantity || 0));
    }
  });

  // Check if any local allocation differs from DB
  for (const [lotIdStr, qty] of Object.entries(lotAllocations)) {
    const lotId = Number(lotIdStr);
    const dbQty = dbAllocMap.get(lotId) || 0;
    if (qty !== dbQty) return true;
  }

  // Check if any DB allocation is missing from local (implied by total check, but good for completeness if logic changes)
  // Since totals match and all local match DB, it implies DB matches local, but strictly:
  for (const [lotId, dbQty] of dbAllocMap.entries()) {
    const localQty = lotAllocations[lotId] || 0;
    if (localQty !== dbQty) return true;
  }

  return false;
}

/**
 * Calculate auto-allocation distribution.
 * Returns a new map of allocations.
 */
export function calculateAutoAllocation(
  targetQuantity: number,
  candidateLots: CandidateLotItem[],
): Record<number, number> {
  let remaining = targetQuantity;
  const newAllocations: Record<number, number> = {};

  for (const lot of candidateLots) {
    if (remaining <= 0) break;

    const available = Number(lot.available_quantity || 0);
    const allocQty = Math.min(remaining, available);
    if (allocQty > 0) {
      newAllocations[lot.lot_id] = allocQty;
      remaining -= allocQty;
    }
  }

  return newAllocations;
}
