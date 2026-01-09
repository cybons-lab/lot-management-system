/**
 * Custom hook for forecast data calculations
 */

import { useMemo } from "react";

import type { ForecastGroup } from "../../../api";
import type { AggregationMonth, DekadData, MonthlyData } from "../types";
import {
  calculateDailyTotal,
  calculateDekadAggregations,
  calculateMonthlyAggregation,
} from "../utils/aggregation-utils";

import {
  getDatesForMonth,
  getDatesForNextMonthFirst10Days,
  getMonthStart,
} from "@/shared/utils/date";

interface UseForecastCalculationsResult {
  dailyData: Map<string, number>;
  dailyForecastIds: Map<string, number>;
  unit: string;
  targetMonthStartDate: Date;
  /** 当月の全日付 */
  currentMonthDates: Date[];
  /** 翌月1日〜10日の日付 */
  nextMonthFirst10Dates: Date[];
  dekadMonth: AggregationMonth;
  monthlyMonth: AggregationMonth;
  dekadData: DekadData[];
  monthlyData: MonthlyData | null;
  targetMonthTotal: number;
  /** 翌月10日までの合計 */
  nextMonthFirst10Total: number;
}

/**
 * Calculate all forecast-related data for display
 * @param group - Forecast group containing forecasts data
 * @returns Calculated data for rendering
 */
