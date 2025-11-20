import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { CandidateLotItem } from "../../api";

import { allocationCandidatesKeys } from "../useAllocationCandidates";
import { useOrdersForAllocation } from "../useOrdersForAllocation";
import { listCustomers, listProducts } from "@/services/api/master-service";

export function useLotAllocationData() {
  const ordersQuery = useOrdersForAllocation();
  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);

  const allLines = useMemo(() => {
    return orders.flatMap((order) => order.lines ?? []);
  }, [orders]);

  useQueries({
    queries: allLines.map((line) => ({
      queryKey: allocationCandidatesKeys.list({
        order_line_id: line.id!,
        strategy: "fefo",
        limit: 100,
      }),
      queryFn: async () => {
        return { items: [] as CandidateLotItem[] };
      },
      enabled: !!line.id,
      staleTime: 1000 * 60,
    })),
  });

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

  return { ordersQuery, orders, allLines, customersQuery, productsQuery };
}
