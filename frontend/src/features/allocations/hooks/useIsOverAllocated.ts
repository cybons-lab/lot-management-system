/**
 * Hook to check if a line is over-allocated
 */

import { useCallback } from "react";

import type { AllocationsByLine } from "../types";
import {
  calculateTotalUiAllocated,
  checkOverAllocation,
  getAllocatedQuantity,
  getOrderQuantity,
} from "../utils/allocationCalculations";

import type { OrderLine } from "@/shared/types/aliases";

/**
 * Hook to check if a line is over-allocated
 * @param params - Check parameters
 * @returns Function to check over-allocation status
 */
export function useIsOverAllocated({
  allLines,
  allocationsByLine,
}: {
  allLines: OrderLine[];
  allocationsByLine: AllocationsByLine;
}) {
  return useCallback(
    (lineId: number): boolean => {
      const line = allLines.find((l) => l.id === lineId);
      if (!line) return false;

      const requiredQty = getOrderQuantity(line);
      const dbAllocated = getAllocatedQuantity(line);
      const uiAllocated = calculateTotalUiAllocated(allocationsByLine[lineId] ?? {});

      return checkOverAllocation({ requiredQty, dbAllocated, uiAllocated });
    },
    [allLines, allocationsByLine],
  );
}
