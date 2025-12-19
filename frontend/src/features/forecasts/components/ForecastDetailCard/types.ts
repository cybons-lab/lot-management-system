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
  forecastId: number | undefined;
  isToday: boolean;
  isPast: boolean;
  hoveredDate?: string | null;
  onDateHover?: (date: string | null) => void;
  onUpdateQuantity?: (forecastId: number, newQuantity: number) => Promise<void>;
  onCreateForecast?: (dateKey: string, quantity: number) => Promise<void>;
  isUpdating?: boolean;
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
  onRegenerateSuggestions?: () => void;
  onDelete?: (forecastId: number) => void;
  isDeleting?: boolean;
  firstForecastId?: number;
}

export interface ForecastDailyGridProps {
  dates: Date[];
  dailyData: Map<string, number>;
  dailyForecastIds: Map<string, number>;
  targetMonthLabel: string;
  todayKey: string;
  todayStart: Date;
  hoveredDate?: string | null;
  onDateHover?: (date: string | null) => void;
  onUpdateQuantity?: (forecastId: number, newQuantity: number) => Promise<void>;
  onCreateForecast?: (dateKey: string, quantity: number) => Promise<void>;
  isUpdating?: boolean;
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
