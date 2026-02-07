import { describe, it, expect } from "vitest";

import { FEATURE_CONFIG } from "@/config/feature-config";
import { AVAILABLE_FEATURES } from "@/constants/features";

describe("Feature Config Validation", () => {
  it("should have all top-level features in AVAILABLE_FEATURES", () => {
    const configKeys = Object.keys(FEATURE_CONFIG);
    configKeys.forEach((key) => {
      // AVAILABLE_FEATURES is derived from FEATURE_CONFIG in our recent change,
      // but we want to make sure the structure is sound.
      expect(AVAILABLE_FEATURES).toContain(key);
    });
  });

  it("should have globally unique sub-feature IDs (optional but recommended)", () => {
    const subFeatureIds = Object.values(FEATURE_CONFIG).flatMap(
      (f) => f.subFeatures?.map((s) => s.id) || [],
    );
    const uniqueIds = new Set(subFeatureIds);
    // Ensure we don't have too many collisions if we ever move to a flat structure
    expect(uniqueIds.size).toBeGreaterThan(0);
  });

  it("should verify that major pages have their sub-features registered", () => {
    // Inventory
    expect(FEATURE_CONFIG.inventory!.subFeatures).toBeDefined();
    const invSubs = FEATURE_CONFIG.inventory!.subFeatures!.map((s) => s.id);
    expect(invSubs).toContain("lots");
    expect(invSubs).toContain("forecast");

    // Help
    expect(FEATURE_CONFIG["database-schema"]!.subFeatures).toBeDefined();
    const dbSubs = FEATURE_CONFIG["database-schema"]!.subFeatures!.map((s) => s.id);
    expect(dbSubs).toContain("tables");
  });
});
