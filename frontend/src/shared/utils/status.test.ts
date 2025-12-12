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

  describe("locked status", () => {
    it("returns locked for locked status", () => {
      const lot = { status: "locked", current_quantity: 100 };
      expect(getLotStatuses(lot)).toContain("locked");
    });

    it("locked takes priority over other statuses", () => {
      const lot = { status: "locked", current_quantity: 100 };
      const statuses = getLotStatuses(lot);
      expect(statuses[0]).toBe("locked");
    });
  });

  describe("inspection status", () => {
    it("returns inspection_failed for failed inspection", () => {
      const lot = { inspection_status: "failed", current_quantity: 100 };
      expect(getLotStatuses(lot)).toContain("inspection_failed");
    });

    it("returns inspection_pending for pending inspection", () => {
      const lot = { inspection_status: "pending", current_quantity: 100 };
      expect(getLotStatuses(lot)).toContain("inspection_pending");
    });

    it("does not include inspection status for passed", () => {
      const lot = { inspection_status: "passed", current_quantity: 100 };
      const statuses = getLotStatuses(lot);
      expect(statuses).not.toContain("inspection_failed");
      expect(statuses).not.toContain("inspection_pending");
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
    it("returns depleted for zero quantity", () => {
      const lot = { current_quantity: 0 };
      expect(getLotStatuses(lot)).toContain("depleted");
    });

    it("returns depleted for negative quantity", () => {
      const lot = { current_quantity: -5 };
      expect(getLotStatuses(lot)).toContain("depleted");
    });

    it("returns available for positive quantity", () => {
      const lot = { current_quantity: 100 };
      expect(getLotStatuses(lot)).toContain("available");
    });

    it("handles string quantity", () => {
      const lot = { current_quantity: "100.5" };
      expect(getLotStatuses(lot)).toContain("available");
    });

    it("handles null quantity as depleted", () => {
      const lot = { current_quantity: null };
      expect(getLotStatuses(lot)).toContain("depleted");
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

      // Expected order: locked, inspection_pending, expired, depleted
      expect(statuses.indexOf("locked") as number).toBeLessThan(
        statuses.indexOf("inspection_pending") as number,
      );
      expect(statuses.indexOf("inspection_pending") as number).toBeLessThan(
        statuses.indexOf("expired") as number,
      );
      expect(statuses.indexOf("expired") as number).toBeLessThan(
        statuses.indexOf("depleted") as number,
      );
    });

    it("returns first status as the primary status", () => {
      const lot = { status: "locked", current_quantity: 100 };
      const statuses = getLotStatuses(lot);
      expect(statuses[0]).toBe("locked" as LotStatus);
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
      expect(statuses).toContain("locked");
      expect(statuses).toContain("inspection_pending");
      expect(statuses).toContain("available");
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
      expect(statuses).toContain("depleted");
    });

    it("handles lot with only status field", () => {
      const lot = { status: "active" };
      const statuses = getLotStatuses(lot);
      expect(statuses).toContain("depleted"); // No quantity
    });

    it("active lot with positive quantity returns available", () => {
      const lot = { status: "active", current_quantity: 50 };
      const statuses = getLotStatuses(lot);
      expect(statuses).toEqual(["available"]);
    });
  });
});
