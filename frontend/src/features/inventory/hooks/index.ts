/**
 * Inventory Hooks (v2.2 - Phase D-4)
 * TanStack Query hooks for inventory items (summary)
 */

import { useQuery } from "@tanstack/react-query";

import type { InventoryItemsListParams } from "../api";
import { getInventoryItems, getInventoryItem } from "../api";

// ===== Query Keys =====

export const inventoryItemKeys = {
  all: ["inventoryItems"] as const,
  lists: () => [...inventoryItemKeys.all, "list"] as const,
  list: (params?: InventoryItemsListParams) => [...inventoryItemKeys.lists(), params] as const,
  details: () => [...inventoryItemKeys.all, "detail"] as const,
  detail: (productId: number, warehouseId: number) =>
    [...inventoryItemKeys.details(), productId, warehouseId] as const,
};

// ===== Query Hooks =====

/**
 * Get inventory items (summary) list
 */
export const useInventoryItems = (params?: InventoryItemsListParams) => {
  return useQuery({
    queryKey: inventoryItemKeys.list(params),
    queryFn: () => getInventoryItems(params),
    staleTime: 1000 * 60 * 2, // 2 minutes (inventory data changes frequently)
  });
};

/**
 * Get inventory item detail (product + warehouse)
 */
export const useInventoryItem = (productId: number, warehouseId: number) => {
  return useQuery({
    queryKey: inventoryItemKeys.detail(productId, warehouseId),
    queryFn: () => getInventoryItem(productId, warehouseId),
    enabled: productId > 0 && warehouseId > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
