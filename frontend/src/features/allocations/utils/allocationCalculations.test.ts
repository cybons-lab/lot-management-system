/**
 * Tests for allocation calculation utility functions
 */
import { describe, it, expect } from "vitest";

import type { CandidateLotItem } from "../api";
import type { LineAllocations } from "../types";

import {
  getOrderQuantity,
  getAllocatedQuantity,
  getFreeQuantity,
  getOrderId,
  calculateAutoAllocation,
  clampAllocationQuantity,
  checkOverAllocation,
  calculateTotalUiAllocated,
  removeZeroAllocations,
  convertAllocationsToPayload,
} from "./allocationCalculations";

import type { OrderLine } from "@/shared/types/aliases";

// Mock data factories
const createMockOrderLine = (overrides: Partial<OrderLine> = {}): OrderLine =>
  ({
    id: 1,
    order_id: 100,
    product_id: 10,
    order_quantity: "100",
    quantity: undefined,
    converted_quantity: undefined,
    allocated_qty: "0",
    allocated_quantity: undefined,
    unit: "KG",
    product_internal_unit: "CAN",
    product_external_unit: "KG",
    product_qty_per_internal_unit: 2.5,
    ...overrides,
  }) as unknown as OrderLine;

const createMockCandidateLot = (overrides: Partial<CandidateLotItem> = {}): CandidateLotItem =>
  ({
    lot_id: 1,
    lot_number: "LOT-001",
    available_quantity: 100,
    free_qty: 100,
    current_quantity: 100,
    allocated_quantity: 0,
    expiry_date: "2030-12-31",
    ...overrides,
  }) as CandidateLotItem;

