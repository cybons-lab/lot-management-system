/**
 * Tests for date-utils utility functions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  getDatesForMonth,
  formatDateKey,
  isSameDay,
  isPastDate,
  getMonthStart,
  getTodayStart,
} from "./date-utils";

describe("date-utils", () => {
  describe("getDatesForMonth", () => {
    it("returns all dates for January (31 days)", () => {
      const january = new Date(2025, 0, 15); // January 2025
      const dates = getDatesForMonth(january);

      expect(dates).toHaveLength(31);
      expect(dates[0].getDate()).toBe(1);
      expect(dates[30].getDate()).toBe(31);
    });

    it("returns all dates for February (28 days in non-leap year)", () => {
      const february = new Date(2025, 1, 10); // February 2025
      const dates = getDatesForMonth(february);

      expect(dates).toHaveLength(28);
      expect(dates[0].getDate()).toBe(1);
      expect(dates[27].getDate()).toBe(28);
    });

    it("returns all dates for February (29 days in leap year)", () => {
      const february = new Date(2024, 1, 10); // February 2024 (leap year)
      const dates = getDatesForMonth(february);

      expect(dates).toHaveLength(29);
      expect(dates[28].getDate()).toBe(29);
    });

    it("returns all dates for April (30 days)", () => {
      const april = new Date(2025, 3, 15); // April 2025
      const dates = getDatesForMonth(april);

      expect(dates).toHaveLength(30);
    });

    it("all dates are in the correct month", () => {
      const november = new Date(2025, 10, 1); // November 2025
      const dates = getDatesForMonth(november);

      dates.forEach((date) => {
        expect(date.getMonth()).toBe(10);
        expect(date.getFullYear()).toBe(2025);
      });
    });
  });

  describe("formatDateKey", () => {
    it("formats date as YYYY-MM-DD", () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      expect(formatDateKey(date)).toBe("2025-01-15");
    });

    it("pads single-digit month", () => {
      const date = new Date(2025, 4, 5); // May 5, 2025
      expect(formatDateKey(date)).toBe("2025-05-05");
    });

    it("pads single-digit day", () => {
      const date = new Date(2025, 11, 1); // December 1, 2025
      expect(formatDateKey(date)).toBe("2025-12-01");
    });

    it("handles end of year", () => {
      const date = new Date(2025, 11, 31); // December 31, 2025
      expect(formatDateKey(date)).toBe("2025-12-31");
    });
  });

  describe("isSameDay", () => {
    it("returns true for same day", () => {
      const date1 = new Date(2025, 0, 15, 10, 30);
      const date2 = new Date(2025, 0, 15, 23, 59);
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it("returns false for different days", () => {
      const date1 = new Date(2025, 0, 15);
      const date2 = new Date(2025, 0, 16);
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it("returns false for different months", () => {
      const date1 = new Date(2025, 0, 15);
      const date2 = new Date(2025, 1, 15);
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it("returns false for different years", () => {
      const date1 = new Date(2025, 0, 15);
      const date2 = new Date(2024, 0, 15);
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe("isPastDate", () => {
    it("returns true for date before reference", () => {
      const past = new Date(2025, 0, 10);
      const reference = new Date(2025, 0, 15);
      expect(isPastDate(past, reference)).toBe(true);
    });

    it("returns false for date after reference", () => {
      const future = new Date(2025, 0, 20);
      const reference = new Date(2025, 0, 15);
      expect(isPastDate(future, reference)).toBe(false);
    });

    it("returns false for same date", () => {
      const date = new Date(2025, 0, 15);
      const reference = new Date(2025, 0, 15);
      expect(isPastDate(date, reference)).toBe(false);
    });
  });

  describe("getMonthStart", () => {
    it("returns first day of month", () => {
      const date = new Date(2025, 5, 15, 10, 30, 45);
      const result = getMonthStart(date);

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(1);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    it("works for December", () => {
      const date = new Date(2025, 11, 31);
      const result = getMonthStart(date);

      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(1);
    });
  });

  describe("getTodayStart", () => {
    let mockDate: Date;

    beforeEach(() => {
      mockDate = new Date("2025-06-15T14:30:45.123Z");
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns today at midnight", () => {
      const result = getTodayStart();

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it("uses current date", () => {
      const result = getTodayStart();

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(5); // June
      expect(result.getDate()).toBe(15);
    });
  });
});
