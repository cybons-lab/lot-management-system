/**
 * useAllocationSuggestions Hook (v2.2 - Phase E-4)
 * Hooks for manual and FEFO allocation suggestions
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getAllocationQueryKeys } from "@/shared/constants/query-keys";

import {
  createManualAllocationSuggestion,
  createFefoAllocationSuggestion,
  commitAllocation,
  cancelAllocation,
  type ManualAllocationRequest,
  type FefoPreviewRequest,
  type AllocationCommitRequest,
} from "../../api";

/**
 * Create manual allocation suggestion (preview only)
 */
export const useCreateManualAllocationSuggestion = () => {
  return useMutation({
    mutationFn: (data: ManualAllocationRequest) => createManualAllocationSuggestion(data),
  });
};

/**
 * Create FEFO allocation suggestion (preview only)
 */
export const useCreateFefoAllocationSuggestion = () => {
  return useMutation({
    mutationFn: (data: FefoPreviewRequest) => createFefoAllocationSuggestion(data),
  });
};

/**
 * Commit allocation (finalize)
 */
export const useCommitAllocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AllocationCommitRequest) => commitAllocation(data),
    onSuccess: () => {
      // Invalidate all allocation-related queries (inventory, orders, dashboard, etc.)
      const allocationKeys = getAllocationQueryKeys();
      allocationKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
};

/**
 * Cancel allocation
 */
export const useCancelAllocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (allocationId: number) => cancelAllocation(allocationId),
    onSuccess: () => {
      // Invalidate all allocation-related queries (inventory, orders, dashboard, etc.)
      const allocationKeys = getAllocationQueryKeys();
      allocationKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
};
