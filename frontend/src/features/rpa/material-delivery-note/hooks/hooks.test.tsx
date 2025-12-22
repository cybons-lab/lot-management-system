/**
 * RPA Material Delivery Note Hooks Tests
 *
 * Tests for RPA material delivery note mutations:
 * - useCreateRun: CSV upload and run creation
 * - useUpdateItem: Item update with optimistic updates
 * - useBatchUpdateItems: Batch update items
 * - useExecuteStep2: Step2 execution
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { describe, it, expect, vi, beforeEach } from "vitest";

import * as rpaApi from "../api";

import { useCreateRun, useUpdateItem, useBatchUpdateItems, useExecuteStep2 } from "./index";

// Mock API
vi.mock("../api", () => ({
  createRun: vi.fn(),
  updateItem: vi.fn(),
  batchUpdateItems: vi.fn(),
  executeStep2: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("RPA Material Delivery Note Hooks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}> {children} </QueryClientProvider>
  );

  describe("useCreateRun", () => {
    it("calls createRun API with file", async () => {
      const mockFile = new File(["test"], "test.csv", { type: "text/csv" });
      vi.mocked(rpaApi.createRun).mockResolvedValue({
        run_id: 1,
        message: "CSVを取り込みました",
      });

      const { result } = renderHook(() => useCreateRun(), { wrapper });

      await act(async () => {
        result.current.mutate(mockFile);
      });

      await waitFor(() => {
        expect(rpaApi.createRun).toHaveBeenCalledWith(mockFile);
      });
    });

    it("shows success toast on successful upload", async () => {
      const mockFile = new File(["test"], "test.csv", { type: "text/csv" });
      vi.mocked(rpaApi.createRun).mockResolvedValue({
        run_id: 1,
        message: "CSVを取り込みました",
      });

      const { result } = renderHook(() => useCreateRun(), { wrapper });

      await act(async () => {
        result.current.mutate(mockFile);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("CSVを取り込みました");
      });
    });

    it("shows error toast on failure", async () => {
      const mockFile = new File(["test"], "test.csv", { type: "text/csv" });
      vi.mocked(rpaApi.createRun).mockRejectedValue(new Error("Upload failed"));

      const { result } = renderHook(() => useCreateRun(), { wrapper });

      await act(async () => {
        result.current.mutate(mockFile);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("CSV取込に失敗しました: Upload failed");
      });
    });
  });

  describe("useUpdateItem", () => {
    const runId = 1;

    it("calls updateItem API with correct parameters", async () => {
      vi.mocked(rpaApi.updateItem).mockResolvedValue({
        id: 101,
        issue_flag: true,
      });

      const { result } = renderHook(() => useUpdateItem(runId), { wrapper });

      await act(async () => {
        result.current.mutate({
          itemId: 101,
          data: { issue_flag: true },
        });
      });

      await waitFor(() => {
        expect(rpaApi.updateItem).toHaveBeenCalledWith(runId, 101, { issue_flag: true });
      });
    });

    it("shows error toast on failure", async () => {
      vi.mocked(rpaApi.updateItem).mockRejectedValue(new Error("Update failed"));

      const { result } = renderHook(() => useUpdateItem(runId), { wrapper });

      await act(async () => {
        result.current.mutate({
          itemId: 101,
          data: { issue_flag: true },
        });
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("更新に失敗しました: Update failed");
      });
    });
  });

  describe("useBatchUpdateItems", () => {
    const runId = 1;

    it("calls batchUpdateItems API with correct parameters", async () => {
      vi.mocked(rpaApi.batchUpdateItems).mockResolvedValue({ updated: 2 });

      const { result } = renderHook(() => useBatchUpdateItems(runId), { wrapper });

      await act(async () => {
        result.current.mutate({
          itemIds: [101, 102],
          data: { complete_flag: true },
        });
      });

      await waitFor(() => {
        expect(rpaApi.batchUpdateItems).toHaveBeenCalledWith(runId, [101, 102], {
          complete_flag: true,
        });
      });
    });

    it("shows success toast on successful batch update", async () => {
      vi.mocked(rpaApi.batchUpdateItems).mockResolvedValue({ updated: 2 });

      const { result } = renderHook(() => useBatchUpdateItems(runId), { wrapper });

      await act(async () => {
        result.current.mutate({
          itemIds: [101, 102],
          data: { complete_flag: true },
        });
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("一括更新しました");
      });
    });
  });

  describe("useExecuteStep2", () => {
    const runId = 1;

    it("calls executeStep2 API with correct request", async () => {
      vi.mocked(rpaApi.executeStep2).mockResolvedValue({
        message: "Step2を実行しました",
      });

      const { result } = renderHook(() => useExecuteStep2(runId), { wrapper });

      await act(async () => {
        result.current.mutate({ item_ids: [101, 102] });
      });

      await waitFor(() => {
        expect(rpaApi.executeStep2).toHaveBeenCalledWith(runId, { item_ids: [101, 102] });
      });
    });

    it("shows success toast on successful execution", async () => {
      vi.mocked(rpaApi.executeStep2).mockResolvedValue({
        message: "Step2を実行しました",
      });

      const { result } = renderHook(() => useExecuteStep2(runId), { wrapper });

      await act(async () => {
        result.current.mutate({ item_ids: [101, 102] });
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Step2を実行しました");
      });
    });

    it("shows error toast on failure", async () => {
      vi.mocked(rpaApi.executeStep2).mockRejectedValue(new Error("Execution failed"));

      const { result } = renderHook(() => useExecuteStep2(runId), { wrapper });

      await act(async () => {
        result.current.mutate({ item_ids: [101, 102] });
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Step2実行に失敗しました: Execution failed");
      });
    });
  });
});