describe("allocationCalculations", () => {
  describe("getOrderQuantity", () => {
    it("uses converted_quantity if available and valid", () => {
      const line = createMockOrderLine({
        order_quantity: "100",
        converted_quantity: "40",
      });
      expect(getOrderQuantity(line)).toBe(40);
    });

    it("falls back to order_quantity when converted_quantity is empty", () => {
      const line = createMockOrderLine({
        order_quantity: "100",
        converted_quantity: "",
      });
      // Unit conversion: 100 KG / 2.5 = 40 CAN
      expect(getOrderQuantity(line)).toBe(40);
    });

    it("returns raw order_quantity when units match", () => {
      const line = createMockOrderLine({
        order_quantity: "100",
        unit: "CAN",
        product_internal_unit: "CAN",
      });
      expect(getOrderQuantity(line)).toBe(100);
    });

    it("converts quantity when order unit differs from internal unit", () => {
      const line = createMockOrderLine({
        order_quantity: "100",
        unit: "KG",
        product_internal_unit: "CAN",
        product_external_unit: "KG",
        product_qty_per_internal_unit: 2.5,
      });
      // 100 KG → 100 / 2.5 = 40 CAN
      expect(getOrderQuantity(line)).toBe(40);
    });

    it("returns base quantity when unit info is missing", () => {
      const line = createMockOrderLine({
        order_quantity: "50",
        product_internal_unit: undefined,
        product_qty_per_internal_unit: undefined,
      });
      expect(getOrderQuantity(line)).toBe(50);
    });

    it("uses legacy quantity field if order_quantity is missing", () => {
      const line = createMockOrderLine({
        order_quantity: undefined,
        quantity: "75",
        product_internal_unit: undefined,
      });
      expect(getOrderQuantity(line)).toBe(75);
    });
  });

  describe("getAllocatedQuantity", () => {
    it("returns allocated_qty as number", () => {
      const line = createMockOrderLine({ allocated_qty: "25.5" });
      expect(getAllocatedQuantity(line)).toBe(25.5);
    });

    it("prefers allocated_qty over allocated_quantity", () => {
      const line = createMockOrderLine({
        allocated_qty: "30",
        allocated_quantity: "20",
      });
      expect(getAllocatedQuantity(line)).toBe(30);
    });

    it("falls back to allocated_quantity", () => {
      const line = createMockOrderLine({
        allocated_qty: undefined,
        allocated_quantity: "15",
      });
      expect(getAllocatedQuantity(line)).toBe(15);
    });

    it("returns 0 when both are missing", () => {
      const line = createMockOrderLine({
        allocated_qty: undefined,
        allocated_quantity: undefined,
      });
      expect(getAllocatedQuantity(line)).toBe(0);
    });
  });

  describe("getFreeQuantity", () => {
    it("returns available_quantity as number", () => {
      const lot = createMockCandidateLot({ available_quantity: 150.5 });
      expect(getFreeQuantity(lot)).toBe(150.5);
    });

    it("returns 0 when available_quantity is missing", () => {
      const lot = createMockCandidateLot({ available_quantity: undefined });
      expect(getFreeQuantity(lot)).toBe(0);
    });
  });

  describe("getOrderId", () => {
    it("returns order_id when present", () => {
      const line = createMockOrderLine({ order_id: 42 });
      expect(getOrderId(line)).toBe(42);
    });

    it("returns null when order_id is missing", () => {
      const line = createMockOrderLine({ order_id: undefined });
      expect(getOrderId(line)).toBeNull();
    });
  });

  describe("calculateAutoAllocation", () => {
    it("allocates from lots in FEFO order", () => {
      const lots: CandidateLotItem[] = [
        createMockCandidateLot({ lot_id: 1, available_quantity: 50, expiry_date: "2030-06-01" }),
        createMockCandidateLot({ lot_id: 2, available_quantity: 100, expiry_date: "2030-12-31" }),
      ];

      const result = calculateAutoAllocation({
        requiredQty: 80,
        dbAllocatedQty: 0,
        candidateLots: lots,
      });

      expect(result[1]).toBe(50); // First lot fully used
      expect(result[2]).toBe(30); // Second lot partially used
    });

    it("respects already allocated quantity", () => {
      const lots: CandidateLotItem[] = [
        createMockCandidateLot({ lot_id: 1, available_quantity: 100 }),
      ];

      const result = calculateAutoAllocation({
        requiredQty: 50,
        dbAllocatedQty: 30,
        candidateLots: lots,
      });

      expect(result[1]).toBe(20); // Only need 20 more (50 - 30)
    });

    it("skips expired lots", () => {
      const lots: CandidateLotItem[] = [
        createMockCandidateLot({ lot_id: 1, available_quantity: 100, expiry_date: "2020-01-01" }),
        createMockCandidateLot({ lot_id: 2, available_quantity: 50, expiry_date: "2030-12-31" }),
      ];

      const result = calculateAutoAllocation({
        requiredQty: 30,
        dbAllocatedQty: 0,
        candidateLots: lots,
      });

      expect(result[1]).toBeUndefined(); // Expired lot skipped
      expect(result[2]).toBe(30); // Used non-expired lot
    });

    it("returns empty object when no candidates", () => {
      const result = calculateAutoAllocation({
        requiredQty: 100,
        dbAllocatedQty: 0,
        candidateLots: [],
      });

      expect(Object.keys(result)).toHaveLength(0);
    });

    it("returns empty object when already fully allocated", () => {
      const lots: CandidateLotItem[] = [
        createMockCandidateLot({ lot_id: 1, available_quantity: 100 }),
      ];

      const result = calculateAutoAllocation({
        requiredQty: 50,
        dbAllocatedQty: 50,
        candidateLots: lots,
      });

      expect(Object.keys(result)).toHaveLength(0);
    });

    it("handles lots without expiry date", () => {
      const lots: CandidateLotItem[] = [
        createMockCandidateLot({ lot_id: 1, available_quantity: 100, expiry_date: null }),
      ];

      const result = calculateAutoAllocation({
        requiredQty: 50,
        dbAllocatedQty: 0,
        candidateLots: lots,
      });

      expect(result[1]).toBe(50);
    });
  });

  describe("clampAllocationQuantity", () => {
    it("clamps value within range", () => {
      expect(clampAllocationQuantity({ value: 50, maxAllowed: 100 })).toBe(50);
    });

    it("clamps to zero when negative", () => {
      expect(clampAllocationQuantity({ value: -10, maxAllowed: 100 })).toBe(0);
    });

    it("clamps to max when exceeds", () => {
      expect(clampAllocationQuantity({ value: 150, maxAllowed: 100 })).toBe(100);
    });

    it("handles NaN as 0", () => {
      expect(clampAllocationQuantity({ value: NaN, maxAllowed: 100 })).toBe(0);
    });

    it("handles Infinity as maxAllowed", () => {
      expect(clampAllocationQuantity({ value: Infinity, maxAllowed: 100 })).toBe(0);
    });
  });

  describe("checkOverAllocation", () => {
    it("returns false when total is under required", () => {
      expect(
        checkOverAllocation({
          requiredQty: 100,
          dbAllocated: 30,
          uiAllocated: 50,
        }),
      ).toBe(false);
    });

    it("returns false when exactly allocated", () => {
      expect(
        checkOverAllocation({
          requiredQty: 100,
          dbAllocated: 60,
          uiAllocated: 40,
        }),
      ).toBe(false);
    });

    it("returns true when over-allocated", () => {
      expect(
        checkOverAllocation({
          requiredQty: 100,
          dbAllocated: 80,
          uiAllocated: 30,
        }),
      ).toBe(true);
    });
  });

  describe("calculateTotalUiAllocated", () => {
    it("sums all allocation quantities", () => {
      const allocations: LineAllocations = {
        1: 30,
        2: 20,
        3: 50,
      };
      expect(calculateTotalUiAllocated(allocations)).toBe(100);
    });

    it("returns 0 for empty allocations", () => {
      expect(calculateTotalUiAllocated({})).toBe(0);
    });
  });

  describe("removeZeroAllocations", () => {
    it("removes zero and negative quantities", () => {
      const allocations: LineAllocations = {
        1: 30,
        2: 0,
        3: 50,
      };
      const result = removeZeroAllocations(allocations);

      expect(result[1]).toBe(30);
      expect(result[2]).toBeUndefined();
      expect(result[3]).toBe(50);
    });

    it("returns empty object when all are zero", () => {
      const allocations: LineAllocations = { 1: 0, 2: 0 };
      expect(Object.keys(removeZeroAllocations(allocations))).toHaveLength(0);
    });
  });

  describe("convertAllocationsToPayload", () => {
    it("converts allocation map to API payload format", () => {
      const allocations: LineAllocations = {
        1: 30,
        2: 50,
      };
      const result = convertAllocationsToPayload(allocations);

      expect(result).toEqual([
        { lot_id: 1, quantity: 30 },
        { lot_id: 2, quantity: 50 },
      ]);
    });

    it("filters out zero quantities", () => {
      const allocations: LineAllocations = {
        1: 30,
        2: 0,
        3: 50,
      };
      const result = convertAllocationsToPayload(allocations);

      expect(result).toHaveLength(2);
      expect(result.find((a) => a.lot_id === 2)).toBeUndefined();
    });

    it("returns empty array for empty allocations", () => {
      expect(convertAllocationsToPayload({})).toEqual([]);
    });
  });
});
