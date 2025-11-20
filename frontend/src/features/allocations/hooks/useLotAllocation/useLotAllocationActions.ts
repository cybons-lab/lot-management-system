/**
 * Lot allocation action hooks
 * Provides actions for managing lot allocations including auto-allocation, manual changes, and saving
 */

import { useMutation, type QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { saveManualAllocations, type ManualAllocationSaveResponse } from "../../api";
import { allocationCandidatesKeys } from "../api/useAllocationCandidates";

import type {
  AllocationsByLine,
  AllocationToastState,
  LineAllocations,
  LineStatusMap,
} from "./allocationActionTypes";
import {
  calculateAutoAllocation,
  calculateTotalUiAllocated,
  checkOverAllocation,
  clampAllocationQuantity,
  convertAllocationsToPayload,
} from "./allocationCalculations";
import { ALLOCATION_CONSTANTS } from "./allocationConstants";
import {
  getAllocatedQuantity,
  getFreeQuantity,
  getOrderId,
  getOrderQuantity,
} from "./allocationFieldHelpers";
import type { CandidateLotFetcher } from "./lotAllocationTypes";

import type { OrderLine } from "@/shared/types/aliases";

/**
 * Variables for saveAllocations mutation
 */
interface SaveAllocationsVariables {
  orderLineId: number;
  orderId: number | null;
  allocations: Array<{ lot_id: number; quantity: number }>;
}

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
 * Helper function to update line status to draft
 */
function setLineStatusToDraft(
  lineId: number,
  setter: React.Dispatch<React.SetStateAction<LineStatusMap>>,
) {
  setter((prev) => ({ ...prev, [lineId]: ALLOCATION_CONSTANTS.LINE_STATUS.DRAFT }));
}

/**
 * Helper function to update line status to committed
 */
function setLineStatusToCommitted(
  lineId: number,
  setter: React.Dispatch<React.SetStateAction<LineStatusMap>>,
) {
  setter((prev) => ({ ...prev, [lineId]: ALLOCATION_CONSTANTS.LINE_STATUS.COMMITTED }));
}

/**
 * Helper function to remove line allocations
 */
function removeLineAllocations(
  lineId: number,
  setter: React.Dispatch<React.SetStateAction<AllocationsByLine>>,
) {
  setter((prev) => {
    const next = { ...prev };
    delete next[lineId];
    return next;
  });
}

/**
 * Hook to fetch candidate lots from cache
 * @param queryClient - TanStack Query client
 * @returns Function to fetch candidate lots by line ID
 */
function useCandidateLotFetcher(queryClient: QueryClient): CandidateLotFetcher {
  return useCallback<CandidateLotFetcher>(
    (lineId) => {
      const cache = queryClient.getQueryData<{ items?: unknown[] }>(
        allocationCandidatesKeys.list({
          order_line_id: lineId,
          strategy: ALLOCATION_CONSTANTS.QUERY_STRATEGY.FEFO,
          limit: ALLOCATION_CONSTANTS.CANDIDATE_LOTS_LIMIT,
        }),
      );

      // Type guard: Ensure items is an array
      if (!cache?.items || !Array.isArray(cache.items)) {
        return [];
      }

      // Return as CandidateLotItem array (assuming items conform to type)
      return cache.items as ReturnType<CandidateLotFetcher>;
    },
    [queryClient],
  );
}

/**
 * Hook to get allocations for a specific line
 * @param allocationsByLine - All allocations by line
 * @returns Function to get allocations for a line ID
 */
function useGetAllocationsForLine(allocationsByLine: AllocationsByLine) {
  return useCallback(
    (lineId: number): LineAllocations => allocationsByLine[lineId] ?? {},
    [allocationsByLine],
  );
}

/**
 * Hook to handle allocation quantity changes
 * @param params - Handler parameters
 * @returns Change allocation handler function
 */
function useChangeAllocationHandler({
  candidateFetcher,
  setAllocationsByLine,
  setLineStatuses,
}: {
  candidateFetcher: CandidateLotFetcher;
  setAllocationsByLine: React.Dispatch<React.SetStateAction<AllocationsByLine>>;
  setLineStatuses: React.Dispatch<React.SetStateAction<LineStatusMap>>;
}) {
  return useCallback(
    (lineId: number, lotId: number, value: number) => {
      // Fetch candidate lots to determine max allowed quantity
      const candidates = candidateFetcher(lineId);
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

/**
 * Hook to handle auto allocation (FEFO)
 * @param params - Handler parameters
 * @returns Auto allocate handler function
 */
function useAutoAllocateHandler({
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

/**
 * Hook to handle clearing allocations for a line
 * @param params - Handler parameters
 * @returns Clear allocations handler function
 */
function useClearAllocationsHandler({
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

/**
 * Hook to check if a line is over-allocated
 * @param params - Check parameters
 * @returns Function to check over-allocation status
 */
function useIsOverAllocated({
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

/**
 * Hook to save allocations to the backend
 * @param options - Save options including all required dependencies
 * @returns Save handler and mutation object
 */
function useAllocationSaver({
  queryClient,
  allLines,
  allocationsByLine,
  setAllocationsByLine,
  setLineStatuses,
  setToast,
  isOverAllocated,
}: UseLotAllocationActionsOptions & { isOverAllocated: (lineId: number) => boolean }) {
  // Mutation for saving allocations
  const saveAllocationsMutation = useMutation<
    ManualAllocationSaveResponse,
    unknown,
    SaveAllocationsVariables
  >({
    mutationFn: ({ orderLineId, allocations }) =>
      saveManualAllocations({ order_line_id: orderLineId, allocations }),
    onSuccess: (response, variables) => {
      // Show success toast
      setToast({
        message: response?.message ?? ALLOCATION_CONSTANTS.MESSAGES.SAVE_SUCCESS,
        variant: "success",
      });

      // Mark line as committed
      setLineStatusToCommitted(variables.orderLineId, setLineStatuses);

      // Remove line from pending allocations
      removeLineAllocations(variables.orderLineId, setAllocationsByLine);

      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["orders", "for-allocation"] });
      queryClient.invalidateQueries({
        queryKey: allocationCandidatesKeys.list({ order_line_id: variables.orderLineId }),
      });
    },
    onError: (error: unknown) => {
      // Show error toast
      setToast({
        message: error instanceof Error ? error.message : ALLOCATION_CONSTANTS.MESSAGES.SAVE_ERROR,
        variant: "error",
      });
    },
  });

  // Save allocations handler
  const saveAllocations = useCallback(
    (lineId: number) => {
      const allocationsMap = allocationsByLine[lineId] ?? {};
      const line = allLines.find((l) => l.id === lineId);

      // Early return if line not found
      if (!line) return;

      // Check for over-allocation
      if (isOverAllocated(lineId)) {
        setToast({
          message: ALLOCATION_CONSTANTS.MESSAGES.OVER_ALLOCATED,
          variant: "error",
        });
        return;
      }

      // Convert allocations to API payload format
      const allocations = convertAllocationsToPayload(allocationsMap);

      // Execute mutation
      saveAllocationsMutation.mutate({
        orderLineId: lineId,
        orderId: getOrderId(line),
        allocations,
      });
    },
    [allocationsByLine, allLines, isOverAllocated, saveAllocationsMutation, setToast],
  );

  return { saveAllocations, saveAllocationsMutation };
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
