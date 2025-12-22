/**
 * useWarehouseMutations Hook Tests
 *
 * Tests for warehouse CRUD mutations:
 * - Create: API call and cache invalidation
 * - Update: API call with correct payload
 * - Delete: API call with warehouse code
 * - Bulk Upsert: API call with row data
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import * as warehouseApi from "../api";

import {
  useCreateWarehouse,
  useUpdateWarehouse,
  useDeleteWarehouse,
  useBulkUpsertWarehouses,
} from "./useWarehouseMutations";

// Mock API
vi.mock("../api", () => ({
  createWarehouse: vi.fn(),
  updateWarehouse: vi.fn(),
  deleteWarehouse: vi.fn(),
  bulkUpsertWarehouses: vi.fn(),
}));

describe("useWarehouseMutations", () => {
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

  describe("useCreateWarehouse", () => {
    const mockCreateData = {
      warehouse_code: "WH-001",
      warehouse_name: "東京倉庫",
      warehouse_type: "internal" as const,
    };

    it("calls createWarehouse API with correct data", async () => {
      vi.mocked(warehouseApi.createWarehouse).mockResolvedValue({
        warehouse_code: "WH-001",
        warehouse_name: "東京倉庫",
        warehouse_type: "internal",
      });

      const { result } = renderHook(() => useCreateWarehouse(), { wrapper });

      await act(async () => {
        result.current.mutate(mockCreateData);
      });

      await waitFor(() => {
        expect(warehouseApi.createWarehouse).toHaveBeenCalledWith(mockCreateData);
      });
    });

    it("invalidates warehouses query on success", async () => {
      vi.mocked(warehouseApi.createWarehouse).mockResolvedValue({
        warehouse_code: "WH-001",
        warehouse_name: "東京倉庫",
        warehouse_type: "internal",
      });

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreateWarehouse(), { wrapper });

      await act(async () => {
        result.current.mutate(mockCreateData);
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["warehouses"] });
      });
    });
  });

  describe("useUpdateWarehouse", () => {
    const mockUpdateData = {
      warehouseCode: "WH-001",
      data: {
        warehouse_name: "東京第一倉庫",
        warehouse_type: "internal" as const,
      },
    };

    it("calls updateWarehouse API with correct parameters", async () => {
      vi.mocked(warehouseApi.updateWarehouse).mockResolvedValue({
        warehouse_code: "WH-001",
        warehouse_name: "東京第一倉庫",
        warehouse_type: "internal",
      });

      const { result } = renderHook(() => useUpdateWarehouse(), { wrapper });

      await act(async () => {
        result.current.mutate(mockUpdateData);
      });

      await waitFor(() => {
        expect(warehouseApi.updateWarehouse).toHaveBeenCalledWith("WH-001", mockUpdateData.data);
      });
    });

    it("invalidates warehouses query on success", async () => {
      vi.mocked(warehouseApi.updateWarehouse).mockResolvedValue({
        warehouse_code: "WH-001",
        warehouse_name: "東京第一倉庫",
        warehouse_type: "internal",
      });

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useUpdateWarehouse(), { wrapper });

      await act(async () => {
        result.current.mutate(mockUpdateData);
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["warehouses"] });
      });
    });
  });

  describe("useDeleteWarehouse", () => {
    it("calls deleteWarehouse API with warehouse code", async () => {
      vi.mocked(warehouseApi.deleteWarehouse).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteWarehouse(), { wrapper });

      await act(async () => {
        result.current.mutate("WH-001");
      });

      await waitFor(() => {
        expect(warehouseApi.deleteWarehouse).toHaveBeenCalledWith("WH-001");
      });
    });

    it("invalidates warehouses query on success", async () => {
      vi.mocked(warehouseApi.deleteWarehouse).mockResolvedValue(undefined);

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useDeleteWarehouse(), { wrapper });

      await act(async () => {
        result.current.mutate("WH-001");
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["warehouses"] });
      });
    });
  });

  describe("useBulkUpsertWarehouses", () => {
    const mockRows = [
      {
        warehouse_code: "WH-001",
        warehouse_name: "東京倉庫",
        warehouse_type: "internal" as const,
      },
      {
        warehouse_code: "WH-002",
        warehouse_name: "大阪倉庫",
        warehouse_type: "external" as const,
      },
    ];

    it("calls bulkUpsertWarehouses API with row data", async () => {
      vi.mocked(warehouseApi.bulkUpsertWarehouses).mockResolvedValue({
        created: 2,
        updated: 0,
        errors: [],
      });

      const { result } = renderHook(() => useBulkUpsertWarehouses(), { wrapper });

      await act(async () => {
        result.current.mutate(mockRows);
      });

      await waitFor(() => {
        expect(warehouseApi.bulkUpsertWarehouses).toHaveBeenCalledWith(mockRows);
      });
    });

    it("invalidates warehouses query on success", async () => {
      vi.mocked(warehouseApi.bulkUpsertWarehouses).mockResolvedValue({
        created: 2,
        updated: 0,
        errors: [],
      });

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useBulkUpsertWarehouses(), { wrapper });

      await act(async () => {
        result.current.mutate(mockRows);
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["warehouses"] });
      });
    });
  });
});
