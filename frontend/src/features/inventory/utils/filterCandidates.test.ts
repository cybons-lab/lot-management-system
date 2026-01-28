import { describe, expect, it } from "vitest";

import { getDependentFilterUpdates } from "@/features/inventory/utils/filterCandidates";

const baseFilters = {
  product_group_id: "1",
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
      filters: { ...baseFilters, product_group_id: "99", warehouse_id: "999" },
      options: baseOptions,
    });

    expect(updates).toEqual({ product_group_id: "", warehouse_id: "" });
  });

  it("clears invalid dependent filters on warehouse change", () => {
    const updates = getDependentFilterUpdates({
      lastTouched: "warehouse",
      filters: { product_group_id: "99", supplier_id: "98", warehouse_id: "100" },
      options: baseOptions,
    });

    expect(updates).toEqual({ product_group_id: "", supplier_id: "" });
  });

  // R2 requirement tests: Clear ONLY invalid filters, regardless of lastTouched
  it("does not clear valid product when supplier is changed", () => {
    const updates = getDependentFilterUpdates({
      lastTouched: "supplier",
      filters: baseFilters,
      options: baseOptions,
    });

    // Product remains valid in options, so it should NOT be cleared
    expect(updates).toEqual({});
  });

  it("clears only invalid filters regardless of lastTouched", () => {
    const updates = getDependentFilterUpdates({
      lastTouched: "product", // Touched product, but we check ALL fields
      filters: { product_group_id: "1", supplier_id: "99", warehouse_id: "999" },
      options: baseOptions,
    });

    // Only invalid supplier and warehouse should be cleared
    // Valid product should be preserved
    expect(updates).toEqual({ supplier_id: "", warehouse_id: "" });
  });

  it("preserves all valid filters even with lastTouched set", () => {
    const updates = getDependentFilterUpdates({
      lastTouched: "warehouse",
      filters: baseFilters, // All valid
      options: baseOptions,
    });

    // All filters are valid, none should be cleared
    expect(updates).toEqual({});
  });

  it("clears all invalid filters at once", () => {
    const updates = getDependentFilterUpdates({
      lastTouched: null,
      filters: { product_group_id: "99", supplier_id: "98", warehouse_id: "999" },
      options: baseOptions,
    });

    // All filters are invalid
    expect(updates).toEqual({ product_group_id: "", supplier_id: "", warehouse_id: "" });
  });
});
