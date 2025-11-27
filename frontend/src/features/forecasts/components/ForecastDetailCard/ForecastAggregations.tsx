/**
 * ForecastAggregations - Dekad and monthly aggregation displays
 */

import type { ForecastAggregationsProps } from "./types";

/**
 * Display dekad (旬) and monthly aggregations side by side
 * - Left side: Dekad aggregations (上旬・中旬・下旬)
 * - Right side: Monthly aggregation
 */
export function ForecastAggregations({ dekadData, monthlyData }: ForecastAggregationsProps) {
  return (
    <div className="grid gap-6 border-t pt-4 md:grid-cols-2">
      {/* Dekad aggregations (left side) */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">旬別指示</h4>
        {dekadData.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {dekadData.map((dekad) => (
              <div
                key={dekad.label}
                className="flex min-h-[100px] flex-col justify-center rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-center"
              >
                <div className="text-xs font-medium text-green-700">{dekad.label}</div>
                <div className="text-lg font-bold text-green-900">{dekad.total}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
            データなし
          </div>
        )}
      </div>

      {/* Monthly aggregation (right side) */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">月別指示</h4>
        {monthlyData ? (
          <div className="flex min-h-[100px] flex-col justify-center rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-center">
            <div className="text-xs font-medium text-purple-700">{monthlyData.label}</div>
            <div className="text-2xl font-bold text-purple-900">{monthlyData.total}</div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-3 text-center text-sm text-gray-400">
            データなし
          </div>
        )}
      </div>
    </div>
  );
}
