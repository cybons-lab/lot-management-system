/**
 * Hook to get allocations for a specific line
 */

import { useCallback } from "react";

import type { AllocationsByLine, LineAllocations } from "../types";

/**
 * Hook to get allocations for a specific line
 * @param allocationsByLine - All allocations by line
 * @returns Function to get allocations for a line ID
 */
export function useGetAllocationsForLine(allocationsByLine: AllocationsByLine) {
    return useCallback(
        (lineId: number): LineAllocations => allocationsByLine[lineId] ?? {},
        [allocationsByLine],
    );
}
