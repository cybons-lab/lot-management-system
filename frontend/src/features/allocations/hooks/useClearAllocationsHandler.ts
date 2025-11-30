/**
 * Hook to handle clearing allocations for a line
 */

import { useCallback } from "react";

import { removeLineAllocations, setLineStatusToDraft } from "../helpers/allocationStatusHelpers";
import type { AllocationsByLine, LineStatusMap } from "../types";

/**
 * Hook to handle clearing allocations for a line
 * @param params - Handler parameters
 * @returns Clear allocations handler function
 */
export function useClearAllocationsHandler({
  setAllocationsByLine,
  setLineStatuses,
}: {
  setAllocationsByLine: React.Dispatch<React.SetStateAction<AllocationsByLine>>;
  setLineStatuses: React.Dispatch<React.SetStateAction<LineStatusMap>>;
}) {
  return useCallback(
    (lineId: number) => {
      removeLineAllocations(lineId, setAllocationsByLine);
      setLineStatusToDraft(lineId, setLineStatuses);
    },
    [setAllocationsByLine, setLineStatuses],
  );
}
