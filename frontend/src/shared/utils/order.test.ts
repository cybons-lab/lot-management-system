/**
 * Tests for order utility functions
 */
import { describe, it, expect } from "vitest";

import { formatOrderCode } from "./order";

describe("formatOrderCode", () => {
  describe("priority 1: customer_order_no", () => {
    it("returns customer_order_no when present", () => {
      expect(formatOrderCode({ customer_order_no: "CUST-12345" })).toBe("CUST-12345");
    });

    it("uses customer_order_no over sap_order_no and id", () => {
      expect(
        formatOrderCode({
          customer_order_no: "CUST-12345",
          sap_order_no: "SAP-999",
          id: 100,
        }),
      ).toBe("CUST-12345");
    });

    it("preserves whitespace in customer_order_no", () => {
      // Note: formatOrderCode does not trim whitespace, it only checks for non-empty after trim
      expect(formatOrderCode({ customer_order_no: "  CUST-12345  " })).toBe("  CUST-12345  ");
    });

    it("skips empty customer_order_no", () => {
      expect(formatOrderCode({ customer_order_no: "", id: 100 })).toBe("#100");
    });

    it("skips whitespace-only customer_order_no", () => {
      expect(formatOrderCode({ customer_order_no: "   ", id: 100 })).toBe("#100");
    });
  });

  describe("priority 2: sap_order_no", () => {
    it("returns SAP prefixed sap_order_no when customer_order_no is missing", () => {
      expect(formatOrderCode({ sap_order_no: "12345" })).toBe("SAP: 12345");
    });

    it("uses sap_order_no over id", () => {
      expect(
        formatOrderCode({
          sap_order_no: "12345",
          id: 100,
        }),
      ).toBe("SAP: 12345");
    });

    it("skips empty sap_order_no", () => {
      expect(formatOrderCode({ sap_order_no: "", id: 100 })).toBe("#100");
    });

    it("skips whitespace-only sap_order_no", () => {
      expect(formatOrderCode({ sap_order_no: "   ", id: 100 })).toBe("#100");
    });
  });

  describe("fallback: database ID", () => {
    it("returns #id when no business keys present", () => {
      expect(formatOrderCode({ id: 100 })).toBe("#100");
    });

    it("uses order_id over id", () => {
      expect(formatOrderCode({ order_id: 200, id: 100 })).toBe("#200");
    });

    it("falls back to id when order_id is null", () => {
      expect(formatOrderCode({ order_id: null, id: 100 })).toBe("#100");
    });
  });

  describe("edge cases", () => {
    it("returns - for null input", () => {
      expect(formatOrderCode(null)).toBe("-");
    });

    it("returns - for undefined input", () => {
      expect(formatOrderCode(undefined)).toBe("-");
    });

    it("returns - for empty object", () => {
      expect(formatOrderCode({})).toBe("-");
    });

    it("returns - when all fields are null", () => {
      expect(
        formatOrderCode({
          customer_order_no: null,
          sap_order_no: null,
          id: null,
        }),
      ).toBe("-");
    });

    it("handles numeric id = 0", () => {
      expect(formatOrderCode({ id: 0 })).toBe("#0");
    });
  });
});
