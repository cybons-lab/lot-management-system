/**
 * Type definitions for ForecastDetailCard components
 */

import type { ForecastGroup } from "../../api";

export interface ForecastDetailCardProps {
  group: ForecastGroup;
  onDelete?: (forecastId: number) => void;
  isDeleting?: boolean;
  isOpen?: boolean;
  isActive?: boolean;
  isFocused?: boolean;
  onToggle?: () => void;
}

export interface AggregationMonth {
  year: number;
  month: number; // 0-indexed
}

export interface DekadData {
  label: string;
  total: number;
}

export interface MonthlyData {
  label: string;
  total: number;
}

export interface DayCellProps {
  date: Date;
  quantity: number | undefined;
  isToday: boolean;
  isPast: boolean;
}

export interface ForecastCardHeaderProps {
  targetMonthLabel: string;
  customerDisplay: string;
  productName: string;
  productCode: string | null | undefined;
  deliveryPlaceDisplay: string;
  groupKey: string;
  isActive: boolean;
  isOpen: boolean;
  onToggle?: () => void;
  onAutoAllocate?: () => void;
  onDelete?: (forecastId: number) => void;
  isDeleting?: boolean;
  firstForecastId?: number;
}

export interface ForecastDailyGridProps {
  dates: Date[];
  dailyData: Map<string, number>;
  targetMonthLabel: string;
  todayKey: string;
  todayStart: Date;
}

export interface ForecastAggregationsProps {
  dekadData: DekadData[];
  monthlyData: MonthlyData | null;
}

export interface ForecastCollapsedSummaryProps {
  targetMonthLabel: string;
  roundedTotal: number;
  unit: string;
}
