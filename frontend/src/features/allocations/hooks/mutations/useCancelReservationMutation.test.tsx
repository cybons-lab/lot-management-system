/**
 * useCancelReservationMutation Hook Tests
 *
 * Tests for reservation cancellation mutation:
 * - API call with correct payload
 * - Query invalidation on success
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import * as allocationsApi from "../../api";
import type { ReservationCancelResponse } from "../../api";

import { useCancelReservationMutation } from "./useCancelReservationMutation";

// Mock API
vi.mock("../../api", () => ({
  cancelConfirmedReservation: vi.fn(),
}));

describe("useCancelReservationMutation", () => {
  let queryClient: QueryClient;
  let invalidateQueriesSpy: ReturnType<typeof vi.spyOn>;

  const mockCancelResponse = {
    id: 1,
    lot_id: 101,
    lot_number: "LOT-001",
    reserved_quantity: "10.00",
    status: "cancelled",
    cancel_reason: "customer_request",
    cancel_reason_label: "顧客都合",
    cancel_note: "Cancel request",
    cancelled_by: "test_user",
    released_at: "2024-01-01T00:00:00Z",
    message: "Reservation cancelled successfully",
  } as unknown as ReservationCancelResponse;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
    vi.mocked(allocationsApi.cancelConfirmedReservation).mockResolvedValue(mockCancelResponse);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("calls cancelConfirmedReservation API with correct arguments", async () => {
    const { result } = renderHook(() => useCancelReservationMutation(), { wrapper });

    const allocationId = 123;
    const cancelRequest = {
      reason: "customer_request" as const,
      note: "Customer changed mind",
      cancelled_by: "Current User",
    };

    await act(async () => {
      result.current.mutate({ allocationId, data: cancelRequest });
    });

    await waitFor(() => {
      expect(allocationsApi.cancelConfirmedReservation).toHaveBeenCalledWith(
        allocationId,
        cancelRequest,
      );
    });
  });

  it("invalidates queries on success", async () => {
    const { result } = renderHook(() => useCancelReservationMutation(), { wrapper });

    await act(async () => {
      result.current.mutate({
        allocationId: 123,
        data: { reason: "other" },
      });
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["allocations"] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["order-detail"] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["orders"] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["lots"] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["inventory-items"] });
    });
  });

  it("calls onSuccess callback if provided", async () => {
    const onSuccessMock = vi.fn();
    const { result } = renderHook(
      () => useCancelReservationMutation({ onSuccess: onSuccessMock }),
      { wrapper },
    );

    await act(async () => {
      result.current.mutate({
        allocationId: 123,
        data: { reason: "other" },
      });
    });

    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalledWith(mockCancelResponse);
    });
  });

  it("calls onError callback if API fails", async () => {
    const onErrorMock = vi.fn();
    const mockError = new Error("Cancellation failed");
    vi.mocked(allocationsApi.cancelConfirmedReservation).mockRejectedValue(mockError);

    const { result } = renderHook(() => useCancelReservationMutation({ onError: onErrorMock }), {
      wrapper,
    });

    await act(async () => {
      result.current.mutate({
        allocationId: 123,
        data: { reason: "other" },
      });
    });

    await waitFor(() => {
      expect(onErrorMock).toHaveBeenCalledWith(mockError);
    });
  });

  it("returns isPending=true while mutation is in progress", async () => {
    let resolvePromise: (value: typeof mockCancelResponse) => void;
    vi.mocked(allocationsApi.cancelConfirmedReservation).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const { result } = renderHook(() => useCancelReservationMutation(), { wrapper });

    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.mutate({
        allocationId: 123,
        data: { reason: "other" },
      });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await act(async () => {
      resolvePromise!(mockCancelResponse);
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });
});
