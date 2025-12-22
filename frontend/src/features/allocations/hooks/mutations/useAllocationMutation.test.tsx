/**
 * useAllocationMutation Hook Tests
 *
 * Tests for allocation save mutation:
 * - API call with correct payload
 * - Query invalidation on success
 * - Success/Error callbacks
 * - canSave logic
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import * as allocationsApi from "../../api";
import type { OrderLine } from "../../types";

import { useAllocationMutation } from "./useAllocationMutation";

// Mock API
vi.mock("../../api", () => ({
  createAllocations: vi.fn(),
}));

describe("useAllocationMutation", () => {
  let queryClient: QueryClient;
  const onSuccess = vi.fn();
  const onError = vi.fn();

  // Minimal mock - use type assertion since we only need id, product_code for test logic
  const mockSelectedLine = {
    id: 101,
    product_code: "PROD-001",
    order_quantity: 10,
    allocated_quantity: 0,
  } as unknown as OrderLine;

  const mockAllocationList = [
    { lotId: 1, quantity: 5 },
    { lotId: 2, quantity: 3 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(allocationsApi.createAllocations).mockResolvedValue({
      order_id: 101,
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("returns canSave=false when allocationList is empty", () => {
    const { result } = renderHook(
      () => useAllocationMutation(1, 101, mockSelectedLine, [], onSuccess, onError),
      { wrapper },
    );

    expect(result.current.canSave).toBe(false);
  });

  it("returns canSave=true when allocationList has items", () => {
    const { result } = renderHook(
      () => useAllocationMutation(1, 101, mockSelectedLine, mockAllocationList, onSuccess, onError),
      { wrapper },
    );

    expect(result.current.canSave).toBe(true);
  });

  it("does not save when selectedLineId is null", () => {
    const { result } = renderHook(
      () =>
        useAllocationMutation(1, null, mockSelectedLine, mockAllocationList, onSuccess, onError),
      { wrapper },
    );

    // handleSaveAllocations should early return when selectedLineId is null
    act(() => {
      result.current.handleSaveAllocations();
    });

    expect(allocationsApi.createAllocations).not.toHaveBeenCalled();
  });

  it("calls createAllocations API with correct payload on save", async () => {
    const { result } = renderHook(
      () => useAllocationMutation(1, 101, mockSelectedLine, mockAllocationList, onSuccess, onError),
      { wrapper },
    );

    await act(async () => {
      result.current.handleSaveAllocations();
    });

    await waitFor(() => {
      expect(allocationsApi.createAllocations).toHaveBeenCalledWith({
        order_line_id: 101,
        product_code: "PROD-001",
        allocations: mockAllocationList,
      });
    });
  });

  it("calls onSuccess callback after successful save", async () => {
    const { result } = renderHook(
      () => useAllocationMutation(1, 101, mockSelectedLine, mockAllocationList, onSuccess, onError),
      { wrapper },
    );

    await act(async () => {
      result.current.handleSaveAllocations();
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("calls onError callback with message when save fails", async () => {
    vi.mocked(allocationsApi.createAllocations).mockRejectedValue(new Error("Save failed"));

    const { result } = renderHook(
      () => useAllocationMutation(1, 101, mockSelectedLine, mockAllocationList, onSuccess, onError),
      { wrapper },
    );

    await act(async () => {
      result.current.handleSaveAllocations();
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Save failed");
    });
  });

  it("calls onError with default message when error has no message", async () => {
    vi.mocked(allocationsApi.createAllocations).mockRejectedValue("Unknown error");

    const { result } = renderHook(
      () => useAllocationMutation(1, 101, mockSelectedLine, mockAllocationList, onSuccess, onError),
      { wrapper },
    );

    await act(async () => {
      result.current.handleSaveAllocations();
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("保存に失敗しました");
    });
  });

  it("sets isLoading=true while save is in progress", async () => {
    let resolvePromise: (value: { order_id: number }) => void;
    vi.mocked(allocationsApi.createAllocations).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const { result } = renderHook(
      () => useAllocationMutation(1, 101, mockSelectedLine, mockAllocationList, onSuccess, onError),
      { wrapper },
    );

    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.handleSaveAllocations();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await act(async () => {
      resolvePromise!({ order_id: 101 });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("does not save when selectedLine has no product_code", () => {
    const lineWithoutProductCode = {
      ...mockSelectedLine,
      product_code: undefined,
    } as unknown as OrderLine;

    const { result } = renderHook(
      () =>
        useAllocationMutation(
          1,
          101,
          lineWithoutProductCode,
          mockAllocationList,
          onSuccess,
          onError,
        ),
      { wrapper },
    );

    act(() => {
      result.current.handleSaveAllocations();
    });

    expect(allocationsApi.createAllocations).not.toHaveBeenCalled();
  });
});
