/**
 * useLotAllocationForOrder Hook
 * 単一受注のロット引当ロジックを提供するhook
 * 既存の useLotAllocationActions のロジックを再利用
 */

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { useLotAllocationActions } from "@/features/allocations/hooks/useLotAllocationActions";
import type {
  AllocationsByLine,
  LineStatusMap,
  AllocationToastState,
} from "@/features/allocations/types";
import type { OrderWithLinesResponse } from "@/shared/types/aliases";

/**
 * 単一受注のロット引当ロジックを提供
 */
export const useLotAllocationForOrder = (order: OrderWithLinesResponse) => {
  const queryClient = useQueryClient();
  const [allocationsByLine, setAllocationsByLine] = useState<AllocationsByLine>({});
  const [lineStatuses, setLineStatuses] = useState<LineStatusMap>({});
  const [toast, setToast] = useState<AllocationToastState>(null);

  const allLines = useMemo(() => order.lines ?? [], [order.lines]);

  // Backend state sync
  useEffect(() => {
    if (!allLines || allLines.length === 0) return;

    const initialAllocations: AllocationsByLine = {};
    const initialStatuses: LineStatusMap = {};

    allLines.forEach((line) => {
      // Map reservations
      const reservations = Array.isArray(line.reservations) ? line.reservations : [];
      if (reservations.length > 0) {
        const lineAllocMap: Record<number, number> = {};
        reservations.forEach((alloc) => {
          if (alloc.lot_id) {
            lineAllocMap[alloc.lot_id] = Number(alloc.reserved_qty ?? 0);
          }
        });
        initialAllocations[line.id] = lineAllocMap;
      }

      // Map status
      initialStatuses[line.id] = "clean";
    });

    setAllocationsByLine(initialAllocations);
    setLineStatuses(initialStatuses);
  }, [allLines]); // Re-sync when lines change

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
