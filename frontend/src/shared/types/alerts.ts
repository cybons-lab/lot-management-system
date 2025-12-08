/**
 * Alert system type definitions
 *
 * Defines types for the alert system including severity levels,
 * categories, and alert items with their targets.
 */

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertCategory = "order" | "inventory" | "lot" | "forecast";

export type AlertTarget =
  | { resource_type: "order"; id: number }
  | { resource_type: "inventory_item"; id: number }
  | { resource_type: "lot"; id: number }
  | { resource_type: "forecast_daily"; id: number };

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
): target is { resource_type: "order"; id: number } {
  return target.resource_type === "order";
}

export function isLotTarget(target: AlertTarget): target is { resource_type: "lot"; id: number } {
  return target.resource_type === "lot";
}

export function isInventoryItemTarget(
  target: AlertTarget,
): target is { resource_type: "inventory_item"; id: number } {
  return target.resource_type === "inventory_item";
}

export function isForecastDailyTarget(
  target: AlertTarget,
): target is { resource_type: "forecast_daily"; id: number } {
  return target.resource_type === "forecast_daily";
}
