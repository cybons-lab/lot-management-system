/**
 * useCommitAllocationMutation Hook Tests
 *
 * Tests for allocation commit mutation:
 * - API call with correct payload
 * - Query invalidation on success (orders, order-detail, allocationCandidates)
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import * as allocationsApi from "../../api";
import type { AllocationCommitResponse } from "../../api";

import { useCommitAllocationMutation } from "./useCommitAllocationMutation";

// Mock API
vi.mock("../../api", () => ({
  commitAllocation: vi.fn(),
}));

describe("useCommitAllocationMutation", () => {
  let queryClient: QueryClient;
  let invalidateQueriesSpy: ReturnType<typeof vi.spyOn>;

  // Use type assertion for mock response since actual API response type may differ
  const mockCommitResponse = {
    order_id: 101,
    status: "confirmed",
    success: true,
    confirmed_count: 2,
    message: "Allocations committed successfully",
  } as unknown as AllocationCommitResponse;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
    vi.mocked(allocationsApi.commitAllocation).mockResolvedValue(mockCommitResponse);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("calls commitAllocation API", async () => {
    const { result } = renderHook(() => useCommitAllocationMutation(), { wrapper });

    const commitRequest = {
      order_id: 101,
      allocation_ids: [1, 2, 3],
    };

    await act(async () => {
      result.current.mutate(commitRequest);
    });

    await waitFor(() => {
      expect(allocationsApi.commitAllocation).toHaveBeenCalled();
    });
  });

  it("invalidates orders query on success", async () => {
    const { result } = renderHook(() => useCommitAllocationMutation(), { wrapper });

    await act(async () => {
      result.current.mutate({ order_id: 101 });
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["orders"] });
    });
  });

  it("invalidates order-detail query on success", async () => {
    const { result } = renderHook(() => useCommitAllocationMutation(), { wrapper });

    await act(async () => {
      result.current.mutate({ order_id: 101 });
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["order-detail"] });
    });
  });

  it("invalidates allocationCandidates query on success", async () => {
    const { result } = renderHook(() => useCommitAllocationMutation(), { wrapper });

    await act(async () => {
      result.current.mutate({ order_id: 101 });
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["allocationCandidates"] });
    });
  });

  it("returns isPending=true while mutation is in progress", async () => {
    let resolvePromise: (value: typeof mockCommitResponse) => void;
    vi.mocked(allocationsApi.commitAllocation).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const { result } = renderHook(() => useCommitAllocationMutation(), { wrapper });

    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.mutate({ order_id: 101 });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await act(async () => {
      resolvePromise!(mockCommitResponse);
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it("handles API error gracefully", async () => {
    const mockError = new Error("Commit failed");
    vi.mocked(allocationsApi.commitAllocation).mockRejectedValue(mockError);

    const { result } = renderHook(() => useCommitAllocationMutation(), { wrapper });

    await act(async () => {
      result.current.mutate({ order_id: 101 });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mockError);
    });
  });

  it("returns data on successful commit", async () => {
    const { result } = renderHook(() => useCommitAllocationMutation(), { wrapper });

    await act(async () => {
      result.current.mutate({ order_id: 101 });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockCommitResponse);
    });
  });
});
