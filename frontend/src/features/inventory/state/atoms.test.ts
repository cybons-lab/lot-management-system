import { describe, expect, it } from "vitest";

import type { LotTableSettings } from "@/features/inventory/state";
import {
  calculateInventoryKpi,
  filterLotsBySearchTerm,
  sortLots,
} from "@/features/inventory/state/atoms";
import type { LotUI } from "@/shared/libs/normalize";

const createLot = (overrides: Partial<LotUI>): LotUI => ({
  id: overrides.id ?? 1,
  lot_id: overrides.lot_id ?? overrides.id ?? 1,
  lot_number: overrides.lot_number ?? "LOT-001",
  supplier_item_id: overrides.supplier_item_id ?? 1,
  warehouse_id: overrides.warehouse_id ?? 1,
  supplier_id: overrides.supplier_id ?? 1,
  received_date: overrides.received_date ?? "2024-01-01",
  expiry_date: overrides.expiry_date ?? "2025-01-01",
  current_quantity: overrides.current_quantity ?? "10",
  allocated_quantity: overrides.allocated_quantity ?? "0",
  unit: overrides.unit ?? "kg",
  status: overrides.status ?? "active",
  expected_lot_id: overrides.expected_lot_id ?? null,
  created_at: overrides.created_at ?? "2024-01-01",
  updated_at: overrides.updated_at ?? "2024-01-01",
  inspection_status: overrides.inspection_status ?? "ok",
  inspection_date: overrides.inspection_date ?? null,
  inspection_cert_number: overrides.inspection_cert_number ?? null,
  origin_type: overrides.origin_type ?? "adhoc",
  origin_reference: overrides.origin_reference ?? null,
  shipping_date: overrides.shipping_date ?? null,
  cost_price: overrides.cost_price ?? null,
  sales_price: overrides.sales_price ?? null,
  tax_rate: overrides.tax_rate ?? null,
  product_code: overrides.product_code ?? "P-001",
  product_name: overrides.product_name ?? "Widget",
  supplier_name: overrides.supplier_name ?? "Supplier A",
  supplier_code: overrides.supplier_code ?? "SUP-A",
  warehouse_code: overrides.warehouse_code ?? "WH-1",
  maker_part_no: overrides.maker_part_no ?? null,
  customer_part_no: overrides.customer_part_no ?? null,
});

describe("inventory lot derived logic", () => {
  it("filters lots by search term across lot number/product fields", () => {
    const lots = [
      createLot({ id: 1, lot_number: "LOT-ABC", product_code: "ABC-001" }),
      createLot({ id: 2, lot_number: "LOT-XYZ", product_name: "Gadget" }),
    ];

    const result = filterLotsBySearchTerm(lots, "abc");

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(1);
  });

  it("sorts lots with the same behavior as existing table settings", () => {
    const lots = [
      createLot({ id: 1, supplier_item_id: 1 }),
      createLot({ id: 2, supplier_item_id: 2 }),
    ];
    const tableSettings: LotTableSettings = {
      sortColumn: "supplier_item_id",
      sortDirection: "desc",
    };

    const result = sortLots(lots, tableSettings);

    expect(result.map((lot) => lot.supplier_item_id)).toEqual([2, 1]);
  });

  it("calculates KPI totals based on filtered lots", () => {
    const lots = [
      createLot({ id: 1, current_quantity: "10", supplier_code: "SUP-A" }),
      createLot({ id: 2, current_quantity: "5", supplier_code: "SUP-B" }),
    ];

    const kpi = calculateInventoryKpi(lots);

    expect(kpi.totalLots).toBe(2);
    expect(kpi.totalCurrentQuantity).toBe(15);
    expect(kpi.totalGroups).toBe(2);
  });
});
