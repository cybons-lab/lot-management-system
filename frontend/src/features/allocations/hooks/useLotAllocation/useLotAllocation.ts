import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import type { LineStatus, LineStockStatus } from "./lotAllocationTypes";
import { useLotAllocationActions } from "./useLotAllocationActions";
import { useLotAllocationComputed } from "./useLotAllocationComputed";
import { useLotAllocationData } from "./useLotAllocationData";
import { useLotAllocationState } from "./useLotAllocationState";

export type { LineStatus, LineStockStatus };

export function useLotAllocation() {
  const queryClient = useQueryClient();

  const {
    allocationsByLine,
    setAllocationsByLine,
    lineStatuses,
    setLineStatuses,
    toast,
    setToast,
  } = useLotAllocationState();

  const { ordersQuery, orders, allLines, customersQuery, productsQuery, isCandidatesLoading } =
    useLotAllocationData();

  const { customerMap, productMap } = useLotAllocationComputed({
    customers: customersQuery.data,
    products: productsQuery.data,
  });

  const {
    getCandidateLots,
    getAllocationsForLine,
    changeAllocation,
    autoAllocate,
    clearAllocations,
    saveAllocations,
    isOverAllocated,
    saveAllocationsMutation,
  } = useLotAllocationActions({
    queryClient,
    allLines,
    allocationsByLine,
    setAllocationsByLine,
    setLineStatuses,
    setToast,
  });

  // Auto-allocate on mount (once orders are loaded and candidates are ready)
  const hasAutoAllocatedRef = useRef(false);

  useEffect(() => {
    if (
      ordersQuery.isLoading ||
      isCandidatesLoading ||
      !allLines.length ||
      hasAutoAllocatedRef.current
    ) {
      return;
    }

    // Trigger auto-allocate for all lines that don't have allocations yet
    // We use a timeout to ensure candidate lots are fetched/available (or let the action handle it)
    // Note: autoAllocate relies on candidateFetcher which uses queryClient.getQueryData.
    // If data isn't in cache, it returns empty.
    // We might need to wait for candidates?
    // Actually, useLotAllocationData prefetches candidates!
    // But prefetching might take time.

    // For now, let's try running it. If candidates aren't ready, it might fail to allocate.
    // A better approach might be to let the user click "Auto Allocate All" or similar,
    // but the user asked for "values buried".

    // Let's try to run it.
    // ★以下の自動引当ループをコメントアウトして無効化★
    /*
    allLines.forEach((line) => {
      // Check if already allocated (in DB or UI)
      // If DB has allocations, we might not want to overwrite?
      // But the user wants "Soft Allocation" (Draft) to be applied.
      // If DB has "hard" allocations, they are loaded as "allocated_quantity" in the line?
      // No, OrderLine has `allocations` relationship?
      // If so, we should load them.

      // Assuming we want to fill *unallocated* portion.
      // autoAllocate logic checks `dbAllocated` and fills the rest.

      if (!allocationsByLine[line.id]) {
        autoAllocate(line.id);
      }
    });
    */

    hasAutoAllocatedRef.current = true;
  }, [ordersQuery.isLoading, isCandidatesLoading, allLines, autoAllocate, allocationsByLine]);

  return {
    orders,
    customerMap,
    productMap,
    allocationsByLine,
    lineStatuses,
    toast,

    isLoadingOrders: ordersQuery.isLoading,
    isSavingAllocations: saveAllocationsMutation.isPending,

    getCandidateLots,
    getAllocationsForLine,
    changeAllocation,
    autoAllocate,
    clearAllocations,
    saveAllocations,
    isOverAllocated,

    selectedOrderId: null,
    selectedOrderLineId: null,
  };
}
