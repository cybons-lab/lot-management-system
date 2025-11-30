/**
 * Hook to save allocations to the backend
 */

import { useMutation, type QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { saveManualAllocations, type ManualAllocationSaveResponse } from "../api";
import { ALLOCATION_CONSTANTS } from "../constants";
import { setLineStatusToCommitted } from "../helpers/allocationStatusHelpers";
import type { AllocationsByLine, AllocationToastState, LineStatusMap } from "../types";
import { convertAllocationsToPayload, getOrderId } from "../utils/allocationCalculations";

import { allocationCandidatesKeys } from "./api/useAllocationCandidates";

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
 * Hook to save allocations to the backend
 * @param options - Save options including all required dependencies
 * @returns Save handler and mutation object
 */
export function useAllocationSaver({
  queryClient,
  allLines,
  allocationsByLine,
  setLineStatuses,
  setToast,
  isOverAllocated,
}: {
  queryClient: QueryClient;
  allLines: OrderLine[];
  allocationsByLine: AllocationsByLine;
  setLineStatuses: React.Dispatch<React.SetStateAction<LineStatusMap>>;
  setToast: React.Dispatch<React.SetStateAction<AllocationToastState>>;
  isOverAllocated: (lineId: number) => boolean;
}) {
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
