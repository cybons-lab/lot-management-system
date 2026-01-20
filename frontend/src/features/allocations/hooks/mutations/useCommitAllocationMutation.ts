/**
 * Hook for committing allocation (finalizing)
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { commitAllocation } from "../../api";
import type { AllocationCommitRequest, AllocationCommitResponse } from "../../api";

import { logInfo } from "@/services/error-logger";

export const useCommitAllocationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<AllocationCommitResponse, Error, AllocationCommitRequest>({
    mutationFn: commitAllocation,
    onSuccess: (result, request) => {
      logInfo("Allocations:Commit", "引当を確定しました", {
        orderId: result.order_id,
        requestOrderId: request.order_id,
        createdAllocationIds: result.created_allocation_ids,
      });
      // 受注一覧・詳細を再取得
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail"] });
      queryClient.invalidateQueries({ queryKey: ["allocationCandidates"] });
    },
  });
};
