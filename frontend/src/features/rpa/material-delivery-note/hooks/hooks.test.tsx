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
import type { RpaRunCreateResponse, RpaRunItem, RpaRun, Step2ExecuteResponse } from "../api";

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

// Helper to create mock RpaRunItem
const createMockItem = (overrides: Partial<RpaRunItem> = {}): RpaRunItem => ({
  id: 101,
  row_no: 1,
  status: "pending",
  jiku_code: "JIKU001",
  layer_code: "LAYER001",
  external_product_code: "EXT001",
  delivery_date: "2024-01-15",
  delivery_quantity: 100,
  shipping_vehicle: null,
  issue_flag: false,
  complete_flag: false,
  match_result: null,
  sap_registered: null,
  order_no: null,
  maker_name: null,
  result_status: null,
  lock_flag: false,
  item_no: null,
  lot_no: null,
  ...overrides,
});

// Helper to create mock RpaRun
const createMockRun = (overrides: Partial<RpaRun> = {}): RpaRun => ({
  id: 1,
  rpa_type: "material_delivery_note",
  status: "started",
  started_at: "2024-01-01T00:00:00Z",
  started_by_user_id: 1,
  started_by_username: "test_user",
  step2_executed_at: null,
  step2_executed_by_user_id: null,
  step2_executed_by_username: null,
  external_done_at: null,
  external_done_by_username: null,
  step4_executed_at: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  item_count: 10,
  complete_count: 0,
  issue_count: 0,
  all_items_complete: false,
  items: [createMockItem()],
  ...overrides,
});

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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("useCreateRun", () => {
    const mockResponse: RpaRunCreateResponse = {
      id: 1,
      status: "started",
      item_count: 10,
      message: "CSVを取り込みました",
    };

    it("calls createRun API with file", async () => {
      const mockFile = new File(["test"], "test.csv", { type: "text/csv" });
      vi.mocked(rpaApi.createRun).mockResolvedValue(mockResponse);

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
      vi.mocked(rpaApi.createRun).mockResolvedValue(mockResponse);

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
      vi.mocked(rpaApi.updateItem).mockResolvedValue(createMockItem({ issue_flag: true }));

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
      vi.mocked(rpaApi.batchUpdateItems).mockResolvedValue(createMockRun());

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
      vi.mocked(rpaApi.batchUpdateItems).mockResolvedValue(createMockRun());

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
    const mockResponse: Step2ExecuteResponse = {
      status: "success",
      message: "Step2を実行しました",
      executed_at: "2024-01-01T00:00:00Z",
      flow_response: null,
    };

    it("calls executeStep2 API with correct request", async () => {
      vi.mocked(rpaApi.executeStep2).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useExecuteStep2(runId), { wrapper });

      await act(async () => {
        result.current.mutate({ start_date: "2024-01-01", end_date: "2024-01-31" });
      });

      await waitFor(() => {
        expect(rpaApi.executeStep2).toHaveBeenCalledWith(runId, {
          start_date: "2024-01-01",
          end_date: "2024-01-31",
        });
      });
    });

    it("shows success toast on successful execution", async () => {
      vi.mocked(rpaApi.executeStep2).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useExecuteStep2(runId), { wrapper });

      await act(async () => {
        result.current.mutate({ start_date: "2024-01-01", end_date: "2024-01-31" });
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Step2を実行しました");
      });
    });

    it("shows error toast on failure", async () => {
      vi.mocked(rpaApi.executeStep2).mockRejectedValue(new Error("Execution failed"));

      const { result } = renderHook(() => useExecuteStep2(runId), { wrapper });

      await act(async () => {
        result.current.mutate({ start_date: "2024-01-01", end_date: "2024-01-31" });
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Step2実行に失敗しました: Execution failed");
      });
    });
  });
});
