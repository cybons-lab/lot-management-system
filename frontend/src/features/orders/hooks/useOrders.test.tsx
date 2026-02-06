import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useOrdersList, useOrderDetail, useUpdateOrderStatus } from "./useOrders";

import * as ordersApi from "@/features/orders/api";

// Mock API
vi.mock("@/features/orders/api", () => ({
  getOrders: vi.fn(),
  getOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

describe("useOrders Hooks", () => {
  let queryClient: QueryClient;

  const mockOrderResponse = {
    id: 1,
    customer_order_no: "ORD-001",
    customer_id: 10,
    customer_name: "Test Customer",
    order_date: "2025-01-01",
    status: "pending",
    remarks: "Test Remark",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    lines: [
      {
        id: 101,
        order_id: 1,
        supplier_item_id: 20,
        product_name: "Test Product",
        order_quantity: "10.000",
        unit: "EA",
        delivery_date: "2025-01-10",
        delivery_place_id: 30,
        status: "pending",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        allocated_quantity: "0.000",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("useOrdersList", () => {
    it("fetches and normalizes orders list", async () => {
      vi.mocked(ordersApi.getOrders).mockResolvedValue([mockOrderResponse] as unknown as Awaited<
        ReturnType<typeof ordersApi.getOrders>
      >);

      const { result } = renderHook(() => useOrdersList({}), { wrapper });

      // Wait for the query to resolve
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toHaveLength(1);
      });

      expect(ordersApi.getOrders).toHaveBeenCalledWith({});
      expect(result.current.data![0]).toMatchObject({
        id: 1,
        order_code: "ORD-001",
        customer_name: "Test Customer",
        lines: expect.arrayContaining([
          expect.objectContaining({
            id: 101,
            product_name: "Test Product",
          }),
        ]),
      });
    });
  });

  describe("useOrderDetail", () => {
    it("fetches and normalizes order detail", async () => {
      vi.mocked(ordersApi.getOrder).mockResolvedValue(
        mockOrderResponse as unknown as Awaited<ReturnType<typeof ordersApi.getOrder>>,
      );

      const { result } = renderHook(() => useOrderDetail(1), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(ordersApi.getOrder).toHaveBeenCalledWith(1);
      expect(result.current.data).toMatchObject({
        id: 1,
        order_code: "ORD-001",
        customer_name: "Test Customer",
      });
    });

    it("does not fetch if orderId is missing", () => {
      const { result } = renderHook(() => useOrderDetail(undefined), { wrapper });

      expect(result.current.isFetching).toBe(false);
      expect(ordersApi.getOrder).not.toHaveBeenCalled();
    });
  });

  describe("useUpdateOrderStatus", () => {
    it("updates status and invalidates queries", async () => {
      vi.mocked(ordersApi.updateOrderStatus).mockResolvedValue({
        success: true,
      } as unknown as Awaited<ReturnType<typeof ordersApi.updateOrderStatus>>);
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useUpdateOrderStatus(1), { wrapper });

      await result.current.mutateAsync("completed");

      expect(ordersApi.updateOrderStatus).toHaveBeenCalledWith(1, "completed");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["orders", "detail", 1] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["orders"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["order", "1"] });
    });
  });
});
