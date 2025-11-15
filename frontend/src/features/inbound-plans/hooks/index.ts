/**
 * Inbound Plans Hooks (v2.2 - Phase C-2)
 * TanStack Query hooks for inbound plans
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  InboundPlansListParams,
  CreateInboundPlanRequest,
  UpdateInboundPlanRequest,
  CreateInboundPlanLineRequest,
  ReceiveInboundRequest,
} from "../api";
import {
  getInboundPlans,
  getInboundPlan,
  getInboundPlanLines,
  createInboundPlan,
  updateInboundPlan,
  deleteInboundPlan,
  createInboundPlanLine,
  receiveInbound,
} from "../api";

// ===== Query Keys =====

export const inboundPlanKeys = {
  all: ["inboundPlans"] as const,
  lists: () => [...inboundPlanKeys.all, "list"] as const,
  list: (params?: InboundPlansListParams) => [...inboundPlanKeys.lists(), params] as const,
  details: () => [...inboundPlanKeys.all, "detail"] as const,
  detail: (id: number) => [...inboundPlanKeys.details(), id] as const,
  lines: (planId: number) => [...inboundPlanKeys.all, "lines", planId] as const,
};

// ===== Query Hooks =====

/**
 * Get inbound plans list
 */
export const useInboundPlans = (params?: InboundPlansListParams) => {
  return useQuery({
    queryKey: inboundPlanKeys.list(params),
    queryFn: () => getInboundPlans(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get inbound plan detail (with lines)
 */
export const useInboundPlan = (id: number) => {
  return useQuery({
    queryKey: inboundPlanKeys.detail(id),
    queryFn: () => getInboundPlan(id),
    enabled: id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get inbound plan lines
 */
export const useInboundPlanLines = (planId: number) => {
  return useQuery({
    queryKey: inboundPlanKeys.lines(planId),
    queryFn: () => getInboundPlanLines(planId),
    enabled: planId > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// ===== Mutation Hooks =====

/**
 * Create inbound plan
 */
export const useCreateInboundPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInboundPlanRequest) => createInboundPlan(data),
    onSuccess: () => {
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: inboundPlanKeys.lists() });
    },
  });
};

/**
 * Update inbound plan
 */
export const useUpdateInboundPlan = (id: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateInboundPlanRequest) => updateInboundPlan(id, data),
    onSuccess: () => {
      // Invalidate both the specific plan and the lists
      queryClient.invalidateQueries({ queryKey: inboundPlanKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inboundPlanKeys.lists() });
    },
  });
};

/**
 * Delete inbound plan
 */
export const useDeleteInboundPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteInboundPlan(id),
    onSuccess: () => {
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: inboundPlanKeys.lists() });
    },
  });
};

/**
 * Create inbound plan line
 */
export const useCreateInboundPlanLine = (planId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInboundPlanLineRequest) => createInboundPlanLine(planId, data),
    onSuccess: () => {
      // Invalidate both the plan detail (includes lines) and the lines list
      queryClient.invalidateQueries({ queryKey: inboundPlanKeys.detail(planId) });
      queryClient.invalidateQueries({ queryKey: inboundPlanKeys.lines(planId) });
    },
  });
};

/**
 * Record inbound receipt (auto-generate lots)
 * @important This mutation automatically generates lots
 */
export const useReceiveInbound = (planId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReceiveInboundRequest) => receiveInbound(planId, data),
    onSuccess: () => {
      // Invalidate plan detail to reflect new status
      queryClient.invalidateQueries({ queryKey: inboundPlanKeys.detail(planId) });
      queryClient.invalidateQueries({ queryKey: inboundPlanKeys.lists() });
      // Also invalidate lots queries since new lots were generated
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
};
