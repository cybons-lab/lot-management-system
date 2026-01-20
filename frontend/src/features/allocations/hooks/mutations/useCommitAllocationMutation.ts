/**
 * Hook for committing allocation (finalizing)
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { logInfo } from "@/services/error-logger";

import { commitAllocation } from "../../api";
import type { AllocationCommitRequest, AllocationCommitResponse } from "../../api";

export const useCommitAllocationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<AllocationCommitResponse, Error, AllocationCommitRequest>({
    mutationFn: commitAllocation,
    onSuccess: (result, request) => {
      logInfo("Allocations:Commit", "引当を確定しました", {
        orderLineId: request.order_line_id,
        totalAllocated: result.total_allocated,
      });
      // 受注一覧・詳細を再取得
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail"] });
      queryClient.invalidateQueries({ queryKey: ["allocationCandidates"] });
    },
  });
};
