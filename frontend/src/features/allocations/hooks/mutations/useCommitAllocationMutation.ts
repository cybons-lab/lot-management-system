/**
 * Hook for committing allocation (finalizing)
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { commitAllocation } from "../../api";
import type { AllocationCommitRequest, AllocationCommitResponse } from "../../api";

export const useCommitAllocationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<AllocationCommitResponse, Error, AllocationCommitRequest>({
    mutationFn: commitAllocation,
    onSuccess: () => {
      // 受注一覧・詳細を再取得
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail"] });
      queryClient.invalidateQueries({ queryKey: ["allocationCandidates"] });
    },
  });
};
