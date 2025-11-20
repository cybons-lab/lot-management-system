import { useQueryClient } from "@tanstack/react-query";

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

  const { ordersQuery, orders, allLines, customersQuery, productsQuery } = useLotAllocationData();

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
