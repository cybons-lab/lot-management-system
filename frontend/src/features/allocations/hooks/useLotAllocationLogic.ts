import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { getAllocationCandidates } from "../api";
import type { AllocationToastState, LineStatus } from "../types";

import { allocationCandidatesKeys } from "./api/useAllocationCandidates";
import { useOrdersForAllocation } from "./api/useOrdersForAllocation";


import { listCustomers, listProducts } from "@/services/api/master-service";

/**
 * Hook to manage the state and data for the Lot Allocation page.
 * Consolidates logic from previous useLotAllocationState, useLotAllocationData, and useLotAllocationComputed.
 */
// eslint-disable-next-line max-lines-per-function
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
                strategy: "fefo",
                limit: 100,
            }),
            queryFn: async () => {
                return getAllocationCandidates({
                    order_line_id: line.id!,
                    strategy: "fefo",
                    limit: 100,
                });
            },
            enabled: !!line.id,
            staleTime: 1000 * 60,
        })),
    });

    const isCandidatesLoading = candidateQueries.some((q) => q.isLoading);

    const customersQuery = useQuery({
        queryKey: ["masters", "customers"],
        queryFn: listCustomers,
        staleTime: 1000 * 60 * 5,
    });

    const productsQuery = useQuery({
        queryKey: ["masters", "products"],
        queryFn: listProducts,
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
