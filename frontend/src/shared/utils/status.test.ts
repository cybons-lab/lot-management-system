/**
 * Tests for status utility functions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { getLotStatuses, type LotStatus } from "./status";

describe("getLotStatuses", () => {
  let mockDate: Date;

  beforeEach(() => {
    // Mock current date to 2025-06-01
    mockDate = new Date("2025-06-01T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("null/undefined handling", () => {
    it("returns available for null lot", () => {
      expect(getLotStatuses(null)).toEqual(["available"]);
    });

    it("returns available for undefined lot", () => {
      expect(getLotStatuses(undefined)).toEqual(["available"]);
    });
  });

  describe("lock/quarantine status", () => {
    it("returns qc_hold for locked status", () => {
      const lot = { status: "locked", current_quantity: 100 };
      expect(getLotStatuses(lot)).toContain("qc_hold");
    });

    it("returns qc_hold for quarantine status", () => {
      const lot = { status: "quarantine", current_quantity: 100 };
      expect(getLotStatuses(lot)).toContain("qc_hold");
    });
  });

  describe("inspection status", () => {
    it("returns rejected for failed inspection", () => {
      const lot = { inspection_status: "failed", current_quantity: 100 };
      expect(getLotStatuses(lot)).toContain("rejected");
    });

    it("returns qc_hold for pending inspection", () => {
      const lot = { inspection_status: "pending", current_quantity: 100 };
      expect(getLotStatuses(lot)).toContain("qc_hold");
    });

    it("does not include inspection status for passed", () => {
      const lot = { inspection_status: "passed", current_quantity: 100 };
      const statuses = getLotStatuses(lot);
      expect(statuses).not.toContain("rejected");
      expect(statuses).not.toContain("qc_hold");
    });
  });

  describe("expiry status", () => {
    it("returns expired for past expiry date", () => {
      const lot = { expiry_date: "2025-01-01", current_quantity: 100 };
      expect(getLotStatuses(lot)).toContain("expired");
    });

    it("does not return expired for future expiry date", () => {
      const lot = { expiry_date: "2025-12-31", current_quantity: 100 };
      expect(getLotStatuses(lot)).not.toContain("expired");
    });

    it("does not return expired for null expiry date", () => {
      const lot = { expiry_date: null, current_quantity: 100 };
      expect(getLotStatuses(lot)).not.toContain("expired");
    });

    it("handles expiry date equal to today", () => {
      // Expiry on 2025-06-01 should not be expired (comparing start of day)
      const lot = { expiry_date: "2025-06-01", current_quantity: 100 };
      expect(getLotStatuses(lot)).not.toContain("expired");
    });
  });

  describe("quantity status", () => {
    it("returns empty for zero quantity", () => {
      const lot = { current_quantity: 0 };
      expect(getLotStatuses(lot)).toContain("empty");
    });

    it("returns empty for negative quantity", () => {
      const lot = { current_quantity: -5 };
      expect(getLotStatuses(lot)).toContain("empty");
    });

    it("returns available for positive quantity", () => {
      const lot = { current_quantity: 100 };
      expect(getLotStatuses(lot)).toContain("available");
    });

    it("handles string quantity", () => {
      const lot = { current_quantity: "100.5" };
      expect(getLotStatuses(lot)).toContain("available");
    });

    it("handles null quantity as empty", () => {
      const lot = { current_quantity: null };
      expect(getLotStatuses(lot)).toContain("empty");
    });
  });

  describe("priority ordering", () => {
    it("orders statuses by priority", () => {
      const lot = {
        status: "locked",
        inspection_status: "pending",
        expiry_date: "2025-01-01",
        current_quantity: 0,
      };
      const statuses = getLotStatuses(lot);

      // Expected order: expired, qc_hold, empty
      expect(statuses.indexOf("expired") as number).toBeLessThan(
        statuses.indexOf("qc_hold") as number,
      );
      expect(statuses.indexOf("qc_hold") as number).toBeLessThan(
        statuses.indexOf("empty") as number,
      );
    });

    it("returns first status as the primary status", () => {
      const lot = { status: "locked", current_quantity: 100 };
      const statuses = getLotStatuses(lot);
      expect(statuses[0]).toBe("qc_hold" as LotStatus);
    });
  });

  describe("combined statuses", () => {
    it("can have multiple statuses", () => {
      const lot = {
        status: "locked",
        inspection_status: "pending",
        current_quantity: 100,
      };
      const statuses = getLotStatuses(lot);
      expect(statuses).toContain("qc_hold");
    });

    it("removes duplicates", () => {
      const lot = { current_quantity: 100 };
      const statuses = getLotStatuses(lot);
      const uniqueCount = new Set(statuses).size;
      expect(statuses.length).toBe(uniqueCount);
    });
  });

  describe("edge cases", () => {
    it("handles empty lot object", () => {
      const lot = {};
      const statuses = getLotStatuses(lot);
      expect(statuses).toContain("empty");
    });

    it("handles lot with only status field", () => {
      const lot = { status: "active" };
      const statuses = getLotStatuses(lot);
      expect(statuses).toContain("empty"); // No quantity
    });

    it("active lot with positive quantity returns available", () => {
      const lot = { status: "active", current_quantity: 50 };
      const statuses = getLotStatuses(lot);
      expect(statuses).toEqual(["available"]);
    });
  });
});
