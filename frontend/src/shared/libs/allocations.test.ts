/**
 * Tests for allocations utility functions
 */
import { describe, it, expect } from "vitest";

import { coerceAllocatedLots } from "./allocations";

describe("coerceAllocatedLots", () => {
  describe("basic conversion", () => {
    it("converts valid allocation array", () => {
      const input = [
        {
          lot_id: 1,
          allocated_quantity: "100.000",
          delivery_place_code: "DP-001",
          delivery_place_name: "配送先1",
        },
      ];

      const result = coerceAllocatedLots(input);

      expect(result).toHaveLength(1);
      expect(result[0].lot_id).toBe(1);
      expect(result[0].allocated_quantity).toBe("100.000");
      expect(result[0].allocated_qty).toBe(100);
      expect(result[0].delivery_place_code).toBe("DP-001");
      expect(result[0].delivery_place_name).toBe("配送先1");
    });

    it("handles multiple allocations", () => {
      const input = [
        { lot_id: 1, allocated_quantity: "50.000" },
        { lot_id: 2, allocated_quantity: "75.000" },
      ];

      const result = coerceAllocatedLots(
        input as unknown as Parameters<typeof coerceAllocatedLots>[0],
      );

      expect(result).toHaveLength(2);
      expect(result[0].lot_id).toBe(1);
      expect(result[1].lot_id).toBe(2);
    });
  });

  describe("quantity field handling", () => {
    it("prefers allocated_quantity over allocated_qty", () => {
      const input = [
        {
          lot_id: 1,
          allocated_quantity: "100.500",
          allocated_qty: 50,
        },
      ];

      const result = coerceAllocatedLots(
        input as unknown as Parameters<typeof coerceAllocatedLots>[0],
      );

      expect(result[0].allocated_quantity).toBe("100.500");
      expect(result[0].allocated_qty).toBe(100.5);
    });

    it("falls back to allocated_qty when allocated_quantity is missing", () => {
      const input = [
        {
          lot_id: 1,
          allocated_qty: 75.5,
        },
      ];

      const result = coerceAllocatedLots(
        input as unknown as Parameters<typeof coerceAllocatedLots>[0],
      );

      expect(result[0].allocated_quantity).toBe(75.5);
      expect(result[0].allocated_qty).toBe(75.5);
    });

    it("defaults to 0 when both are missing", () => {
      const input = [
        {
          lot_id: 1,
        },
      ];

      const result = coerceAllocatedLots(
        input as unknown as Parameters<typeof coerceAllocatedLots>[0],
      );

      expect(result[0].allocated_quantity).toBe("0");
      expect(result[0].allocated_qty).toBe(0);
    });
  });

  describe("null/undefined handling", () => {
    it("returns empty array for null", () => {
      expect(coerceAllocatedLots(null)).toEqual([]);
    });

    it("returns empty array for undefined", () => {
      expect(coerceAllocatedLots(undefined)).toEqual([]);
    });

    it("returns empty array for non-array input", () => {
      expect(
        coerceAllocatedLots("not an array" as unknown as Parameters<typeof coerceAllocatedLots>[0]),
      ).toEqual([]);
    });
  });

  describe("filtering invalid entries", () => {
    it("skips entries without lot_id", () => {
      const input = [
        { lot_id: 1, allocated_quantity: "100" },
        { allocated_quantity: "50" }, // No lot_id
        { lot_id: 2, allocated_quantity: "75" },
      ];

      const result = coerceAllocatedLots(
        input as unknown as Parameters<typeof coerceAllocatedLots>[0],
      );

      expect(result).toHaveLength(2);
      expect(result[0].lot_id).toBe(1);
      expect(result[1].lot_id).toBe(2);
    });

    it("skips null entries", () => {
      const input = [
        { lot_id: 1, allocated_quantity: "100" },
        null,
        { lot_id: 2, allocated_quantity: "75" },
      ];

      const result = coerceAllocatedLots(
        input as unknown as Parameters<typeof coerceAllocatedLots>[0],
      );

      expect(result).toHaveLength(2);
    });

    it("skips entries with non-numeric lot_id", () => {
      const input = [
        { lot_id: 1, allocated_quantity: "100" },
        { lot_id: "abc", allocated_quantity: "50" },
        { lot_id: 2, allocated_quantity: "75" },
      ];

      const result = coerceAllocatedLots(
        input as unknown as Parameters<typeof coerceAllocatedLots>[0],
      );

      expect(result).toHaveLength(2);
    });
  });

  describe("delivery place fields", () => {
    it("includes delivery place code and name when present", () => {
      const input = [
        {
          lot_id: 1,
          allocated_quantity: "100",
          delivery_place_code: "WH-001",
          delivery_place_name: "倉庫1",
        },
      ];

      const result = coerceAllocatedLots(input);

      expect(result[0].delivery_place_code).toBe("WH-001");
      expect(result[0].delivery_place_name).toBe("倉庫1");
    });

    it("defaults to null when delivery place is missing", () => {
      const input = [
        {
          lot_id: 1,
          allocated_quantity: "100",
        },
      ];

      const result = coerceAllocatedLots(
        input as unknown as Parameters<typeof coerceAllocatedLots>[0],
      );

      expect(result[0].delivery_place_code).toBeNull();
      expect(result[0].delivery_place_name).toBeNull();
    });
  });

  describe("allocation_id preservation", () => {
    it("preserves allocation_id when present", () => {
      const input = [
        {
          allocation_id: 999,
          lot_id: 1,
          allocated_quantity: "100",
        },
      ];

      const result = coerceAllocatedLots(
        input as unknown as Parameters<typeof coerceAllocatedLots>[0],
      );

      expect(result[0].allocation_id).toBe(999);
    });

    it("allocation_id is undefined when not present", () => {
      const input = [
        {
          lot_id: 1,
          allocated_quantity: "100",
        },
      ];

      const result = coerceAllocatedLots(
        input as unknown as Parameters<typeof coerceAllocatedLots>[0],
      );

      expect(result[0].allocation_id).toBeUndefined();
    });
  });
});
