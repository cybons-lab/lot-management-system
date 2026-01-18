import { describe, expect, it } from "vitest";

import { getDependentFilterUpdates } from "@/features/inventory/utils/filterCandidates";

const baseFilters = {
  product_id: "1",
  supplier_id: "10",
  warehouse_id: "100",
};

const baseOptions = {
  productOptions: [
    { value: "1", label: "Product 1" },
    { value: "2", label: "Product 2" },
  ],
  supplierOptions: [
    { value: "10", label: "Supplier 10" },
    { value: "11", label: "Supplier 11" },
  ],
  warehouseOptions: [{ value: "100", label: "Warehouse 100" }],
};

describe("getDependentFilterUpdates", () => {
  it("keeps product selection when supplier options are still valid", () => {
    const updates = getDependentFilterUpdates({
      lastTouched: "product",
      filters: baseFilters,
      options: baseOptions,
    });

    expect(updates).toEqual({});
  });

  it("clears supplier and warehouse when product change invalidates them", () => {
    const updates = getDependentFilterUpdates({
      lastTouched: "product",
      filters: { ...baseFilters, supplier_id: "99", warehouse_id: "999" },
      options: {
        ...baseOptions,
        warehouseOptions: [{ value: "100", label: "Warehouse 100" }],
      },
    });

    expect(updates).toEqual({ supplier_id: "", warehouse_id: "" });
  });

  it("keeps supplier when product remains valid after supplier change", () => {
    const updates = getDependentFilterUpdates({
      lastTouched: "supplier",
      filters: baseFilters,
      options: baseOptions,
    });

    expect(updates).toEqual({});
  });

  it("clears product when supplier change invalidates it", () => {
    const updates = getDependentFilterUpdates({
      lastTouched: "supplier",
      filters: { ...baseFilters, product_id: "99", warehouse_id: "999" },
      options: baseOptions,
    });

    expect(updates).toEqual({ product_id: "", warehouse_id: "" });
  });

  it("clears invalid dependent filters on warehouse change", () => {
    const updates = getDependentFilterUpdates({
      lastTouched: "warehouse",
      filters: { product_id: "99", supplier_id: "98", warehouse_id: "100" },
      options: baseOptions,
    });

    expect(updates).toEqual({ product_id: "", supplier_id: "" });
  });
});
