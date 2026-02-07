/**
 * useAutoAllocateHandler Hook Tests
 *
 * Tests for auto allocation (FEFO) handler:
 * - Finds line and candidates
 * - Calculates auto allocation
 * - Updates allocation state
 * - Sets line status to draft
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useAutoAllocateHandler } from "./useAutoAllocateHandler";

// Mock the helper
vi.mock("../helpers/allocationStatusHelpers", () => ({
  setLineStatusToDraft: vi.fn(),
}));

// Mock the calculation utils
vi.mock("../utils/allocationCalculations", () => ({
  calculateAutoAllocation: vi.fn(),
  getAllocatedQuantity: vi.fn(),
  getOrderQuantity: vi.fn(),
}));

describe("useAutoAllocateHandler", () => {
  const mockSetAllocationsByLine = vi.fn();
  const mockSetLineStatuses = vi.fn();
  const mockCandidateFetcher = vi.fn();

  // Minimal mock lines - use unknown cast since we only need id, supplier_item_id for test
  const mockLines = [
    { id: 101, supplier_item_id: 1, order_quantity: 10, allocated_quantity: 0 },
    { id: 102, supplier_item_id: 2, order_quantity: 20, allocated_quantity: 5 },
  ] as unknown as Parameters<typeof useAutoAllocateHandler>[0]["allLines"];

  const mockCandidates = [
    { lot_id: 1, available_quantity: 50, expiry_date: "2025-12-31" },
    { lot_id: 2, available_quantity: 30, expiry_date: "2026-01-15" },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mock implementations
    const { calculateAutoAllocation, getAllocatedQuantity, getOrderQuantity } =
      await import("../utils/allocationCalculations");

    vi.mocked(getAllocatedQuantity).mockReturnValue(0);
    vi.mocked(getOrderQuantity).mockReturnValue(10);
    vi.mocked(calculateAutoAllocation).mockReturnValue({ 1: 10 });

    mockCandidateFetcher.mockReturnValue(mockCandidates);
  });

  it("returns a function", () => {
    const { result } = renderHook(() =>
      useAutoAllocateHandler({
        allLines: mockLines,
        candidateFetcher: mockCandidateFetcher,
        setAllocationsByLine: mockSetAllocationsByLine,
        setLineStatuses: mockSetLineStatuses,
      }),
    );

    expect(typeof result.current).toBe("function");
  });

  it("does nothing when line is not found", async () => {
    const { setLineStatusToDraft } = await import("../helpers/allocationStatusHelpers");

    const { result } = renderHook(() =>
      useAutoAllocateHandler({
        allLines: mockLines,
        candidateFetcher: mockCandidateFetcher,
        setAllocationsByLine: mockSetAllocationsByLine,
        setLineStatuses: mockSetLineStatuses,
      }),
    );

    act(() => {
      result.current(999); // Non-existent line ID
    });

    expect(mockSetAllocationsByLine).not.toHaveBeenCalled();
    expect(setLineStatusToDraft).not.toHaveBeenCalled();
  });

  it("does nothing when no candidates are available", async () => {
    mockCandidateFetcher.mockReturnValue([]);

    const { setLineStatusToDraft } = await import("../helpers/allocationStatusHelpers");

    const { result } = renderHook(() =>
      useAutoAllocateHandler({
        allLines: mockLines,
        candidateFetcher: mockCandidateFetcher,
        setAllocationsByLine: mockSetAllocationsByLine,
        setLineStatuses: mockSetLineStatuses,
      }),
    );

    act(() => {
      result.current(101);
    });

    expect(mockSetAllocationsByLine).not.toHaveBeenCalled();
    expect(setLineStatusToDraft).not.toHaveBeenCalled();
  });

  it("calls calculateAutoAllocation with correct parameters", async () => {
    const { calculateAutoAllocation, getAllocatedQuantity, getOrderQuantity } =
      await import("../utils/allocationCalculations");

    const { result } = renderHook(() =>
      useAutoAllocateHandler({
        allLines: mockLines,
        candidateFetcher: mockCandidateFetcher,
        setAllocationsByLine: mockSetAllocationsByLine,
        setLineStatuses: mockSetLineStatuses,
      }),
    );

    act(() => {
      result.current(101);
    });

    expect(getOrderQuantity).toHaveBeenCalled();
    expect(getAllocatedQuantity).toHaveBeenCalled();
    expect(calculateAutoAllocation).toHaveBeenCalledWith({
      requiredQty: 10,
      dbAllocatedQty: 0,
      candidateLots: mockCandidates,
    });
  });

  it("updates allocations state with calculated allocations", async () => {
    const { calculateAutoAllocation } = await import("../utils/allocationCalculations");
    vi.mocked(calculateAutoAllocation).mockReturnValue({ 1: 10 });

    const { result } = renderHook(() =>
      useAutoAllocateHandler({
        allLines: mockLines,
        candidateFetcher: mockCandidateFetcher,
        setAllocationsByLine: mockSetAllocationsByLine,
        setLineStatuses: mockSetLineStatuses,
      }),
    );

    act(() => {
      result.current(101);
    });

    expect(mockSetAllocationsByLine).toHaveBeenCalled();

    // Get the updater function and test it
    const updater = mockSetAllocationsByLine.mock.calls[0]?.[0];
    if (typeof updater === "function") {
      const prevState = { 100: { 5: 3 } };
      const newState = updater(prevState);

      expect(newState).toEqual({
        100: { 5: 3 },
        101: { 1: 10 },
      });
    }
  });

  it("sets line status to draft after allocation", async () => {
    const { setLineStatusToDraft } = await import("../helpers/allocationStatusHelpers");

    const { result } = renderHook(() =>
      useAutoAllocateHandler({
        allLines: mockLines,
        candidateFetcher: mockCandidateFetcher,
        setAllocationsByLine: mockSetAllocationsByLine,
        setLineStatuses: mockSetLineStatuses,
      }),
    );

    act(() => {
      result.current(101);
    });

    expect(setLineStatusToDraft).toHaveBeenCalledWith(101, mockSetLineStatuses);
  });

  it("fetches candidates with correct line and product ID", () => {
    const { result } = renderHook(() =>
      useAutoAllocateHandler({
        allLines: mockLines,
        candidateFetcher: mockCandidateFetcher,
        setAllocationsByLine: mockSetAllocationsByLine,
        setLineStatuses: mockSetLineStatuses,
      }),
    );

    act(() => {
      result.current(101);
    });

    expect(mockCandidateFetcher).toHaveBeenCalledWith(101, 1);
  });
});
