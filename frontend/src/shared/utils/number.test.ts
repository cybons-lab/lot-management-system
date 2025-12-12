/**
 * Tests for number formatting utilities
 */
import { describe, it, expect } from "vitest";

import { nf, fmt, fmtDecimal } from "./number";

describe("number.ts", () => {
  describe("nf (NumberFormat)", () => {
    it("formats integers with commas", () => {
      expect(nf.format(1234567)).toBe("1,234,567");
    });

    it("formats decimals with commas", () => {
      expect(nf.format(1234567.89)).toBe("1,234,567.89");
    });

    it("formats zero", () => {
      expect(nf.format(0)).toBe("0");
    });

    it("formats negative numbers", () => {
      expect(nf.format(-1234)).toBe("-1,234");
    });
  });

  describe("fmt", () => {
    it("formats integers with commas", () => {
      expect(fmt(1234567)).toBe("1,234,567");
    });

    it("formats decimals with commas", () => {
      expect(fmt(1234.56)).toBe("1,234.56");
    });

    it("handles null as 0", () => {
      expect(fmt(null)).toBe("0");
    });

    it("handles undefined as 0", () => {
      expect(fmt(undefined)).toBe("0");
    });

    it("parses string values", () => {
      expect(fmt("1234.56")).toBe("1,234.56");
      expect(fmt("1234567")).toBe("1,234,567");
    });

    it("handles invalid strings as 0", () => {
      expect(fmt("invalid")).toBe("0");
      expect(fmt("")).toBe("0");
    });

    it("handles zero", () => {
      expect(fmt(0)).toBe("0");
      expect(fmt("0")).toBe("0");
    });

    it("handles negative numbers", () => {
      expect(fmt(-1234)).toBe("-1,234");
      expect(fmt("-1234")).toBe("-1,234");
    });

    it("preserves decimal precision", () => {
      expect(fmt(1234.5)).toBe("1,234.5");
      expect(fmt(1234.5)).toBe("1,234.5");
      expect(fmt("1234.50")).toBe("1,234.5");
    });
  });

  describe("fmtDecimal", () => {
    it("formats with default 2 decimal places", () => {
      expect(fmtDecimal(1234.5678)).toBe("1,234.57");
      expect(fmtDecimal(1234)).toBe("1,234.00");
    });

    it("formats with custom decimal places", () => {
      expect(fmtDecimal(1234.5678, 0)).toBe("1,235");
      expect(fmtDecimal(1234.5678, 1)).toBe("1,234.6");
      expect(fmtDecimal(1234.5678, 3)).toBe("1,234.568");
    });

    it("handles null as 0", () => {
      expect(fmtDecimal(null)).toBe("0");
      expect(fmtDecimal(null, 2)).toBe("0");
    });

    it("handles undefined as 0", () => {
      expect(fmtDecimal(undefined)).toBe("0");
    });

    it("parses string values", () => {
      expect(fmtDecimal("1234.5678", 2)).toBe("1,234.57");
    });

    it("handles invalid strings as 0", () => {
      expect(fmtDecimal("invalid")).toBe("0");
    });

    it("rounds correctly", () => {
      expect(fmtDecimal(1.234, 2)).toBe("1.23");
      expect(fmtDecimal(1.235, 2)).toBe("1.24");
      expect(fmtDecimal(1.245, 2)).toBe("1.25"); // Banker's rounding
    });

    it("handles zero decimal places", () => {
      expect(fmtDecimal(1234.9, 0)).toBe("1,235");
      expect(fmtDecimal(1234.4, 0)).toBe("1,234");
    });
  });
});
