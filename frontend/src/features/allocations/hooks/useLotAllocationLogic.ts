import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { getAllocationCandidates } from "../api";
import { ALLOCATION_CONSTANTS } from "../constants";
import type { AllocationToastState, LineStatus } from "../types";

import { allocationCandidatesKeys } from "./api/useAllocationCandidates";
import { useOrdersForAllocation } from "./api/useOrdersForAllocation";

import { useCustomersQuery, useProductsQuery } from "@/hooks/api/useMastersQuery";

/**
 * Hook to manage the state and data for the Lot Allocation page.
 * Consolidates logic from previous useLotAllocationState, useLotAllocationData, and useLotAllocationComputed.
 */

export function useLotAllocationLogic() {
  // --- State ---
  const [allocationsByLine, setAllocationsByLine] = useState<
    Record<number, Record<number, number>>
  >({});

  const [lineStatuses, setLineStatuses] = useState<Record<number, LineStatus>>({});

  const [toast, setToast] = useState<AllocationToastState>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // --- Data Fetching ---
  const ordersQuery = useOrdersForAllocation();
  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);

  const allLines = useMemo(() => {
    return orders.flatMap((order) => order.lines ?? []);
  }, [orders]);

  // Initialize state when data is loaded
  useEffect(() => {
    if (ordersQuery.isLoading || !allLines.length) return;

    setAllocationsByLine((prev) => {
      const next = { ...prev };
      let hasChanges = false;

      allLines.forEach((line) => {
        // Skip initialization if we already have local state for this line
        // (to prevent overwriting user edits if re-fetch happens)
        // However, if we want to sync with DB updates, we might need more complex logic.
        // For now, let's only initialize if empty to be safe, or if we trust re-fetch means current truth.
        // Given the "values buried" issue, simply initializing from DB is key.
        // Let's check if the line has allocations in DB.
        if (line.allocations && line.allocations.length > 0) {
          const lineAllocs: Record<number, number> = {};
          line.allocations.forEach((alloc) => {
            // Use lot_id if available (from schema fix), or lot_reference mapping if needed.
            // But API v2 allocation object should have lot_id if we fixed it?
            // Actually, the AllocationDetail schema has optional lot_id.
            // If lot_id is missing, we can't map it easily to the UI which expects lot_id.
            // But let's assume valid allocations have lot_id.
            if (alloc.lot_id) {
              lineAllocs[alloc.lot_id] = Number(alloc.allocated_quantity);
            }
          });

          // Only update if we don't have this line in state yet OR if the state is empty?
          // The report says "values buried", meaning they exist in DB but not UI.
          // So we should populate.
          if (!next[line.id]) {
            next[line.id] = lineAllocs;
            hasChanges = true;
          }
        }
      });

      return hasChanges ? next : prev;
    });

    setLineStatuses((prev) => {
      const next = { ...prev };
      let hasChanges = false;

      allLines.forEach((line) => {
        // If we have allocations, and status is not set, set it to "clean" (committed)
        // This implies we have DB data and no unsaved changes yet.
        if (line.allocations && line.allocations.length > 0) {
          if (next[line.id] !== "committed" && next[line.id] !== "draft") {
            next[line.id] = "committed";
            hasChanges = true;
          }
        }
      });
      return hasChanges ? next : prev;
    });
  }, [ordersQuery.isLoading, allLines]);

  // Prefetch candidate lots for all lines
  const candidateQueries = useQueries({
    queries: allLines.map((line) => ({
      queryKey: allocationCandidatesKeys.list({
        order_line_id: line.id!,
        product_id: Number(line.product_id || 0),
        strategy: "fefo",
        limit: ALLOCATION_CONSTANTS.CANDIDATE_LOTS_LIMIT,
      }),
      queryFn: async () => {
        return getAllocationCandidates({
          order_line_id: line.id!,
          product_id: Number(line.product_id || 0),
          strategy: "fefo",
          limit: ALLOCATION_CONSTANTS.CANDIDATE_LOTS_LIMIT,
        });
      },
      enabled: !!line.id,
      staleTime: 1000 * 60,
    })),
  });

  const isCandidatesLoading = candidateQueries.some((q) => q.isLoading);

  const customersQuery = useCustomersQuery({
    staleTime: 1000 * 60 * 5,
  });

  const productsQuery = useProductsQuery({
    staleTime: 1000 * 60 * 5,
  });

  // --- Computed ---
  const customerMap = useMemo(() => {
    if (!customersQuery.data) return {};
    return customersQuery.data.reduce(
      (acc, customer) => {
        acc[customer.id] = customer.customer_name ?? "";
        return acc;
      },
      {} as Record<number, string>,
    );
  }, [customersQuery.data]);

  const productMap = useMemo(() => {
    if (!productsQuery.data) return {};
    return productsQuery.data.reduce(
      (acc, product) => {
        acc[product.id] = product.product_name ?? "";
        return acc;
      },
      {} as Record<number, string>,
    );
  }, [productsQuery.data]);

  return {
    // State
    allocationsByLine,
    setAllocationsByLine,
    lineStatuses,
    setLineStatuses,
    toast,
    setToast,

    // Data
    ordersQuery,
    orders,
    allLines,
    customersQuery,
    productsQuery,
    isCandidatesLoading,

    // Computed
    customerMap,
    productMap,
  };
}
