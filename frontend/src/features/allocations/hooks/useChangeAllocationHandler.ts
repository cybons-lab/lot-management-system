/**
 * Hook to handle allocation quantity changes
 */

import { useCallback } from "react";

import type { OrderLine } from "@/shared/types/aliases";
import { setLineStatusToDraft } from "../helpers/allocationStatusHelpers";
import type { AllocationsByLine, CandidateLotFetcher, LineStatusMap } from "../types";
import { clampAllocationQuantity, getFreeQuantity } from "../utils/allocationCalculations";

/**
 * Hook to handle allocation quantity changes
 * @param params - Handler parameters
 * @returns Change allocation handler function
 */
export function useChangeAllocationHandler({
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
    (lineId: number, lotId: number, value: number) => {
      // Find the line to get product_id
      const line = allLines.find((l) => l.id === lineId);
      const productId = Number(line?.product_id || 0);

      // Fetch candidate lots to determine max allowed quantity
      const candidates = candidateFetcher(lineId, productId);
      const targetLot = candidates.find((lot) => lot.lot_id === lotId);

      // Determine max allowed quantity (default to Infinity if lot not found)
      const maxAllowed = targetLot ? getFreeQuantity(targetLot) : Infinity;

      // Clamp value to valid range
      const clampedValue = clampAllocationQuantity({ value, maxAllowed });

      // Update allocations state
      setAllocationsByLine((prev) => {
        const lineAllocations = prev[lineId] ?? {};

        // If clamped value is 0, remove the lot from allocations
        if (clampedValue === 0) {
          const { [lotId]: _, ...rest } = lineAllocations;
          return { ...prev, [lineId]: rest };
        }

        // Otherwise, update the allocation
        return {
          ...prev,
          [lineId]: { ...lineAllocations, [lotId]: clampedValue },
        };
      });

      // Mark line as draft (has unsaved changes)
      setLineStatusToDraft(lineId, setLineStatuses);
    },
    [candidateFetcher, setAllocationsByLine, setLineStatuses],
  );
}
