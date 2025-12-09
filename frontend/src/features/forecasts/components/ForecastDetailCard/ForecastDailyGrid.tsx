/**
 * ForecastDailyGrid - Daily forecast grid display with inline editing
 */

import { ForecastDayCell } from "./ForecastDayCell";
import type { ForecastDailyGridProps } from "./types";
import { formatDateKey, isPastDate } from "./utils/date-utils";

/**
 * Display daily forecast data in a grid layout
 * Shows all days of the target month with quantities
 * Supports inline editing of forecast values
 */
export function ForecastDailyGrid({
  dates,
  dailyData,
  dailyForecastIds,
  targetMonthLabel,
  todayKey,
  todayStart,
  hoveredDate,
  onDateHover,
  onUpdateQuantity,
  onCreateForecast,
  isUpdating,
}: ForecastDailyGridProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
        <span>日別指示</span>
        <span>{targetMonthLabel}</span>
      </div>
      <div className="grid grid-cols-10 gap-1 text-[11px]">
        {dates.map((date) => {
          const dateKey = formatDateKey(date);
          const isPast = isPastDate(date, todayStart);
          const forecastId = dailyForecastIds.get(dateKey);

          return (
            <ForecastDayCell
              key={dateKey}
              date={date}
              quantity={dailyData.get(dateKey)}
              forecastId={forecastId}
              isToday={todayKey === dateKey}
              isPast={isPast}
              hoveredDate={hoveredDate}
              onDateHover={onDateHover}
              onUpdateQuantity={onUpdateQuantity}
              onCreateForecast={onCreateForecast}
              isUpdating={isUpdating}
            />
          );
        })}
      </div>
    </div>
  );
}
