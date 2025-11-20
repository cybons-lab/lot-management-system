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
import { getDatesForMonth, getMonthStart } from "../utils/date-utils";

interface UseForecastCalculationsResult {
  dailyData: Map<string, number>;
  unit: string;
  targetMonthStartDate: Date;
  dates: Date[];
  dekadMonth: AggregationMonth;
  monthlyMonth: AggregationMonth;
  dekadData: DekadData[];
  monthlyData: MonthlyData | null;
  targetMonthTotal: number;
}

/**
 * Calculate all forecast-related data for display
 * @param group - Forecast group containing forecasts data
 * @returns Calculated data for rendering
 */
export function useForecastCalculations(group: ForecastGroup): UseForecastCalculationsResult {
  const { forecasts } = group;

  // Build daily data map from forecasts
  const dailyData = useMemo(() => {
    const dataMap = new Map<string, number>();
    for (const forecast of forecasts) {
      const qty = Number(forecast.forecast_quantity) || 0;
      dataMap.set(forecast.forecast_date, qty);
    }
    return dataMap;
  }, [forecasts]);

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

  // Generate all dates for the target month
  const dates = useMemo(() => getDatesForMonth(targetMonthStartDate), [targetMonthStartDate]);

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

  // Calculate dekad aggregations
  const dekadData = useMemo(
    () => calculateDekadAggregations(dailyData, dekadMonth),
    [dailyData, dekadMonth],
  );

  // Calculate monthly aggregation
  const monthlyData = useMemo(
    () => calculateMonthlyAggregation(dailyData, monthlyMonth),
    [dailyData, monthlyMonth],
  );

  // Calculate target month total
  const targetMonthTotal = useMemo(() => calculateDailyTotal(dates, dailyData), [dates, dailyData]);

  return {
    dailyData,
    unit,
    targetMonthStartDate,
    dates,
    dekadMonth,
    monthlyMonth,
    dekadData,
    monthlyData,
    targetMonthTotal,
  };
}
