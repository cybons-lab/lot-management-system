/**
 * useAllocationSuggestions Hook (v2.2 - Phase E-4)
 * Hooks for manual and FEFO allocation suggestions
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createManualAllocationSuggestion,
  createFefoAllocationSuggestion,
  commitAllocation,
  cancelAllocation,
  getAllocationSuggestions,
  updateAllocationSuggestionsBatch,
  type ManualAllocationRequest,
  type FefoPreviewRequest,
  type AllocationCommitRequest,
} from "../../api";

import { getAllocationQueryKeys } from "@/services/api/query-keys";

/**
 * Get allocation suggestions list
 */
export const useAllocationSuggestions = (params?: {
  product_group_id?: number;
  forecast_period?: string;
  customer_id?: number;
}) => {
  return useQuery({
    queryKey: ["allocationSuggestions", params],
    queryFn: () => getAllocationSuggestions(params ?? {}),
    enabled: !!params?.product_group_id,
  });
};

/**
 * Batch update allocation suggestions
 */
export const useUpdateAllocationSuggestionsBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAllocationSuggestionsBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocationSuggestions"] });
      // もし引当状況サマリのクエリがあればそれも無効化
      queryClient.invalidateQueries({ queryKey: ["planning-allocation-summary"] });
    },
  });
};

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
