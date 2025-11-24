/**
 * Adjustments Hooks (v2.2 - Phase D-3)
 * TanStack Query hooks for inventory adjustments
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { AdjustmentsListParams, CreateAdjustmentRequest } from "../api";
import { getAdjustments, getAdjustment, createAdjustment } from "../api";

// ===== Query Keys =====

export const adjustmentKeys = {
  all: ["adjustments"] as const,
  lists: () => [...adjustmentKeys.all, "list"] as const,
  list: (params?: AdjustmentsListParams) => [...adjustmentKeys.lists(), params] as const,
  details: () => [...adjustmentKeys.all, "detail"] as const,
  detail: (id: number) => [...adjustmentKeys.details(), id] as const,
};

// ===== Query Hooks =====

/**
 * Get adjustments list
 */
export const useAdjustments = (params?: AdjustmentsListParams) => {
  return useQuery({
    queryKey: adjustmentKeys.list(params),
    queryFn: () => getAdjustments(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get adjustment detail
 */
export const useAdjustment = (id: number) => {
  return useQuery({
    queryKey: adjustmentKeys.detail(id),
    queryFn: () => getAdjustment(id),
    enabled: id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// ===== Mutation Hooks =====

/**
 * Create adjustment
 */
export const useCreateAdjustment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdjustmentRequest) => createAdjustment(data),
    onSuccess: () => {
      // Invalidate adjustments list to refetch
      queryClient.invalidateQueries({ queryKey: adjustmentKeys.lists() });
      // Also invalidate lots and inventory items as they might be affected
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
    },
  });
};
