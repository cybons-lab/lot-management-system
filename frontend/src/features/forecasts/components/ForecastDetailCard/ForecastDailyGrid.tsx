/**
 * ForecastDailyGrid - Daily forecast grid display
 */

import { GRID_CONFIG } from "./constants";
import { ForecastDayCell } from "./ForecastDayCell";
import type { ForecastDailyGridProps } from "./types";
import { formatDateKey, isPastDate } from "./utils/date-utils";

/**
 * Display daily forecast data in a grid layout
 * Shows all days of the target month with quantities
 */
export function ForecastDailyGrid({
  dates,
  dailyData,
  targetMonthLabel,
  todayKey,
  todayStart,
}: ForecastDailyGridProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
        <span>日次予測</span>
        <span>{targetMonthLabel}</span>
      </div>
      <div className="grid grid-cols-10 gap-1 text-[11px]">
        {dates.map((date) => {
          const dateKey = formatDateKey(date);
          const isPast = isPastDate(date, todayStart);

          return (
            <ForecastDayCell
              key={dateKey}
              date={date}
              quantity={dailyData.get(dateKey)}
              isToday={todayKey === dateKey}
              isPast={isPast}
            />
          );
        })}
      </div>
    </div>
  );
}
