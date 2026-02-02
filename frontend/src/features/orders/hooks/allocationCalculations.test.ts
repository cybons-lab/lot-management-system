import { describe, it, expect } from "vitest";

import {
  calculateDbAllocationsTotal,
  calculateTotalAllocated,
  checkUnsavedChanges,
  calculateAutoAllocation,
  type Allocation,
} from "./allocationCalculations";

import type { CandidateLotItem } from "@/features/allocations/api";

describe("allocationCalculations", () => {
  describe("calculateDbAllocationsTotal", () => {
    it("should return 0 for empty or undefined allocations", () => {
      expect(calculateDbAllocationsTotal(undefined, "hard")).toBe(0);
      expect(calculateDbAllocationsTotal([], "hard")).toBe(0);
    });

    it("should sum only specified type", () => {
      const allocations: Allocation[] = [
        { lot_id: 1, allocated_quantity: 10, allocation_type: "hard" },
        { lot_id: 2, allocated_quantity: 5, allocation_type: "soft" },
        { lot_id: 3, quantity: 3, allocation_type: "hard" }, // Test 'quantity' fallback
      ];

      expect(calculateDbAllocationsTotal(allocations, "hard")).toBe(13);
      expect(calculateDbAllocationsTotal(allocations, "soft")).toBe(5);
    });
  });

  describe("calculateTotalAllocated", () => {
    it("should sum values in map", () => {
      expect(calculateTotalAllocated({ 1: 10, 2: 5 })).toBe(15);
    });

    it("should return 0 for empty map", () => {
      expect(calculateTotalAllocated({})).toBe(0);
    });
  });

  describe("checkUnsavedChanges", () => {
    it("should return false when both empty", () => {
      expect(checkUnsavedChanges({}, [])).toBe(false);
    });

    it("should return true when totals differ", () => {
      const local = { 1: 10 };
      const db: Allocation[] = [{ lot_id: 1, allocated_quantity: 5, allocation_type: "soft" }];
      // 10 vs 5
      expect(checkUnsavedChanges(local, db)).toBe(true);
    });

    it("should return true when totals same but distribution differs", () => {
      const local = { 1: 10, 2: 0 };
      const db: Allocation[] = [{ lot_id: 2, allocated_quantity: 10, allocation_type: "soft" }];
      // Total 10 vs 10, but lot IDs differ
      expect(checkUnsavedChanges(local, db)).toBe(true);
    });

    it("should return false when matching", () => {
      const local = { 1: 10, 2: 5 };
      const db: Allocation[] = [
        { lot_id: 1, allocated_quantity: 10, allocation_type: "hard" },
        { lot_id: 2, allocated_quantity: 5, allocation_type: "soft" },
      ];
      expect(checkUnsavedChanges(local, db)).toBe(false);
    });
  });

  describe("calculateAutoAllocation", () => {
    const candidates: CandidateLotItem[] = [
      {
        lot_id: 1,
        available_quantity: 10,
        lot_number: "L1",
        product_group_id: 1,
        product_code: "P1",
        warehouse_code: "W1",
        expiry_date: "2025-01-01",
        free_qty: 10,
        current_quantity: 10,
        allocated_quantity: 0,
      },
      {
        lot_id: 2,
        available_quantity: 5,
        lot_number: "L2",
        product_group_id: 1,
        product_code: "P1",
        warehouse_code: "W1",
        expiry_date: "2025-02-01",
        free_qty: 5,
        current_quantity: 5,
        allocated_quantity: 0,
      },
    ];

    it("should distribute quantity completely if available", () => {
      const result = calculateAutoAllocation(12, candidates);
      expect(result).toEqual({ 1: 10, 2: 2 });
    });

    it("should stop when remaining is 0", () => {
      const result = calculateAutoAllocation(5, candidates);
      expect(result).toEqual({ 1: 5 });
    });

    it("should take max available", () => {
      const result = calculateAutoAllocation(20, candidates);
      expect(result).toEqual({ 1: 10, 2: 5 });
    });
  });
});
