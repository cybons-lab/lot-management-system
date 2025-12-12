/**
 * Tests for formatQuantity utility functions
 */
import { describe, it, expect } from "vitest";

import {
  isCountableUnit,
  isMeasurableUnit,
  formatQuantity,
  formatQuantityWithConversion,
} from "./formatQuantity";

describe("formatQuantity", () => {
  describe("isCountableUnit", () => {
    it("PCS, BOX, CAN, EA are countable", () => {
      expect(isCountableUnit("PCS")).toBe(true);
      expect(isCountableUnit("BOX")).toBe(true);
      expect(isCountableUnit("CAN")).toBe(true);
      expect(isCountableUnit("EA")).toBe(true);
      expect(isCountableUnit("CARTON")).toBe(true);
      expect(isCountableUnit("PACK")).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(isCountableUnit("pcs")).toBe(true);
      expect(isCountableUnit("Pcs")).toBe(true);
    });

    it("measurable units are not countable", () => {
      expect(isCountableUnit("KG")).toBe(false);
      expect(isCountableUnit("L")).toBe(false);
    });
  });

  describe("isMeasurableUnit", () => {
    it("L, ML, KG, G, TON are measurable", () => {
      expect(isMeasurableUnit("L")).toBe(true);
      expect(isMeasurableUnit("ML")).toBe(true);
      expect(isMeasurableUnit("KG")).toBe(true);
      expect(isMeasurableUnit("G")).toBe(true);
      expect(isMeasurableUnit("TON")).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(isMeasurableUnit("kg")).toBe(true);
      expect(isMeasurableUnit("Kg")).toBe(true);
    });

    it("countable units are not measurable", () => {
      expect(isMeasurableUnit("PCS")).toBe(false);
      expect(isMeasurableUnit("BOX")).toBe(false);
    });
  });

  describe("formatQuantity", () => {
    describe("countable units (integer only)", () => {
      it("rounds to nearest integer for PCS", () => {
        expect(formatQuantity(10.5, "PCS")).toBe("11");
        expect(formatQuantity(10.4, "PCS")).toBe("10");
        expect(formatQuantity(10, "PCS")).toBe("10");
      });

      it("rounds to nearest integer for CAN", () => {
        expect(formatQuantity(5.6, "CAN")).toBe("6");
        expect(formatQuantity(5.4, "CAN")).toBe("5");
      });

      it("formats large numbers with commas", () => {
        expect(formatQuantity(1234567, "PCS")).toBe("1,234,567");
      });
    });

    describe("measurable units (decimal allowed)", () => {
      it("keeps decimals for KG", () => {
        expect(formatQuantity(10.5, "KG")).toBe("10.5");
        expect(formatQuantity(10.55, "KG")).toBe("10.55");
      });

      it("removes unnecessary trailing zeros", () => {
        expect(formatQuantity(10.0, "KG")).toBe("10");
        expect(formatQuantity(10.1, "KG")).toBe("10.1");
      });

      it("limits to 2 decimal places", () => {
        expect(formatQuantity(10.555, "KG")).toBe("10.56");
        expect(formatQuantity(10.554, "KG")).toBe("10.55");
      });

      it("formats large numbers with commas", () => {
        expect(formatQuantity(1234567.89, "KG")).toBe("1,234,567.89");
      });
    });

    describe("unknown units", () => {
      it("defaults to 2 decimal places", () => {
        expect(formatQuantity(10.555, "UNKNOWN")).toBe("10.56");
        expect(formatQuantity(10, "UNKNOWN")).toBe("10");
      });
    });

    describe("includeUnit option", () => {
      it("appends unit when includeUnit is true", () => {
        expect(formatQuantity(10, "PCS", true)).toBe("10 PCS");
        expect(formatQuantity(10.5, "KG", true)).toBe("10.5 KG");
      });

      it("does not append unit when includeUnit is false", () => {
        expect(formatQuantity(10, "PCS", false)).toBe("10");
        expect(formatQuantity(10.5, "KG", false)).toBe("10.5");
      });
    });

    describe("edge cases", () => {
      it("handles null value", () => {
        expect(formatQuantity(null, "PCS")).toBe("0");
        expect(formatQuantity(null, "KG")).toBe("0");
      });

      it("handles undefined value", () => {
        expect(formatQuantity(undefined, "PCS")).toBe("0");
      });

      it("handles string value", () => {
        expect(formatQuantity("10.5", "KG")).toBe("10.5");
        expect(formatQuantity("10.5", "PCS")).toBe("11");
      });

      it("handles NaN", () => {
        expect(formatQuantity(NaN, "PCS")).toBe("0");
        expect(formatQuantity("invalid", "PCS")).toBe("0");
      });

      it("handles zero", () => {
        expect(formatQuantity(0, "PCS")).toBe("0");
        expect(formatQuantity(0, "KG")).toBe("0");
      });

      it("handles negative numbers", () => {
        expect(formatQuantity(-10, "PCS")).toBe("-10");
        expect(formatQuantity(-10.5, "KG")).toBe("-10.5");
      });
    });
  });

  describe("formatQuantityWithConversion", () => {
    it("formats primary value only when no conversion", () => {
      expect(formatQuantityWithConversion(10, "KG")).toBe("10 KG");
      expect(formatQuantityWithConversion(10, "KG", null, null)).toBe("10 KG");
    });

    it("formats with conversion when both values provided", () => {
      expect(formatQuantityWithConversion(10, "KG", 2, "CAN")).toBe("10 KG (= 2 CAN)");
    });

    it("skips conversion when units are the same", () => {
      expect(formatQuantityWithConversion(10, "KG", 10, "KG")).toBe("10 KG");
    });

    it("handles null converted value", () => {
      expect(formatQuantityWithConversion(10, "KG", null, "CAN")).toBe("10 KG");
    });

    it("handles null converted unit", () => {
      expect(formatQuantityWithConversion(10, "KG", 2, undefined)).toBe("10 KG");
    });

    it("handles decimal values in conversion", () => {
      expect(formatQuantityWithConversion(10.5, "KG", 4.2, "CAN")).toBe("10.5 KG (= 4 CAN)");
    });
  });
});
