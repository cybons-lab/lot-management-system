/**
 * Business Rules Hooks (v2.2 - Phase H-2)
 * TanStack Query hooks for business rules
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  BusinessRulesListParams,
  CreateBusinessRuleRequest,
  UpdateBusinessRuleRequest,
} from "../api";
import {
  getBusinessRules,
  getBusinessRule,
  getBusinessRuleByCode,
  createBusinessRule,
  updateBusinessRule,
  updateBusinessRuleByCode,
  deleteBusinessRule,
  toggleBusinessRuleActive,
} from "../api";

// ===== Query Keys =====

export const businessRuleKeys = {
  all: ["businessRules"] as const,
  lists: () => [...businessRuleKeys.all, "list"] as const,
  list: (params?: BusinessRulesListParams) => [...businessRuleKeys.lists(), params] as const,
  details: () => [...businessRuleKeys.all, "detail"] as const,
  detail: (id: number) => [...businessRuleKeys.details(), id] as const,
  detailByCode: (code: string) => [...businessRuleKeys.details(), "code", code] as const,
};

// ===== Query Hooks =====

/**
 * Get business rules list
 */
export const useBusinessRules = (params?: BusinessRulesListParams) => {
  return useQuery({
    queryKey: businessRuleKeys.list(params),
    queryFn: () => getBusinessRules(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get business rule detail by ID
 */
export const useBusinessRule = (ruleId: number) => {
  return useQuery({
    queryKey: businessRuleKeys.detail(ruleId),
    queryFn: () => getBusinessRule(ruleId),
    enabled: ruleId > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get business rule detail by code
 */
export const useBusinessRuleByCode = (ruleCode: string) => {
  return useQuery({
    queryKey: businessRuleKeys.detailByCode(ruleCode),
    queryFn: () => getBusinessRuleByCode(ruleCode),
    enabled: ruleCode.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// ===== Mutation Hooks =====

/**
 * Create business rule
 */
export const useCreateBusinessRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBusinessRuleRequest) => createBusinessRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessRuleKeys.lists() });
    },
  });
};

/**
 * Update business rule by ID
 */
export const useUpdateBusinessRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, data }: { ruleId: number; data: UpdateBusinessRuleRequest }) =>
      updateBusinessRule(ruleId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: businessRuleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: businessRuleKeys.detail(variables.ruleId) });
    },
  });
};

/**
 * Update business rule by code
 */
export const useUpdateBusinessRuleByCode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleCode, data }: { ruleCode: string; data: UpdateBusinessRuleRequest }) =>
      updateBusinessRuleByCode(ruleCode, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: businessRuleKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: businessRuleKeys.detailByCode(variables.ruleCode),
      });
    },
  });
};

/**
 * Delete business rule
 */
export const useDeleteBusinessRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: number) => deleteBusinessRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessRuleKeys.lists() });
    },
  });
};

/**
 * Toggle business rule active status
 */
export const useToggleBusinessRuleActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: number) => toggleBusinessRuleActive(ruleId),
    onSuccess: (_, ruleId) => {
      queryClient.invalidateQueries({ queryKey: businessRuleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: businessRuleKeys.detail(ruleId) });
    },
  });
};
