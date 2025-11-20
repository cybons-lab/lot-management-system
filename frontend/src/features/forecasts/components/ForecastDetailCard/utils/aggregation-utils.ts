/**
 * Aggregation utility functions for forecast calculations
 */

import { DEKAD_BOUNDARIES } from "../constants";
import type { AggregationMonth, DekadData, MonthlyData } from "../types";

/**
 * Calculate dekad (旬) aggregations for a given month
 * Dekad periods:
 * - First dekad (上旬): 1-10
 * - Second dekad (中旬): 11-20
 * - Third dekad (下旬): 21-end of month
 *
 * @param dailyData - Map of date strings (YYYY-MM-DD) to quantities
 * @param dekadMonth - Target month for aggregation
 * @returns Array of dekad aggregations with labels and totals
 */
export function calculateDekadAggregations(
  dailyData: Map<string, number>,
  dekadMonth: AggregationMonth | null,
): DekadData[] {
  if (!dekadMonth) return [];

  let jouTotal = 0; // 上旬 (first dekad)
  let chuTotal = 0; // 中旬 (second dekad)
  let geTotal = 0; // 下旬 (third dekad)

  for (const [dateStr, qty] of dailyData) {
    const date = new Date(dateStr);
    if (date.getFullYear() === dekadMonth.year && date.getMonth() === dekadMonth.month) {
      const day = date.getDate();
      const numQty = Number(qty) || 0;

      if (day <= DEKAD_BOUNDARIES.FIRST) {
        jouTotal += numQty;
      } else if (day <= DEKAD_BOUNDARIES.SECOND) {
        chuTotal += numQty;
      } else {
        geTotal += numQty;
      }
    }
  }

  const monthLabel = `${dekadMonth.month + 1}月`;

  return [
    { label: `${monthLabel} 上旬`, total: Math.round(jouTotal) },
    { label: `${monthLabel} 中旬`, total: Math.round(chuTotal) },
    { label: `${monthLabel} 下旬`, total: Math.round(geTotal) },
  ];
}

/**
 * Calculate monthly aggregation for a given month
 *
 * @param dailyData - Map of date strings (YYYY-MM-DD) to quantities
 * @param monthlyMonth - Target month for aggregation
 * @returns Monthly aggregation with label and total, or null if no target month
 */
export function calculateMonthlyAggregation(
  dailyData: Map<string, number>,
  monthlyMonth: AggregationMonth | null,
): MonthlyData | null {
  if (!monthlyMonth) return null;

  let total = 0;

  for (const [dateStr, qty] of dailyData) {
    const date = new Date(dateStr);
    if (date.getFullYear() === monthlyMonth.year && date.getMonth() === monthlyMonth.month) {
      const numQty = Number(qty) || 0;
      total += numQty;
    }
  }

  return {
    label: `${monthlyMonth.year}年${monthlyMonth.month + 1}月`,
    total: Math.round(total),
  };
}

/**
 * Calculate total quantity for all dates in an array
 *
 * @param dates - Array of dates to sum
 * @param dailyData - Map of date strings (YYYY-MM-DD) to quantities
 * @returns Rounded total quantity
 */
export function calculateDailyTotal(dates: Date[], dailyData: Map<string, number>): number {
  const total = dates.reduce((sum, date) => {
    const dateKey = date.toISOString().split("T")[0] ?? "";
    const qty = dailyData.get(dateKey) ?? 0;
    const numericQty = Number(qty);
    return sum + (Number.isFinite(numericQty) ? numericQty : 0);
  }, 0);

  return Math.round(total);
}
