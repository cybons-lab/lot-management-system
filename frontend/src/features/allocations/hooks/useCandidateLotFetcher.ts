/**
 * Hook to fetch candidate lots from cache
 */

import type { QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { ALLOCATION_CONSTANTS } from "../constants";
import type { CandidateLotFetcher } from "../types";

import { allocationCandidatesKeys } from "./api/useAllocationCandidates";

/**
 * Hook to fetch candidate lots from cache
 * @param queryClient - TanStack Query client
 * @returns Function to fetch candidate lots by line ID
 */
export function useCandidateLotFetcher(queryClient: QueryClient): CandidateLotFetcher {
  return useCallback<CandidateLotFetcher>(
    (lineId, productId) => {
      const cache = queryClient.getQueryData<{ items?: unknown[] }>(
        allocationCandidatesKeys.list({
          order_line_id: lineId,
          product_id: productId,
          strategy: ALLOCATION_CONSTANTS.QUERY_STRATEGY.FEFO,
          limit: ALLOCATION_CONSTANTS.CANDIDATE_LOTS_LIMIT,
        }),
      );

      // Type guard: Ensure items is an array
      if (!cache?.items || !Array.isArray(cache.items)) {
        return [];
      }

      // Return as CandidateLotItem array (assuming items conform to type)
      return cache.items as ReturnType<CandidateLotFetcher>;
    },
    [queryClient],
  );
}
