// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getFilterOptions } from "@/features/inventory/api";
import { useFilterOptions } from "@/features/inventory/hooks/useFilterOptions";

vi.mock("@/features/inventory/api", () => ({
  getFilterOptions: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useFilterOptions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  it("auto-selects supplier only when one candidate remains", async () => {
    const onAutoSelectSupplier = vi.fn();
    vi.mocked(getFilterOptions).mockResolvedValueOnce({
      products: [],
      suppliers: [{ id: 10, code: "SUP-10", name: "Supplier 10" }],
      warehouses: [],
    });

    renderHook(
      () =>
        useFilterOptions({
          product_id: "1",
          onAutoSelectSupplier,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(onAutoSelectSupplier).toHaveBeenCalledTimes(1);
      expect(onAutoSelectSupplier).toHaveBeenCalledWith("10");
    });
  });

  it("does not auto-select when multiple suppliers remain", async () => {
    const onAutoSelectSupplier = vi.fn();
    vi.mocked(getFilterOptions).mockResolvedValueOnce({
      products: [],
      suppliers: [
        { id: 10, code: "SUP-10", name: "Supplier 10" },
        { id: 11, code: "SUP-11", name: "Supplier 11" },
      ],
      warehouses: [],
    });

    renderHook(
      () =>
        useFilterOptions({
          product_id: "1",
          onAutoSelectSupplier,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(onAutoSelectSupplier).not.toHaveBeenCalled();
    });
  });

  it("auto-selects product only when one candidate remains", async () => {
    const onAutoSelectProduct = vi.fn();
    vi.mocked(getFilterOptions).mockResolvedValueOnce({
      products: [{ id: 20, code: "PRD-20", name: "Product 20" }],
      suppliers: [],
      warehouses: [],
    });

    renderHook(
      () =>
        useFilterOptions({
          supplier_id: "10",
          onAutoSelectProduct,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(onAutoSelectProduct).toHaveBeenCalledTimes(1);
      expect(onAutoSelectProduct).toHaveBeenCalledWith("20");
    });
  });
});
