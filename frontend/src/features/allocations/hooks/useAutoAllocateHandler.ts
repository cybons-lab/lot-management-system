/**
 * Hook to handle auto allocation (FEFO)
 */

import { useCallback } from "react";

import { setLineStatusToDraft } from "../helpers/allocationStatusHelpers";
import type { AllocationsByLine, CandidateLotFetcher, LineStatusMap } from "../types";
import {
  calculateAutoAllocation,
  getAllocatedQuantity,
  getOrderQuantity,
} from "../utils/allocationCalculations";

import type { OrderLine } from "@/shared/types/aliases";

/**
 * Hook to handle auto allocation (FEFO)
 * @param params - Handler parameters
 * @returns Auto allocate handler function
 */
export function useAutoAllocateHandler({
  allLines,
  candidateFetcher,
  setAllocationsByLine,
  setLineStatuses,
}: {
  allLines: OrderLine[];
  candidateFetcher: CandidateLotFetcher;
  setAllocationsByLine: React.Dispatch<React.SetStateAction<AllocationsByLine>>;
  setLineStatuses: React.Dispatch<React.SetStateAction<LineStatusMap>>;
}) {
  return useCallback(
    (lineId: number) => {
      const line = allLines.find((l) => l.id === lineId);
      const candidates = candidateFetcher(lineId);

      // Early return if line or candidates not found
      if (!line || !candidates.length) return;

      // Calculate auto allocation using FEFO strategy
      const newLineAllocations = calculateAutoAllocation({
        requiredQty: getOrderQuantity(line),
        dbAllocatedQty: getAllocatedQuantity(line),
        candidateLots: candidates,
      });

      // Update allocations state
      setAllocationsByLine((prev) => ({
        ...prev,
        [lineId]: newLineAllocations,
      }));

      // Mark line as draft
      setLineStatusToDraft(lineId, setLineStatuses);
    },
    [allLines, candidateFetcher, setAllocationsByLine, setLineStatuses],
  );
}
