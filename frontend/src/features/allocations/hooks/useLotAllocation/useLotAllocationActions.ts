import { useMutation, type QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { saveManualAllocations, type ManualAllocationSaveResponse } from "../../api";
import type { OrderLine } from "@/shared/types/aliases";

import { allocationCandidatesKeys } from "../api/useAllocationCandidates";
import type { AllocationToastState, CandidateLotFetcher, LineStatus } from "./lotAllocationTypes";

interface SaveAllocationsVariables {
  orderLineId: number;
  orderId: number | null;
  allocations: Array<{ lot_id: number; quantity: number }>;
}

interface UseLotAllocationActionsOptions {
  queryClient: QueryClient;
  allLines: OrderLine[];
  allocationsByLine: Record<number, Record<number, number>>;
  setAllocationsByLine: React.Dispatch<
    React.SetStateAction<Record<number, Record<number, number>>>
  >;
  setLineStatuses: React.Dispatch<React.SetStateAction<Record<number, LineStatus>>>;
  setToast: React.Dispatch<React.SetStateAction<AllocationToastState>>;
}

function useCandidateLotFetcher(queryClient: QueryClient) {
  return useCallback<CandidateLotFetcher>(
    (lineId) => {
      const cache = queryClient.getQueryData<{ items?: unknown[] }>(
        allocationCandidatesKeys.list({
          order_line_id: lineId,
          strategy: "fefo",
          limit: 200,
        }),
      );
      return (cache?.items as ReturnType<CandidateLotFetcher>) ?? [];
    },
    [queryClient],
  );
}

function useGetAllocationsForLine(allocationsByLine: Record<number, Record<number, number>>) {
  return useCallback((lineId: number) => allocationsByLine[lineId] || {}, [allocationsByLine]);
}

function useChangeAllocationHandler({
  candidateFetcher,
  setAllocationsByLine,
  setLineStatuses,
}: {
  candidateFetcher: CandidateLotFetcher;
  setAllocationsByLine: React.Dispatch<
    React.SetStateAction<Record<number, Record<number, number>>>
  >;
  setLineStatuses: React.Dispatch<React.SetStateAction<Record<number, LineStatus>>>;
}) {
  return useCallback(
    (lineId: number, lotId: number, value: number) => {
      const candidates = candidateFetcher(lineId);
      const targetLot = candidates.find((lot) => lot.lot_id === lotId);
      const maxAllowed = targetLot
        ? Number(targetLot.free_qty ?? targetLot.current_quantity ?? 0)
        : Infinity;

      const clampedValue = Math.max(0, Math.min(maxAllowed, Number.isFinite(value) ? value : 0));

      setAllocationsByLine((prev) => {
        const lineAllocations = prev[lineId] || {};

        if (clampedValue === 0) {
          const { [lotId]: _, ...rest } = lineAllocations;
          return { ...prev, [lineId]: rest };
        }

        return {
          ...prev,
          [lineId]: { ...lineAllocations, [lotId]: clampedValue },
        };
      });

      setLineStatuses((prev) => ({
        ...prev,
        [lineId]: "draft",
      }));
    },
    [candidateFetcher, setAllocationsByLine, setLineStatuses],
  );
}

function useAutoAllocateHandler({
  allLines,
  candidateFetcher,
  setAllocationsByLine,
  setLineStatuses,
}: {
  allLines: OrderLine[];
  candidateFetcher: CandidateLotFetcher;
  setAllocationsByLine: React.Dispatch<
    React.SetStateAction<Record<number, Record<number, number>>>
  >;
  setLineStatuses: React.Dispatch<React.SetStateAction<Record<number, LineStatus>>>;
}) {
  return useCallback(
    (lineId: number) => {
      const line = allLines.find((l) => l.id === lineId);
      const candidates = candidateFetcher(lineId);

      if (!line || !candidates.length) return;

      const requiredQty = Number(line.order_quantity ?? line.quantity ?? 0);
      const dbAllocatedQty = Number(line.allocated_qty ?? line.allocated_quantity ?? 0);
      let remaining = requiredQty - dbAllocatedQty;

      const newLineAllocations: Record<number, number> = {};

      for (const lot of candidates) {
        if (remaining <= 0) break;
        const lotId = lot.lot_id;
        const freeQty = Number(lot.free_qty ?? lot.current_quantity ?? 0);

        const allocateQty = Math.min(remaining, freeQty);
        if (allocateQty > 0) {
          newLineAllocations[lotId] = allocateQty;
          remaining -= allocateQty;
        }
      }

      setAllocationsByLine((prev) => ({
        ...prev,
        [lineId]: newLineAllocations,
      }));

      setLineStatuses((prev) => ({
        ...prev,
        [lineId]: "draft",
      }));
    },
    [allLines, candidateFetcher, setAllocationsByLine, setLineStatuses],
  );
}

function useClearAllocationsHandler({
  setAllocationsByLine,
  setLineStatuses,
}: {
  setAllocationsByLine: React.Dispatch<
    React.SetStateAction<Record<number, Record<number, number>>>
  >;
  setLineStatuses: React.Dispatch<React.SetStateAction<Record<number, LineStatus>>>;
}) {
  return useCallback(
    (lineId: number) => {
      setAllocationsByLine((prev) => {
        const next = { ...prev };
        delete next[lineId];
        return next;
      });
      setLineStatuses((prev) => ({
        ...prev,
        [lineId]: "draft",
      }));
    },
    [setAllocationsByLine, setLineStatuses],
  );
}

function useIsOverAllocated({
  allLines,
  allocationsByLine,
}: {
  allLines: OrderLine[];
  allocationsByLine: Record<number, Record<number, number>>;
}) {
  return useCallback(
    (lineId: number) => {
      const line = allLines.find((l) => l.id === lineId);
      if (!line) return false;

      const requiredQty = Number(line.order_quantity ?? line.quantity ?? 0);
      const dbAllocated = Number(line.allocated_qty ?? 0);
      const uiAllocated = Object.values(allocationsByLine[lineId] || {}).reduce(
        (sum, v) => sum + v,
        0,
      );

      return dbAllocated + uiAllocated > requiredQty;
    },
    [allLines, allocationsByLine],
  );
}

function useAllocationSaver({
  queryClient,
  allLines,
  allocationsByLine,
  setAllocationsByLine,
  setLineStatuses,
  setToast,
  isOverAllocated,
}: UseLotAllocationActionsOptions & { isOverAllocated: (lineId: number) => boolean }) {
  const saveAllocationsMutation = useMutation<
    ManualAllocationSaveResponse,
    unknown,
    SaveAllocationsVariables
  >({
    mutationFn: ({ orderLineId, allocations }) =>
      saveManualAllocations({ order_line_id: orderLineId, allocations }),
    onSuccess: (response, variables) => {
      setToast({ message: response?.message ?? "引当を登録しました", variant: "success" });

      setLineStatuses((prev) => ({
        ...prev,
        [variables.orderLineId]: "committed",
      }));

      setAllocationsByLine((prev) => {
        const next = { ...prev };
        delete next[variables.orderLineId];
        return next;
      });

      queryClient.invalidateQueries({ queryKey: ["orders", "for-allocation"] });
      queryClient.invalidateQueries({
        queryKey: allocationCandidatesKeys.list({ order_line_id: variables.orderLineId }),
      });
    },
    onError: (error: unknown) => {
      setToast({
        message: error instanceof Error ? error.message : "引当の登録に失敗しました",
        variant: "error",
      });
    },
  });

  const saveAllocations = useCallback(
    (lineId: number) => {
      const allocationsMap = allocationsByLine[lineId] || {};
      const line = allLines.find((l) => l.id === lineId);
      if (!line) return;

      if (isOverAllocated(lineId)) {
        setToast({ message: "必要数量を超えて引当されています", variant: "error" });
        return;
      }

      const allocations = Object.entries(allocationsMap)
        .map(([lotIdStr, qty]) => ({ lot_id: Number(lotIdStr), quantity: Number(qty) }))
        .filter((item) => item.quantity > 0);

      saveAllocationsMutation.mutate({
        orderLineId: lineId,
        orderId: line.order_id ?? null,
        allocations,
      });
    },
    [allocationsByLine, allLines, isOverAllocated, saveAllocationsMutation, setToast],
  );

  return { saveAllocations, saveAllocationsMutation };
}

export function useLotAllocationActions(options: UseLotAllocationActionsOptions) {
  const candidateFetcher = useCandidateLotFetcher(options.queryClient);
  const getAllocationsForLine = useGetAllocationsForLine(options.allocationsByLine);
  const changeAllocation = useChangeAllocationHandler({
    candidateFetcher,
    setAllocationsByLine: options.setAllocationsByLine,
    setLineStatuses: options.setLineStatuses,
  });
  const autoAllocate = useAutoAllocateHandler({
    allLines: options.allLines,
    candidateFetcher,
    setAllocationsByLine: options.setAllocationsByLine,
    setLineStatuses: options.setLineStatuses,
  });
  const clearAllocations = useClearAllocationsHandler({
    setAllocationsByLine: options.setAllocationsByLine,
    setLineStatuses: options.setLineStatuses,
  });
  const isOverAllocated = useIsOverAllocated({
    allLines: options.allLines,
    allocationsByLine: options.allocationsByLine,
  });

  const { saveAllocations, saveAllocationsMutation } = useAllocationSaver({
    ...options,
    isOverAllocated,
  });

  return {
    getCandidateLots: candidateFetcher,
    getAllocationsForLine,
    changeAllocation,
    autoAllocate,
    clearAllocations,
    saveAllocations,
    isOverAllocated,
    saveAllocationsMutation,
  };
}
