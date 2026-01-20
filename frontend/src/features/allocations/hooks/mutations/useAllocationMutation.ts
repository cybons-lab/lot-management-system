/**
 * Custom hook for allocation mutation and save logic
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { logInfo } from "@/services/error-logger";

import type { OrderLine } from "../../types";

import {
  createAllocations,
  type CreateAllocationPayload,
  type AllocationInputItem,
} from "@/features/allocations/api";

export function useAllocationMutation(
  selectedOrderId: number | null,
  selectedLineId: number | null,
  selectedLine: OrderLine | undefined,
  allocationList: AllocationInputItem[],
  onSuccess: () => void,
  onError: (message: string) => void,
) {
  const queryClient = useQueryClient();

  // 引当保存のMutation
  const createAllocationMutation = useMutation({
    mutationFn: (payload: CreateAllocationPayload) => createAllocations(payload),
    onSuccess: (_, payload) => {
      logInfo("Allocations:Create", "引当を保存しました", {
        orderLineId: payload.order_line_id,
        productCode: payload.product_code,
        allocationCount: payload.allocations.length,
      });
      queryClient.invalidateQueries({ queryKey: ["order-detail", selectedOrderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onSuccess();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "保存に失敗しました";
      onError(message);
    },
  });

  const handleSaveAllocations = useCallback(() => {
    if (!selectedLineId || !selectedLine?.product_code) return;
    if (allocationList.length === 0) return;

    const payload: CreateAllocationPayload = {
      order_line_id: selectedLineId,
      product_code: selectedLine.product_code,
      allocations: allocationList,
    };

    createAllocationMutation.mutate(payload);
  }, [selectedLineId, selectedLine, allocationList, createAllocationMutation]);

  const canSave = allocationList.length > 0 && !createAllocationMutation.isPending;

  return {
    handleSaveAllocations,
    canSave,
    isLoading: createAllocationMutation.isPending,
  };
}
