/**
 * AllocationProvider - Sets allocation context atoms for child components
 *
 * This provider receives props from the parent (LineBasedAllocationList)
 * and syncs them to Jotai atoms, eliminating the need for prop drilling.
 */

import { useSetAtom } from "jotai";
import { useEffect, useMemo } from "react";

import type { AllocationHandlers } from "../store/allocation-context";
import {
  activeLineIdAtom,
  allocationContextDataAtom,
  allocationHandlersAtom,
  lineStatusesAtom,
} from "../store/allocation-context";
import type { LineStatus } from "../types";

import type { CandidateLotItem } from "../api";

export interface AllocationProviderProps {
  children: React.ReactNode;
  // Context data
  productMap: Record<number, string>;
  customerMap: Record<number, string>;
  // State
  lineStatuses: Record<number, LineStatus>;
  activeLineId: number | null;
  // Handlers
  getLineAllocations: (lineId: number) => Record<number, number>;
  getCandidateLots: (lineId: number) => CandidateLotItem[];
  isOverAllocated: (lineId: number) => boolean;
  onLotAllocationChange: (lineId: number, lotId: number, quantity: number) => void;
  onAutoAllocate: (lineId: number) => void;
  onClearAllocations: (lineId: number) => void;
  onSaveAllocations: (lineId: number) => void;
}

export function AllocationProvider({
  children,
  productMap,
  customerMap,
  lineStatuses,
  activeLineId,
  getLineAllocations,
  getCandidateLots,
  isOverAllocated,
  onLotAllocationChange,
  onAutoAllocate,
  onClearAllocations,
  onSaveAllocations,
}: AllocationProviderProps) {
  const setContextData = useSetAtom(allocationContextDataAtom);
  const setHandlers = useSetAtom(allocationHandlersAtom);
  const setLineStatuses = useSetAtom(lineStatusesAtom);
  const setActiveLineId = useSetAtom(activeLineIdAtom);

  // Memoize handlers to prevent unnecessary re-renders
  const handlers: AllocationHandlers = useMemo(
    () => ({
      getLineAllocations,
      getCandidateLots,
      isOverAllocated,
      onLotAllocationChange,
      onAutoAllocate,
      onClearAllocations,
      onSaveAllocations,
    }),
    [
      getLineAllocations,
      getCandidateLots,
      isOverAllocated,
      onLotAllocationChange,
      onAutoAllocate,
      onClearAllocations,
      onSaveAllocations,
    ],
  );

  // Sync context data
  useEffect(() => {
    setContextData({ productMap, customerMap });
  }, [productMap, customerMap, setContextData]);

  // Sync handlers
  useEffect(() => {
    setHandlers(handlers);
    return () => setHandlers(null); // Cleanup on unmount
  }, [handlers, setHandlers]);

  // Sync line statuses
  useEffect(() => {
    setLineStatuses(lineStatuses);
  }, [lineStatuses, setLineStatuses]);

  // Sync active line ID
  useEffect(() => {
    setActiveLineId(activeLineId);
  }, [activeLineId, setActiveLineId]);

  return <>{children}</>;
}
