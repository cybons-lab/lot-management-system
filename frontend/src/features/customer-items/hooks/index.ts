/**
 * Customer Items Hooks (v2.2 - Phase G-1)
 * TanStack Query hooks for customer item mappings
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  CustomerItemsListParams,
  CreateCustomerItemRequest,
  UpdateCustomerItemRequest,
} from "../api";
import {
  getCustomerItems,
  getCustomerItemsByCustomer,
  createCustomerItem,
  updateCustomerItem,
  deleteCustomerItem,
  permanentDeleteCustomerItem,
  restoreCustomerItem,
} from "../api";

// ===== Query Keys =====

export const customerItemKeys = {
  all: ["customerItems"] as const,
  lists: () => [...customerItemKeys.all, "list"] as const,
  list: (params?: CustomerItemsListParams) => [...customerItemKeys.lists(), params] as const,
  byCustomer: (customerId: number) => [...customerItemKeys.all, "customer", customerId] as const,
};

// ===== Query Hooks =====

/**
 * Get customer items list
 */
export const useCustomerItems = (params?: CustomerItemsListParams) => {
  return useQuery({
    queryKey: customerItemKeys.list(params),
    queryFn: () => getCustomerItems(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get customer items by customer ID
 */
export const useCustomerItemsByCustomer = (customerId: number) => {
  return useQuery({
    queryKey: customerItemKeys.byCustomer(customerId),
    queryFn: () => getCustomerItemsByCustomer(customerId),
    enabled: customerId > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// ===== Mutation Hooks =====

/**
 * Create customer item
 */
export const useCreateCustomerItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerItemRequest) => createCustomerItem(data),
    onSuccess: () => {
      // Invalidate customer items list to refetch
      queryClient.invalidateQueries({ queryKey: customerItemKeys.lists() });
    },
  });
};

/**
 * Update customer item
 */
export const useUpdateCustomerItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      customerPartNo,
      data,
    }: {
      customerId: number;
      customerPartNo: string;
      data: UpdateCustomerItemRequest;
    }) => updateCustomerItem(customerId, customerPartNo, data),
    onSuccess: () => {
      // Invalidate customer items list to refetch
      queryClient.invalidateQueries({ queryKey: customerItemKeys.lists() });
    },
  });
};

/**
 * Delete customer item (Soft Delete)
 */
export const useDeleteCustomerItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      customerPartNo,
      endDate,
    }: {
      customerId: number;
      customerPartNo: string;
      endDate?: string;
    }) => deleteCustomerItem(customerId, customerPartNo, endDate),
    onSuccess: () => {
      // Invalidate customer items list to refetch
      queryClient.invalidateQueries({ queryKey: customerItemKeys.lists() });
    },
  });
};

/**
 * Permanently delete customer item
 */
export const usePermanentDeleteCustomerItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      customerPartNo,
    }: {
      customerId: number;
      customerPartNo: string;
    }) => permanentDeleteCustomerItem(customerId, customerPartNo),
    onSuccess: () => {
      // Invalidate customer items list to refetch
      queryClient.invalidateQueries({ queryKey: customerItemKeys.lists() });
    },
  });
};

/**
 * Restore customer item
 */
export const useRestoreCustomerItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      customerPartNo,
    }: {
      customerId: number;
      customerPartNo: string;
    }) => restoreCustomerItem(customerId, customerPartNo),
    onSuccess: () => {
      // Invalidate customer items list to refetch
      queryClient.invalidateQueries({ queryKey: customerItemKeys.lists() });
    },
  });
};
