/**
 * Customer Items Hooks (v2.2 - Phase G-1)
 * TanStack Query hooks for customer item mappings
 *
 * Updated: サロゲートキー（id）ベースに移行
 * - ID-based API operations
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
  getCustomerItemById,
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
  byId: (id: number) => [...customerItemKeys.all, "detail", id] as const,
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

/**
 * Get customer item by ID
 */
export const useCustomerItemById = (id: number) => {
  return useQuery({
    queryKey: customerItemKeys.byId(id),
    queryFn: () => getCustomerItemById(id),
    enabled: id > 0,
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
 * Update customer item by ID
 */
export const useUpdateCustomerItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCustomerItemRequest }) =>
      updateCustomerItem(id, data),
    onSuccess: () => {
      // Invalidate customer items list to refetch
      queryClient.invalidateQueries({ queryKey: customerItemKeys.lists() });
    },
  });
};

/**
 * Delete customer item by ID (Soft Delete)
 */
export const useDeleteCustomerItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, endDate }: { id: number; endDate?: string }) =>
      deleteCustomerItem(id, endDate),
    onSuccess: () => {
      // Invalidate customer items list to refetch
      queryClient.invalidateQueries({ queryKey: customerItemKeys.lists() });
    },
  });
};

/**
 * Permanently delete customer item by ID
 */
export const usePermanentDeleteCustomerItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number }) => permanentDeleteCustomerItem(id),
    onSuccess: () => {
      // Invalidate customer items list to refetch
      queryClient.invalidateQueries({ queryKey: customerItemKeys.lists() });
    },
  });
};

/**
 * Restore customer item by ID
 */
export const useRestoreCustomerItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number }) => restoreCustomerItem(id),
    onSuccess: () => {
      // Invalidate customer items list to refetch
      queryClient.invalidateQueries({ queryKey: customerItemKeys.lists() });
    },
  });
};
