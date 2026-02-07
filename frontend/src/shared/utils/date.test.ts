/**
 * Tests for date utility functions (shared/utils/date.ts)
 *
 * Consolidated from:
 * - shared/utils/date.test.ts (original)
 * - shared/libs/utils/date.test.ts
 * - features/forecasts/.../date-utils.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatDateForInput,
  formatDateKey,
  formatYmd,
  getDatesForMonth,
  getDatesForNextMonthFirst10Days,
  isSameDay,
  isPastDate,
  getMonthStart,
  getTodayStart,
  diffDays,
  isValidDate,
  parseDate,
} from "./date";

// ========================================
// Section 1: フォーマット関数テスト
// ========================================

describe("date utilities - format functions", () => {
  describe("formatDate", () => {
    it("formats ISO date string to YYYY/MM/DD", () => {
      expect(formatDate("2025-01-15")).toBe("2025/01/15");
      expect(formatDate("2025-12-31")).toBe("2025/12/31");
    });

    it("formats Date object to YYYY/MM/DD", () => {
      const date = new Date("2025-01-15T12:00:00Z");
      const result = formatDate(date);
      expect(result).toMatch(/2025\/01\/1[45]/);
    });

    it("returns empty string for null", () => {
      expect(formatDate(null)).toBe("");
    });

    it("returns empty string for undefined", () => {
      expect(formatDate(undefined)).toBe("");
    });

    it("uses custom format string", () => {
      expect(formatDate("2025-01-15", "yyyy-MM-dd")).toBe("2025-01-15");
      expect(formatDate("2025-01-15", "MM/dd/yyyy")).toBe("01/15/2025");
    });

    it("uses options object with format", () => {
      expect(formatDate("2025-01-15", { format: "yyyy年MM月dd日" })).toBe("2025年01月15日");
    });

    it("uses fallback for invalid date", () => {
      expect(formatDate("invalid", { fallback: "N/A" })).toBe("N/A");
    });

    it("uses fallback for null with options", () => {
      expect(formatDate(null, { fallback: "未設定" })).toBe("未設定");
    });

    it("returns empty string for invalid date without fallback", () => {
      expect(formatDate("invalid")).toBe("");
    });
  });

  describe("formatDateTime", () => {
    it("formats to YYYY/MM/DD HH:mm", () => {
      const result = formatDateTime("2025-01-15T14:30:00Z");
      expect(result).toMatch(/2025\/01\/1[45]/);
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it("returns empty string for null", () => {
      expect(formatDateTime(null)).toBe("");
    });

    it("returns empty string for undefined", () => {
      expect(formatDateTime(undefined)).toBe("");
    });
  });

  describe("formatDateForInput", () => {
    it("formats ISO date string to YYYY-MM-DD for HTML input", () => {
      expect(formatDateForInput("2025-01-15")).toBe("2025-01-15");
    });

    it("returns empty string for null", () => {
      expect(formatDateForInput(null)).toBe("");
    });

    it("returns empty string for undefined", () => {
      expect(formatDateForInput(undefined)).toBe("");
    });

    it("handles Date object", () => {
      const date = new Date("2025-01-15T12:00:00Z");
      const result = formatDateForInput(date);
      expect(result).toMatch(/2025-01-1[45]/);
    });
  });

  describe("formatDateKey", () => {
    it("formats date as YYYY-MM-DD", () => {
      const date = new Date(2025, 0, 15);
      expect(formatDateKey(date)).toBe("2025-01-15");
    });

    it("pads single-digit month", () => {
      const date = new Date(2025, 4, 5);
      expect(formatDateKey(date)).toBe("2025-05-05");
    });

    it("pads single-digit day", () => {
      const date = new Date(2025, 11, 1);
      expect(formatDateKey(date)).toBe("2025-12-01");
    });

    it("handles end of year", () => {
      const date = new Date(2025, 11, 31);
      expect(formatDateKey(date)).toBe("2025-12-31");
    });
  });

  describe("formatYmd", () => {
    it("formats date string to YYYY-MM-DD", () => {
      expect(formatYmd("2025-01-15")).toBe("2025-01-15");
      expect(formatYmd("2025/01/15")).toBe("2025-01-15");
    });

    it("formats Date object to YYYY-MM-DD", () => {
      const date = new Date(2025, 0, 15);
      expect(formatYmd(date)).toBe("2025-01-15");
    });

    it("pads single-digit month and day", () => {
      const date = new Date(2025, 0, 5);
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
});

// ========================================
// Section 2: 日付計算関数テスト
// ========================================

describe("date utilities - calculation functions", () => {
  describe("getDatesForMonth", () => {
    it("returns all dates for January (31 days)", () => {
      const january = new Date(2025, 0, 15);
      const dates = getDatesForMonth(january);

      expect(dates).toHaveLength(31);
      expect(dates[0]!.getDate()).toBe(1);
      expect(dates[30]!.getDate()).toBe(31);
    });

    it("returns all dates for February (28 days in non-leap year)", () => {
      const february = new Date(2025, 1, 10);
      const dates = getDatesForMonth(february);

      expect(dates).toHaveLength(28);
      expect(dates[0]!.getDate()).toBe(1);
      expect(dates[27]!.getDate()).toBe(28);
    });

    it("returns all dates for February (29 days in leap year)", () => {
      const february = new Date(2024, 1, 10);
      const dates = getDatesForMonth(february);

      expect(dates).toHaveLength(29);
      expect(dates[28]!.getDate()).toBe(29);
    });

    it("returns all dates for April (30 days)", () => {
      const april = new Date(2025, 3, 15);
      const dates = getDatesForMonth(april);

      expect(dates).toHaveLength(30);
    });

    it("all dates are in the correct month", () => {
      const november = new Date(2025, 10, 1);
      const dates = getDatesForMonth(november);

      dates.forEach((date) => {
        expect(date.getMonth()).toBe(10);
        expect(date.getFullYear()).toBe(2025);
      });
    });
  });

  describe("getDatesForNextMonthFirst10Days", () => {
    it("returns first 10 days of next month", () => {
      const january = new Date(2025, 0, 15);
      const dates = getDatesForNextMonthFirst10Days(january);

      expect(dates).toHaveLength(10);
      expect(dates[0]!.getMonth()).toBe(1); // February
      expect(dates[0]!.getDate()).toBe(1);
      expect(dates[9]!.getDate()).toBe(10);
    });

    it("handles year boundary", () => {
      const december = new Date(2025, 11, 15);
      const dates = getDatesForNextMonthFirst10Days(december);

      expect(dates[0]!.getFullYear()).toBe(2026);
      expect(dates[0]!.getMonth()).toBe(0); // January
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
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(15);
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
      const date1 = new Date("2025-01-15T12:00:00");
      const date2 = new Date("2025-01-14T00:00:00");
      expect(diffDays(date1, date2)).toBe(1);
    });
  });
});

// ========================================
// Section 3: バリデーション関数テスト
// ========================================

describe("date utilities - validation functions", () => {
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

  describe("parseDate", () => {
    it("parses ISO date string", () => {
      const result = parseDate("2025-01-15");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
    });

    it("returns Date object as-is", () => {
      const date = new Date(2025, 0, 15);
      const result = parseDate(date);
      expect(result).toBe(date);
    });

    it("returns null for null/undefined", () => {
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
    });
  });
});
