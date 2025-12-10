import { useMemo } from "react";

import type { InventoryItem } from "../api";

export function useInventoryStats(inventoryItems: InventoryItem[]) {
  return useMemo(() => {
    const totalItems = inventoryItems.length;
    const totalQuantity = inventoryItems.reduce(
      (sum, item) => sum + Number(item.total_quantity || 0),
      0,
    );
    const totalAllocated = inventoryItems.reduce(
      (sum, item) => sum + Number(item.allocated_quantity || 0),
      0,
    );
    const totalAvailable = inventoryItems.reduce(
      (sum, item) => sum + Number(item.available_quantity || 0),
      0,
    );
    const uniqueProducts = new Set(inventoryItems.map((item) => item.product_id)).size;
    const uniqueWarehouses = new Set(inventoryItems.map((item) => item.warehouse_id)).size;

    return {
      totalItems,
      totalQuantity,
      totalAllocated,
      totalAvailable,
      uniqueProducts,
      uniqueWarehouses,
    };
  }, [inventoryItems]);
}
