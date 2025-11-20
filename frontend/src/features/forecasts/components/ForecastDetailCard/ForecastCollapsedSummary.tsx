/**
 * ForecastCollapsedSummary - Summary display when card is collapsed
 */

import type { ForecastCollapsedSummaryProps } from "./types";

/**
 * Display monthly total when card is collapsed
 * Shows target month label and total quantity with unit
 */
export function ForecastCollapsedSummary({
  targetMonthLabel,
  roundedTotal,
  unit,
}: ForecastCollapsedSummaryProps) {
  return (
    <div className="border-t border-slate-100 bg-white px-4 py-3 text-sm text-gray-600">
      <div className="flex items-center justify-between">
        <span>月合計 ({targetMonthLabel})</span>
        <span className="font-semibold text-gray-900">
          {roundedTotal.toLocaleString("ja-JP")}
          <span className="ml-1 text-xs text-gray-500">{unit}</span>
        </span>
      </div>
    </div>
  );
}
