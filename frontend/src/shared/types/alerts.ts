/**
 * Alert system type definitions
 *
 * Defines types for the alert system including severity levels,
 * categories, and alert items with their targets.
 */

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertCategory = "order" | "inventory" | "lot" | "forecast";

export type AlertTarget =
  | { resourceType: "order"; id: number }
  | { resourceType: "inventory_item"; id: number }
  | { resourceType: "lot"; id: number }
  | { resourceType: "forecast_daily"; id: number };

export interface AlertItem {
  id: string;
  category: AlertCategory;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  occurred_at: string; // ISO8601
  target: AlertTarget;
}

export interface AlertSummaryResponse {
  total: number;
  by_severity: Record<AlertSeverity, number>;
  by_category: Record<AlertCategory, number>;
}

// Helper type guards
export function isOrderTarget(
  target: AlertTarget,
): target is { resourceType: "order"; id: number } {
  return target.resourceType === "order";
}

export function isLotTarget(target: AlertTarget): target is { resourceType: "lot"; id: number } {
  return target.resourceType === "lot";
}

export function isInventoryItemTarget(
  target: AlertTarget,
): target is { resourceType: "inventory_item"; id: number } {
  return target.resourceType === "inventory_item";
}

export function isForecastDailyTarget(
  target: AlertTarget,
): target is { resourceType: "forecast_daily"; id: number } {
  return target.resourceType === "forecast_daily";
}
