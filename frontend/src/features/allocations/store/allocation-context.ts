/**
 * Allocation Context - Jotai atoms for allocation state management
 *
 * This module eliminates prop drilling by providing shared atoms
 * that child components can access directly via useAtom hooks.
 */

import { atom } from "jotai";

import type { CandidateLotItem } from "../api";
import type { AllocationsByLine, LineStatus } from "../types";

// ========== State Atoms ==========

/**
 * Line statuses map (lineId -> status)
 */
export const lineStatusesAtom = atom<Record<number, LineStatus>>({});

/**
 * Active line ID for editing
 */
export const activeLineIdAtom = atom<number | null>(null);

// ========== Context Data Atoms ==========

/**
 * Shared context data (productMap, customerMap)
 */
export const allocationContextDataAtom = atom<{
  productMap: Record<number, string>;
  customerMap: Record<number, string>;
}>({
  productMap: {},
  customerMap: {},
});

// ========== Handler Types ==========

export interface AllocationHandlers {
  /** Get allocations for a specific line */
  getLineAllocations: (lineId: number) => Record<number, number>;
  /** Get candidate lots for a specific line */
  getCandidateLots: (lineId: number) => CandidateLotItem[];
  /** Check if a line is over-allocated */
  isOverAllocated: (lineId: number) => boolean;
  /** Change allocation quantity for a lot */
  onLotAllocationChange: (lineId: number, lotId: number, quantity: number) => void;
  /** Auto-allocate a line using FEFO */
  onAutoAllocate: (lineId: number) => void;
  /** Clear all allocations for a line */
  onClearAllocations: (lineId: number) => void;
  /** Save allocations for a line */
  onSaveAllocations: (lineId: number) => void;
}

/**
 * Handler functions atom - set by provider, consumed by children
 */
export const allocationHandlersAtom = atom<AllocationHandlers | null>(null);

// ========== Derived Atoms ==========

/**
 * Get line status with fallback
 */
export const lineStatusAtom = atom((get) => {
  const statuses = get(lineStatusesAtom);
  return (lineId: number): LineStatus => statuses[lineId] ?? "clean";
});

/**
 * Check if a line is active
 */
export const isLineActiveAtom = atom((get) => {
  const activeId = get(activeLineIdAtom);
  return (lineId: number): boolean => activeId === lineId;
});

// ========== Write Atoms ==========

/**
 * Set active line ID
 */
export const setActiveLineIdAtom = atom(null, (_get, set, lineId: number | null) => {
  set(activeLineIdAtom, lineId);
});

/**
 * Update line status
 */
export const updateLineStatusAtom = atom(
  null,
  (_get, set, update: { lineId: number; status: LineStatus }) => {
    set(lineStatusesAtom, (prev) => ({
      ...prev,
      [update.lineId]: update.status,
    }));
  },
);
