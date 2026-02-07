import { describe, it, expect } from "vitest";

import type { RoleCode } from "./types";
import { canAccessRoute, canAccessTab } from "./utils";

describe("RBAC Permissions Logic", () => {
  const admin: RoleCode[] = ["admin"];
  const user: RoleCode[] = ["user"];
  const guest: RoleCode[] = ["guest"];

  describe("Route Access (canAccessRoute)", () => {
    it("should allow admin to access all major routes", () => {
      expect(canAccessRoute(admin, "/")).toBe(true);
      expect(canAccessRoute(admin, "/dashboard")).toBe(true);
      expect(canAccessRoute(admin, "/admin/system-settings")).toBe(true);
      expect(canAccessRoute(admin, "/admin/logs")).toBe(true);
      expect(canAccessRoute(admin, "/sap")).toBe(true);
      expect(canAccessRoute(admin, "/help/database-schema/overview")).toBe(true);
    });

    it("should allow guest to access public routes but not admin ones", () => {
      // Public
      expect(canAccessRoute(guest, "/dashboard")).toBe(true);
      expect(canAccessRoute(guest, "/help/database-schema/overview")).toBe(true);
      expect(canAccessRoute(guest, "/inventory/summary")).toBe(true);

      // Restricted
      expect(canAccessRoute(guest, "/admin/system-settings")).toBe(false);
      expect(canAccessRoute(guest, "/admin/logs")).toBe(false);
      expect(canAccessRoute(guest, "/ocr-results")).toBe(false); // user以上
    });

    it("should allow user to access business routes but not admin ones", () => {
      expect(canAccessRoute(user, "/orders")).toBe(true);
      expect(canAccessRoute(user, "/ocr-results")).toBe(true);
      expect(canAccessRoute(user, "/rpa/smartread")).toBe(true);

      expect(canAccessRoute(user, "/admin/system-settings")).toBe(false);
      expect(canAccessRoute(user, "/admin/logs")).toBe(false);
    });

    it("should correctly handle wildcard paths (fixed regression)", () => {
      // Sub-routed paths that use *
      expect(canAccessRoute(guest, "/help/database-schema/overview")).toBe(true);
      expect(canAccessRoute(guest, "/help/database-schema/tables")).toBe(true);
      expect(canAccessRoute(guest, "/inventory/items/P1/W1/summary")).toBe(true);
      expect(canAccessRoute(guest, "/inventory/items/P1/W1/forecast")).toBe(true);
    });

    it("should deny access to undefined routes (default deny)", () => {
      expect(canAccessRoute(admin, "/unknown-page-123")).toBe(false);
      expect(canAccessRoute(user, "/unknown-page-123")).toBe(false);
    });
  });

  describe("Tab Access (canAccessTab)", () => {
    it("should respect tab-specific permissions", () => {
      // inventory: replenish is user+
      expect(canAccessTab(user, "INVENTORY.ITEMS.DETAIL", "replenishment")).toBe(true);
      expect(canAccessTab(guest, "INVENTORY.ITEMS.DETAIL", "replenishment")).toBe(false);

      // inventory: summary is guest+
      expect(canAccessTab(guest, "INVENTORY.ITEMS.DETAIL", "summary")).toBe(true);
    });
  });

  describe("Dynamic Visibility Logic (Inheritance)", () => {
    // These tests mock the logic inside SystemSettingsContext's isFeatureVisible
    const isVisibleMock = (
      feature: string,
      settings: {
        page_visibility?: Record<string, { user?: boolean }>;
      },
    ) => {
      if (feature.includes(":")) {
        const parent = feature.split(":")[0]!;
        if (isVisibleMock(parent, settings)) return true;
      }
      return settings?.page_visibility?.[feature]?.user ?? true;
    };

    it("should inherit visibility from parent if parent is ON", () => {
      const settings = {
        page_visibility: {
          inventory: { user: true, guest: false },
          "inventory:lots": { user: false, guest: false }, // Explicitly OFF
        },
      };

      // Even if lots is OFF, if inventory is ON, lots should be visible (inherited)
      expect(isVisibleMock("inventory:lots", settings)).toBe(true);
    });

    it("should respect local config if parent is OFF", () => {
      const settings = {
        page_visibility: {
          inventory: { user: false, guest: false },
          "inventory:lots": { user: true, guest: false }, // Explicitly ON
        },
      };

      // Inventory is OFF, so inherits nothing. lots is ON locally.
      expect(isVisibleMock("inventory:lots", settings)).toBe(true);
    });
  });
});
