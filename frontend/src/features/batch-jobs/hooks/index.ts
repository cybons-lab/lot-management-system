/**
 * Batch Jobs Hooks (v2.2 - Phase H-3)
 * TanStack Query hooks for batch jobs
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { BatchJobsListParams, CreateBatchJobRequest, BatchJobExecuteRequest } from "../api";
import {
  getBatchJobs,
  getBatchJob,
  createBatchJob,
  executeBatchJob,
  cancelBatchJob,
  deleteBatchJob,
  getInventorySyncAlerts,
  executeInventorySync,
} from "../api";

// ===== Query Keys =====

export const batchJobKeys = {
  all: ["batchJobs"] as const,
  lists: () => [...batchJobKeys.all, "list"] as const,
  list: (params?: BatchJobsListParams) => [...batchJobKeys.lists(), params] as const,
  details: () => [...batchJobKeys.all, "detail"] as const,
  detail: (id: number) => [...batchJobKeys.details(), id] as const,
};

// ===== Query Hooks =====

/**
 * Get batch jobs list
 */
export const useBatchJobs = (params?: BatchJobsListParams) => {
  return useQuery({
    queryKey: batchJobKeys.list(params),
    queryFn: () => getBatchJobs(params),
    staleTime: 1000 * 30, // 30 seconds (jobs status changes frequently)
  });
};

/**
 * Get batch job detail
 */
export const useBatchJob = (jobId: number) => {
  return useQuery({
    queryKey: batchJobKeys.detail(jobId),
    queryFn: () => getBatchJob(jobId),
    enabled: jobId > 0,
    staleTime: 1000 * 30, // 30 seconds
  });
};

// ===== Mutation Hooks =====

/**
 * Create batch job
 */
export const useCreateBatchJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBatchJobRequest) => createBatchJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchJobKeys.lists() });
    },
  });
};

/**
 * Execute batch job
 */
export const useExecuteBatchJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: number; data?: BatchJobExecuteRequest }) =>
      executeBatchJob(jobId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: batchJobKeys.lists() });
      queryClient.invalidateQueries({ queryKey: batchJobKeys.detail(variables.jobId) });
    },
  });
};

/**
 * Cancel batch job
 */
export const useCancelBatchJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: number) => cancelBatchJob(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: batchJobKeys.lists() });
      queryClient.invalidateQueries({ queryKey: batchJobKeys.detail(jobId) });
    },
  });
};

/**
 * Delete batch job
 */
export const useDeleteBatchJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: number) => deleteBatchJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchJobKeys.lists() });
    },
  });
};

// ===== SAP Inventory Sync Hooks =====

export const inventorySyncKeys = {
  all: ["inventorySync"] as const,
  alerts: (activeOnly?: boolean) => [...inventorySyncKeys.all, "alerts", activeOnly] as const,
};

/**
 * Get inventory sync alerts
 */
export const useInventorySyncAlerts = (activeOnly: boolean = true) => {
  return useQuery({
    queryKey: inventorySyncKeys.alerts(activeOnly),
    queryFn: () => getInventorySyncAlerts(activeOnly),
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Execute inventory sync
 */
export const useExecuteInventorySync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => executeInventorySync(),
    onSuccess: () => {
      // Invalidate alerts to refresh after sync
      queryClient.invalidateQueries({ queryKey: inventorySyncKeys.all });
    },
  });
};
