/**
 * Lot allocation action hooks
 * Main orchestration hook that combines all allocation-related functionality
 */

import type { QueryClient } from "@tanstack/react-query";

import type { AllocationsByLine, AllocationToastState, LineStatusMap } from "../types";

import { useAllocationSaver } from "./useAllocationSaver";
import { useAutoAllocateHandler } from "./useAutoAllocateHandler";
import { useCandidateLotFetcher } from "./useCandidateLotFetcher";
import { useChangeAllocationHandler } from "./useChangeAllocationHandler";
import { useClearAllocationsHandler } from "./useClearAllocationsHandler";
import { useGetAllocationsForLine } from "./useGetAllocationsForLine";
import { useIsOverAllocated } from "./useIsOverAllocated";

import type { OrderLine } from "@/shared/types/aliases";

/**
 * Options for useLotAllocationActions hook
 */
interface UseLotAllocationActionsOptions {
  queryClient: QueryClient;
  allLines: OrderLine[];
  allocationsByLine: AllocationsByLine;
  setAllocationsByLine: React.Dispatch<React.SetStateAction<AllocationsByLine>>;
  setLineStatuses: React.Dispatch<React.SetStateAction<LineStatusMap>>;
  setToast: React.Dispatch<React.SetStateAction<AllocationToastState>>;
}

/**
 * Main hook for lot allocation actions
 * Provides all actions needed for managing lot allocations
 *
 * @param options - Hook options
 * @returns Allocation action functions and state
 */
export function useLotAllocationActions(options: UseLotAllocationActionsOptions) {
  const candidateFetcher = useCandidateLotFetcher(options.queryClient);

  const getAllocationsForLine = useGetAllocationsForLine(options.allocationsByLine);

  const changeAllocation = useChangeAllocationHandler({
    allLines: options.allLines,
    candidateFetcher,
    setAllocationsByLine: options.setAllocationsByLine,
    setLineStatuses: options.setLineStatuses,
  });

  const autoAllocate = useAutoAllocateHandler({
    allLines: options.allLines,
    candidateFetcher,
    setAllocationsByLine: options.setAllocationsByLine,
    setLineStatuses: options.setLineStatuses,
  });

  const clearAllocations = useClearAllocationsHandler({
    setAllocationsByLine: options.setAllocationsByLine,
    setLineStatuses: options.setLineStatuses,
  });

  const isOverAllocated = useIsOverAllocated({
    allLines: options.allLines,
    allocationsByLine: options.allocationsByLine,
  });

  const { saveAllocations, saveAllocationsMutation } = useAllocationSaver({
    ...options,
    isOverAllocated,
  });

  return {
    /**
     * Get candidate lots for a line from cache
     */
    getCandidateLots: candidateFetcher,

    /**
     * Get allocations for a specific line
     */
    getAllocationsForLine,

    /**
     * Change allocation quantity for a lot
     */
    changeAllocation,

    /**
     * Auto-allocate using FEFO strategy
     */
    autoAllocate,

    /**
     * Clear all allocations for a line
     */
    clearAllocations,

    /**
     * Save allocations to backend
     */
    saveAllocations,

    /**
     * Check if a line is over-allocated
     */
    isOverAllocated,

    /**
     * Mutation object for save allocations (for accessing loading state, etc.)
     */
    saveAllocationsMutation,
  };
}
