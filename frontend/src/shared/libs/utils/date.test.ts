/**
 * Tests for date utility functions (shared/libs/utils/date.ts)
 */
import { describe, it, expect } from "vitest";

import { isValidDate, formatYmd, diffDays } from "./date";

describe("date utilities (libs)", () => {
  describe("isValidDate", () => {
    it("returns true for valid date string", () => {
      expect(isValidDate("2025-01-15")).toBe(true);
      expect(isValidDate("2025/01/15")).toBe(true);
      expect(isValidDate("January 15, 2025")).toBe(true);
    });

    it("returns true for Date object", () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date("2025-01-15"))).toBe(true);
    });

    it("returns false for invalid date string", () => {
      expect(isValidDate("invalid")).toBe(false);
      expect(isValidDate("not-a-date")).toBe(false);
    });

    it("returns false for null/undefined/empty", () => {
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
      expect(isValidDate("")).toBe(false);
    });

    it("returns false for invalid Date object", () => {
      expect(isValidDate(new Date("invalid"))).toBe(false);
    });
  });

  describe("formatYmd", () => {
    it("formats date string to YYYY-MM-DD", () => {
      expect(formatYmd("2025-01-15")).toBe("2025-01-15");
      expect(formatYmd("2025/01/15")).toBe("2025-01-15");
    });

    it("formats Date object to YYYY-MM-DD", () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      expect(formatYmd(date)).toBe("2025-01-15");
    });

    it("pads single-digit month and day", () => {
      const date = new Date(2025, 0, 5); // January 5, 2025
      expect(formatYmd(date)).toBe("2025-01-05");
    });

    it("returns empty string for null/undefined", () => {
      expect(formatYmd(null)).toBe("");
      expect(formatYmd(undefined)).toBe("");
    });

    it("returns empty string for empty string", () => {
      expect(formatYmd("")).toBe("");
    });

    it("returns empty string for invalid date", () => {
      expect(formatYmd("invalid")).toBe("");
    });
  });

  describe("diffDays", () => {
    it("calculates positive difference correctly", () => {
      expect(diffDays("2025-01-15", "2025-01-10")).toBe(5);
      expect(diffDays("2025-02-01", "2025-01-01")).toBe(31);
    });

    it("calculates negative difference correctly", () => {
      expect(diffDays("2025-01-10", "2025-01-15")).toBe(-5);
    });

    it("returns zero for same date", () => {
      expect(diffDays("2025-01-15", "2025-01-15")).toBe(0);
    });

    it("works with Date objects", () => {
      const date1 = new Date(2025, 0, 15);
      const date2 = new Date(2025, 0, 10);
      expect(diffDays(date1, date2)).toBe(5);
    });

    it("works with mixed string and Date", () => {
      const date1 = new Date("2025-01-15T00:00:00");
      const date2 = new Date("2025-01-10T00:00:00");
      expect(diffDays(date1, date2)).toBe(5);
    });

    it("handles month boundaries", () => {
      expect(diffDays("2025-02-01", "2025-01-31")).toBe(1);
    });

    it("handles year boundaries", () => {
      expect(diffDays("2026-01-01", "2025-12-31")).toBe(1);
    });

    it("floors fractional days", () => {
      // 36 hours = 1.5 days, should floor to 1
      const date1 = new Date("2025-01-15T12:00:00");
      const date2 = new Date("2025-01-14T00:00:00");
      expect(diffDays(date1, date2)).toBe(1);
    });
  });
});
