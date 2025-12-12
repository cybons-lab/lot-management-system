/**
 * Tests for date utility functions (shared/utils/date.ts)
 */
import { describe, it, expect } from "vitest";

import { formatDate, formatDateTime, formatDateForInput } from "./date";

describe("date utilities (shared/utils)", () => {
  describe("formatDate", () => {
    it("formats ISO date string to YYYY/MM/DD", () => {
      expect(formatDate("2025-01-15")).toBe("2025/01/15");
      expect(formatDate("2025-12-31")).toBe("2025/12/31");
    });

    it("formats Date object to YYYY/MM/DD", () => {
      // Use explicit date to avoid timezone issues
      const date = new Date("2025-01-15T12:00:00Z");
      const result = formatDate(date);
      expect(result).toMatch(/2025\/01\/1[45]/); // May vary by timezone
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
      // Result depends on timezone, but should contain date and time
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
      expect(result).toMatch(/2025-01-1[45]/); // May vary by timezone
    });
  });
});
