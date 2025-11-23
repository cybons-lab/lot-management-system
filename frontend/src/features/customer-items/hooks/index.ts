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
      externalProductCode,
      data,
    }: {
      customerId: number;
      externalProductCode: string;
      data: UpdateCustomerItemRequest;
    }) => updateCustomerItem(customerId, externalProductCode, data),
    onSuccess: () => {
      // Invalidate customer items list to refetch
      queryClient.invalidateQueries({ queryKey: customerItemKeys.lists() });
    },
  });
};

/**
 * Delete customer item
 */
export const useDeleteCustomerItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      externalProductCode,
    }: {
      customerId: number;
      externalProductCode: string;
    }) => deleteCustomerItem(customerId, externalProductCode),
    onSuccess: () => {
      // Invalidate customer items list to refetch
      queryClient.invalidateQueries({ queryKey: customerItemKeys.lists() });
    },
  });
};