export function useForecastCalculations(group: ForecastGroup): UseForecastCalculationsResult {
  const { forecasts = [] } = group;

  // Separate forecasts by forecast_period
  // - Daily forecasts: forecast_period matches forecast_date's month
  // - Jyun forecasts: forecast_period is next month
  // - Monthly forecasts: forecast_period is 2 months later
  const { dailyForecasts, jyunForecasts, monthlyForecasts } = useMemo(() => {
    const daily: typeof forecasts = [];
    const jyun: typeof forecasts = [];
    const monthly: typeof forecasts = [];

    for (const forecast of forecasts) {
      const forecastDate = new Date(forecast.forecast_date);
      const forecastPeriod = forecast.forecast_period; // YYYY-MM format
      const forecastMonth = forecastDate.toISOString().slice(0, 7); // YYYY-MM

      if (forecastPeriod === forecastMonth) {
        // Daily forecast: period matches date's month
        daily.push(forecast);
      } else {
        // Parse forecast_period to check if it's next month or month+2
        const [periodYear, periodMonth] = forecastPeriod.split("-").map(Number);
        const [dateYear, dateMonth] = forecastMonth.split("-").map(Number);

        const periodDate = new Date(periodYear!, periodMonth! - 1, 1);
        const dateDate = new Date(dateYear!, dateMonth! - 1, 1);
        const monthsDiff =
          (periodDate.getFullYear() - dateDate.getFullYear()) * 12 +
          (periodDate.getMonth() - dateDate.getMonth());

        if (monthsDiff === 1) {
          // Jyun forecast: period is next month
          jyun.push(forecast);
        } else if (monthsDiff === 2) {
          // Monthly forecast: period is 2 months later
          monthly.push(forecast);
        }
      }
    }

    return { dailyForecasts: daily, jyunForecasts: jyun, monthlyForecasts: monthly };
  }, [forecasts]);

  // Build daily data map from daily forecasts only
  const dailyData = useMemo(() => {
    const dataMap = new Map<string, number>();
    for (const forecast of dailyForecasts) {
      const qty = Number(forecast.forecast_quantity) || 0;
      dataMap.set(forecast.forecast_date, qty);
    }
    return dataMap;
  }, [dailyForecasts]);

  // Build daily forecast ID map (date -> forecast_id)
  // Note: Use the same date key format as ForecastDailyGrid
  const dailyForecastIds = useMemo(() => {
    const idMap = new Map<string, number>();
    for (const forecast of dailyForecasts) {
      // forecast.forecast_date is in YYYY-MM-DD format from API
      // Use it directly as the key since dailyData also uses it
      idMap.set(forecast.forecast_date, forecast.id);
    }
    return idMap;
  }, [dailyForecasts]);

  // Get unit from first forecast
  const unit = forecasts[0]?.unit ?? "EA";

  // Determine target month start date
  const targetMonthStartDate = useMemo(() => {
    if (forecasts.length > 0) {
      const firstDate = forecasts[0]?.forecast_date;
      if (firstDate) {
        const base = new Date(firstDate);
        return getMonthStart(base);
      }
    }

    const today = new Date();
    return getMonthStart(today);
  }, [forecasts]);

  // Generate all dates for the current target month
  const currentMonthDates = useMemo(
    () => getDatesForMonth(targetMonthStartDate),
    [targetMonthStartDate],
  );

  // Generate dates for next month's first 10 days (SAP format)
  const nextMonthFirst10Dates = useMemo(
    () => getDatesForNextMonthFirst10Days(targetMonthStartDate),
    [targetMonthStartDate],
  );

  // Calculate aggregation months (dekad: next month, monthly: month after next)
  const { dekadMonth, monthlyMonth } = useMemo(() => {
    const baseDate = new Date(targetMonthStartDate);
    const dekadDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
    const monthlyDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 1);

    return {
      dekadMonth: { year: dekadDate.getFullYear(), month: dekadDate.getMonth() },
      monthlyMonth: { year: monthlyDate.getFullYear(), month: monthlyDate.getMonth() },
    };
  }, [targetMonthStartDate]);

  // Calculate dekad aggregations from jyun forecasts
  // SAP format: only 中旬 (11-20) and 下旬 (21-end), no 上旬 (1-10)
  const dekadData = useMemo(() => {
    if (jyunForecasts.length === 0) {
      // Fallback: calculate from daily data if no jyun forecasts available
      return calculateDekadAggregations(dailyData, dekadMonth);
    }

    // Use jyun forecast data directly
    // Jyun forecasts have forecast_date on 11th or 21st (no 1st for 上旬)
    const dekadMap = new Map<number, number>();

    for (const forecast of jyunForecasts) {
      const date = new Date(forecast.forecast_date);
      const day = date.getDate();
      const qty = Number(forecast.forecast_quantity) || 0;

      if (day === 11) {
        dekadMap.set(11, qty); // 中旬
      } else if (day === 21) {
        dekadMap.set(21, qty); // 下旬
      }
      // Note: day === 1 (上旬) is intentionally skipped
    }

    const monthLabel = `${dekadMonth.month + 1}月`;

    return [
      { label: `${monthLabel} 中旬`, total: Math.round(dekadMap.get(11) || 0) },
      { label: `${monthLabel} 下旬`, total: Math.round(dekadMap.get(21) || 0) },
    ];
  }, [jyunForecasts, dailyData, dekadMonth]);

  // Calculate monthly aggregation from monthly forecasts
  const monthlyData = useMemo(() => {
    if (monthlyForecasts.length === 0) {
      // Fallback: calculate from daily data if no monthly forecasts available
      return calculateMonthlyAggregation(dailyData, monthlyMonth);
    }

    // Use monthly forecast data directly (should only be one entry)
    const monthlyForecast = monthlyForecasts[0];
    if (!monthlyForecast) return null;

    const qty = Number(monthlyForecast.forecast_quantity) || 0;

    return {
      label: `${monthlyMonth.year}年${monthlyMonth.month + 1}月`,
      total: Math.round(qty),
    };
  }, [monthlyForecasts, dailyData, monthlyMonth]);

  // Calculate target month total
  const targetMonthTotal = useMemo(
    () => calculateDailyTotal(currentMonthDates, dailyData),
    [currentMonthDates, dailyData],
  );

  // Calculate next month first 10 days total
  const nextMonthFirst10Total = useMemo(
    () => calculateDailyTotal(nextMonthFirst10Dates, dailyData),
    [nextMonthFirst10Dates, dailyData],
  );

  return {
    dailyData,
    dailyForecastIds,
    unit,
    targetMonthStartDate,
    currentMonthDates,
    nextMonthFirst10Dates,
    dekadMonth,
    monthlyMonth,
    dekadData,
    monthlyData,
    targetMonthTotal,
    nextMonthFirst10Total,
  };
}
