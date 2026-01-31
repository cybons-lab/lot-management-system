import { FEATURE_CONFIG } from "@/config/feature-config";

/**
 * Feature visibility configuration
 *
 * This file derives features from the centralized FEATURE_CONFIG.
 */

export const AVAILABLE_FEATURES = Object.keys(FEATURE_CONFIG) as (keyof typeof FEATURE_CONFIG)[];

export type FeatureKey = (typeof AVAILABLE_FEATURES)[number];

/**
 * Feature display names for UI
 */
export const FEATURE_LABELS: Record<string, string> = Object.values(FEATURE_CONFIG).reduce(
  (acc, feature) => ({
    ...acc,
    [feature.id]: feature.label,
  }),
  {},
);
