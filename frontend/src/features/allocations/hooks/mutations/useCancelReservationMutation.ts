/**
 * Custom hook for cancelling CONFIRMED reservations (reversal transaction)
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { logInfo } from "@/services/error-logger";

import {
  cancelConfirmedReservation,
  type ReservationCancelRequest,
  type ReservationCancelResponse,
} from "../../api";

interface CancelReservationParams {
  allocationId: number;
  data: ReservationCancelRequest;
}

export function useCancelReservationMutation(options?: {
  onSuccess?: (response: ReservationCancelResponse) => void;
  onError?: (error: unknown) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ allocationId, data }: CancelReservationParams) =>
      cancelConfirmedReservation(allocationId, data),
    onSuccess: (response, variables) => {
      logInfo("Allocations:Cancel", "引当をキャンセルしました", {
        allocationId: variables.allocationId,
        reason: variables.data.reason,
      });
      // Invalidate allocation-related queries
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      // Lot queries for updated quantities
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });

      options?.onSuccess?.(response);
    },
    onError: (error: unknown) => {
      options?.onError?.(error);
    },
  });
}
