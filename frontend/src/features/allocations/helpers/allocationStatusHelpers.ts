/**
 * Allocation status helper functions
 * Utilities for managing line status and allocation state
 */

import { ALLOCATION_CONSTANTS } from "../constants";
import type { AllocationsByLine, LineStatusMap } from "../types";

/**
 * Helper function to update line status to draft
 */
export function setLineStatusToDraft(
    lineId: number,
    setter: React.Dispatch<React.SetStateAction<LineStatusMap>>,
) {
    setter((prev) => ({ ...prev, [lineId]: ALLOCATION_CONSTANTS.LINE_STATUS.DRAFT }));
}

/**
 * Helper function to update line status to committed
 */
export function setLineStatusToCommitted(
    lineId: number,
    setter: React.Dispatch<React.SetStateAction<LineStatusMap>>,
) {
    setter((prev) => ({ ...prev, [lineId]: ALLOCATION_CONSTANTS.LINE_STATUS.COMMITTED }));
}

/**
 * Helper function to remove line allocations
 */
export function removeLineAllocations(
    lineId: number,
    setter: React.Dispatch<React.SetStateAction<AllocationsByLine>>,
) {
    setter((prev) => {
        const next = { ...prev };
        delete next[lineId];
        return next;
    });
}
