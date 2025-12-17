/**
 * useAllocationContext - Hook to access allocation context from Jotai atoms
 *
 * This hook provides type-safe access to allocation handlers and context data
 * that were previously passed through multiple layers of props.
 */

import { useAtomValue, useSetAtom } from "jotai";

import {
  activeLineIdAtom,
  allocationContextDataAtom,
  allocationHandlersAtom,
  lineStatusesAtom,
  setActiveLineIdAtom,
} from "../store/allocation-context";

/**
 * Access allocation handlers from context
 * @throws Error if used outside AllocationProvider
 */
export function useAllocationHandlers() {
  const handlers = useAtomValue(allocationHandlersAtom);

  if (!handlers) {
    throw new Error("useAllocationHandlers must be used within AllocationProvider");
  }

  return handlers;
}

/**
 * Access allocation context data (productMap, customerMap)
 */
export function useAllocationContextData() {
  return useAtomValue(allocationContextDataAtom);
}

/**
 * Access line statuses
 */
export function useLineStatuses() {
  return useAtomValue(lineStatusesAtom);
}

/**
 * Access active line state
 */
export function useActiveLineId() {
  const activeLineId = useAtomValue(activeLineIdAtom);
  const setActiveLineId = useSetAtom(setActiveLineIdAtom);

  return {
    activeLineId,
    setActiveLineId,
    isActive: (lineId: number) => activeLineId === lineId,
  };
}

/**
 * Combined hook for components that need all allocation context
 */
export function useAllocationContext() {
  const handlers = useAtomValue(allocationHandlersAtom);
  const contextData = useAtomValue(allocationContextDataAtom);
  const lineStatuses = useAtomValue(lineStatusesAtom);
  const activeLineId = useAtomValue(activeLineIdAtom);
  const setActiveLineId = useSetAtom(setActiveLineIdAtom);

  if (!handlers) {
    throw new Error("useAllocationContext must be used within AllocationProvider");
  }

  return {
    // Handlers
    ...handlers,
    // Context data
    ...contextData,
    // Line statuses
    lineStatuses,
    getLineStatus: (lineId: number) => lineStatuses[lineId] ?? "clean",
    // Active line
    activeLineId,
    setActiveLineId,
    isActive: (lineId: number) => activeLineId === lineId,
  };
}
