/**
 * Tests for aggregation-utils utility functions
 */
import { describe, it, expect } from "vitest";

import type { AggregationMonth } from "../types";

import {
  calculateDekadAggregations,
  calculateMonthlyAggregation,
  calculateDailyTotal,
} from "./aggregation-utils";

describe("aggregation-utils", () => {
  describe("calculateDekadAggregations", () => {
    it("correctly aggregates by dekad (旬)", () => {
      const dailyData = new Map<string, number>([
        // First dekad (上旬): 1-10
        ["2025-06-01", 10],
        ["2025-06-05", 20],
        ["2025-06-10", 30],
        // Second dekad (中旬): 11-20
        ["2025-06-15", 40],
        ["2025-06-20", 50],
        // Third dekad (下旬): 21-end
        ["2025-06-25", 60],
        ["2025-06-30", 70],
      ]);

      const dekadMonth: AggregationMonth = { year: 2025, month: 5 }; // June (0-indexed)

      const result = calculateDekadAggregations(dailyData, dekadMonth);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ label: "6月 上旬", total: 60 }); // 10+20+30
      expect(result[1]).toEqual({ label: "6月 中旬", total: 90 }); // 40+50
      expect(result[2]).toEqual({ label: "6月 下旬", total: 130 }); // 60+70
    });

    it("returns empty array for null dekadMonth", () => {
      const dailyData = new Map<string, number>([["2025-06-01", 100]]);

      const result = calculateDekadAggregations(dailyData, null);

      expect(result).toEqual([]);
    });

    it("ignores dates from other months", () => {
      const dailyData = new Map<string, number>([
        ["2025-06-01", 100],
        ["2025-07-01", 200], // Different month
      ]);

      const dekadMonth: AggregationMonth = { year: 2025, month: 5 };

      const result = calculateDekadAggregations(dailyData, dekadMonth);

      expect(result[0].total).toBe(100);
      expect(result[1].total).toBe(0);
      expect(result[2].total).toBe(0);
    });

    it("rounds totals to integers", () => {
      const dailyData = new Map<string, number>([
        ["2025-06-01", 10.4],
        ["2025-06-02", 10.4],
        ["2025-06-03", 10.4],
      ]);

      const dekadMonth: AggregationMonth = { year: 2025, month: 5 };

      const result = calculateDekadAggregations(dailyData, dekadMonth);

      expect(result[0].total).toBe(31); // Rounded
    });

    it("handles empty dailyData", () => {
      const dailyData = new Map<string, number>();
      const dekadMonth: AggregationMonth = { year: 2025, month: 5 };

      const result = calculateDekadAggregations(dailyData, dekadMonth);

      expect(result[0].total).toBe(0);
      expect(result[1].total).toBe(0);
      expect(result[2].total).toBe(0);
    });
  });

  describe("calculateMonthlyAggregation", () => {
    it("sums all quantities for the month", () => {
      const dailyData = new Map<string, number>([
        ["2025-06-01", 100],
        ["2025-06-15", 200],
        ["2025-06-30", 300],
      ]);

      const monthlyMonth: AggregationMonth = { year: 2025, month: 5 };

      const result = calculateMonthlyAggregation(dailyData, monthlyMonth);

      expect(result).toEqual({
        label: "2025年6月",
        total: 600,
      });
    });

    it("returns null for null monthlyMonth", () => {
      const dailyData = new Map<string, number>([["2025-06-01", 100]]);

      const result = calculateMonthlyAggregation(dailyData, null);

      expect(result).toBeNull();
    });

    it("ignores dates from other months", () => {
      const dailyData = new Map<string, number>([
        ["2025-06-01", 100],
        ["2025-07-01", 200], // Different month
        ["2024-06-01", 300], // Different year
      ]);

      const monthlyMonth: AggregationMonth = { year: 2025, month: 5 };

      const result = calculateMonthlyAggregation(dailyData, monthlyMonth);

      expect(result?.total).toBe(100);
    });

    it("rounds totals to integers", () => {
      const dailyData = new Map<string, number>([
        ["2025-06-01", 33.33],
        ["2025-06-02", 33.33],
        ["2025-06-03", 33.33],
      ]);

      const monthlyMonth: AggregationMonth = { year: 2025, month: 5 };

      const result = calculateMonthlyAggregation(dailyData, monthlyMonth);

      expect(result?.total).toBe(100); // Rounded
    });
  });

  describe("calculateDailyTotal", () => {
    it("sums quantities for all given dates", () => {
      // Note: calculateDailyTotal uses toISOString which is UTC-based
      const dates = [
        new Date("2025-06-01T12:00:00Z"),
        new Date("2025-06-02T12:00:00Z"),
        new Date("2025-06-03T12:00:00Z"),
      ];
      const dailyData = new Map<string, number>([
        ["2025-06-01", 10],
        ["2025-06-02", 20],
        ["2025-06-03", 30],
      ]);

      const result = calculateDailyTotal(dates, dailyData);

      expect(result).toBe(60);
    });

    it("returns 0 for dates not in dailyData", () => {
      const dailyData = new Map<string, number>([["2025-06-01", 100]]);
      const dates = [new Date("2025-06-05T12:00:00Z"), new Date("2025-06-10T12:00:00Z")];

      const result = calculateDailyTotal(dates, dailyData);

      expect(result).toBe(0);
    });

    it("returns 0 for empty dates array", () => {
      const dailyData = new Map<string, number>([["2025-06-01", 100]]);

      const result = calculateDailyTotal([], dailyData);

      expect(result).toBe(0);
    });

    it("rounds the total", () => {
      // Note: calculateDailyTotal uses toISOString which is UTC-based
      // Using UTC dates to avoid timezone issues
      const date1 = new Date("2025-06-01T12:00:00Z");
      const date2 = new Date("2025-06-02T12:00:00Z");
      const dailyData = new Map<string, number>([
        ["2025-06-01", 10.5],
        ["2025-06-02", 10.5],
      ]);

      const dates = [date1, date2];

      const result = calculateDailyTotal(dates, dailyData);

      expect(result).toBe(21); // Rounded
    });

    it("handles NaN and invalid quantities", () => {
      const dates = [new Date("2025-06-01T12:00:00Z"), new Date("2025-06-02T12:00:00Z")];
      const dailyData = new Map<string, number>([
        ["2025-06-01", 100],
        ["2025-06-02", NaN],
      ]);

      const result = calculateDailyTotal(dates, dailyData);

      expect(result).toBe(100); // NaN is skipped
    });
  });
});
