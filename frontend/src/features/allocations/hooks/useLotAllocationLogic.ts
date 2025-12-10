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
