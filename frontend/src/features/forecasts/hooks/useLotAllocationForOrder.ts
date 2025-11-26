/**
 * useLotAllocationForOrder Hook
 * 単一受注のロット引当ロジックを提供するhook
 * 既存の useLotAllocationActions のロジックを再利用
 */

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useLotAllocationActions } from "@/features/allocations/hooks/useLotAllocation/useLotAllocationActions";
import type {
  AllocationsByLine,
  LineStatusMap,
  AllocationToastState,
} from "@/features/allocations/hooks/useLotAllocation/lotAllocationTypes";
import type { OrderWithLinesResponse } from "@/shared/types/aliases";

/**
 * 単一受注のロット引当ロジックを提供
 */
export const useLotAllocationForOrder = (order: OrderWithLinesResponse) => {
  const queryClient = useQueryClient();
  const [allocationsByLine, setAllocationsByLine] = useState<AllocationsByLine>({});
  const [lineStatuses, setLineStatuses] = useState<LineStatusMap>({});
  const [toast, setToast] = useState<AllocationToastState>(null);

  const allLines = order.lines ?? [];

  const {
    getCandidateLots,
    getAllocationsForLine,
    changeAllocation,
    autoAllocate,
    clearAllocations,
    saveAllocations,
    isOverAllocated,
  } = useLotAllocationActions({
    queryClient,
    allLines,
    allocationsByLine,
    setAllocationsByLine,
    setLineStatuses,
    setToast,
  });

  return {
    allocationsByLine,
    lineStatuses,
    toast,
    setToast,
    getCandidateLots,
    getAllocationsForLine,
    changeAllocation,
    autoAllocate,
    clearAllocations,
    saveAllocations,
    isOverAllocated,
  };
};
