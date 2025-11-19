/**
 * ForecastDetailCard - Visual forecast display with grid layout (v2.4)
 *
 * 3-section layout:
 * - Section 1: Compact header (customer, product, delivery place)
 * - Section 2: Daily grid that always starts on the first day of the target month
 * - Section 3: Dekad (left) and Monthly (right) aggregations beneath the grid
 */

import { useMemo } from "react";

import { ChevronDown } from "lucide-react";

import type { ForecastGroup } from "../api";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/shared/libs/utils";

interface ForecastDetailCardProps {
  group: ForecastGroup;
  onDelete?: (forecastId: number) => void;
  isDeleting?: boolean;
  isOpen?: boolean;
  isActive?: boolean;
  isFocused?: boolean;
  onToggle?: () => void;
}

interface AggregationMonth {
  year: number;
  month: number; // 0-indexed
}

function getDatesForMonth(targetMonth: Date): Date[] {
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => new Date(year, month, index + 1));
}

/**
 * Format date as YYYY-MM-DD for comparison
 */
function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

/**
 * Render a single day cell for the grid (CSS Grid version)
 */
function DayCell({
  date,
  quantity,
  isToday,
  isPast,
}: {
  date: Date;
  quantity: number | undefined;
  isToday: boolean;
  isPast: boolean;
}) {
  const hasValue = quantity !== undefined && quantity !== null;
  const roundedQty = hasValue ? Math.round(Number(quantity)) : null;
  const isZero = roundedQty === 0;
  const displayValue = roundedQty === null ? "-" : roundedQty.toLocaleString("ja-JP");

  return (
    <div
      className={cn(
        "rounded border bg-white px-1 py-0.5 text-[11px] leading-tight transition",
        "focus-within:ring-1 focus-within:ring-blue-200",
        isToday ? "border-blue-400 ring-1 ring-blue-100" : "border-gray-200",
        isPast ? "opacity-80" : undefined,
      )}
      aria-disabled={isPast}
      data-locked={isPast ? "true" : undefined}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] text-gray-500">{date.getDate()}</span>
        <span
          className={cn(
            "text-xs tabular-nums",
            !hasValue || isZero
              ? "text-gray-400"
              : isPast
                ? "text-gray-400"
                : "font-semibold text-gray-900",
          )}
        >
          {displayValue}
        </span>
      </div>
    </div>
  );
}

function calculateDekadAggregations(
  dailyData: Map<string, number>,
  dekadMonth: AggregationMonth | null,
) {
  if (!dekadMonth) return [];

  let jouTotal = 0;
  let chuTotal = 0;
  let geTotal = 0;

  for (const [dateStr, qty] of dailyData) {
    const date = new Date(dateStr);
    if (date.getFullYear() === dekadMonth.year && date.getMonth() === dekadMonth.month) {
      const day = date.getDate();
      const numQty = Number(qty) || 0;
      if (day <= 10) {
        jouTotal += numQty;
      } else if (day <= 20) {
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

function calculateMonthlyAggregation(
  dailyData: Map<string, number>,
  monthlyMonth: AggregationMonth | null,
) {
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

export function ForecastDetailCard({
  group,
  onDelete,
  isDeleting,
  isOpen = true,
  isActive = false,
  isFocused = false,
  onToggle,
}: ForecastDetailCardProps) {
  const { group_key, forecasts } = group;

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

  const targetMonthStartDate = useMemo(() => {
    if (forecasts.length > 0) {
      const firstDate = forecasts[0]?.forecast_date;
      if (firstDate) {
        const base = new Date(firstDate);
        return new Date(base.getFullYear(), base.getMonth(), 1);
      }
    }

    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, [forecasts]);

  const dates = useMemo(() => getDatesForMonth(targetMonthStartDate), [targetMonthStartDate]);

  const { dekadMonth, monthlyMonth } = useMemo(() => {
    const baseDate = new Date(targetMonthStartDate);
    const dekadDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
    const monthlyDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 1);

    return {
      dekadMonth: { year: dekadDate.getFullYear(), month: dekadDate.getMonth() },
      monthlyMonth: { year: monthlyDate.getFullYear(), month: monthlyDate.getMonth() },
    };
  }, [targetMonthStartDate]);

  if (forecasts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          フォーキャストデータがありません
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const todayKey = formatDateKey(now);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMonthLabel = `${targetMonthStartDate.getFullYear()}年${
    targetMonthStartDate.getMonth() + 1
  }月`;

  const customerDisplay = group_key.customer_name ?? `得意先ID:${group_key.customer_id}`;
  const deliveryPlaceDisplay =
    group_key.delivery_place_name ?? `納入先ID:${group_key.delivery_place_id}`;
  const productName = group_key.product_name ?? `製品ID:${group_key.product_id}`;
  const productCode = group_key.product_code;

  const dekadData = calculateDekadAggregations(dailyData, dekadMonth);
  const monthlyData = calculateMonthlyAggregation(dailyData, monthlyMonth);

  const targetMonthTotal = dates.reduce((sum, date) => {
    const qty = dailyData.get(formatDateKey(date)) ?? 0;
    const numericQty = Number(qty);
    return sum + (Number.isFinite(numericQty) ? numericQty : 0);
  }, 0);
  const roundedTotal = Math.round(targetMonthTotal);

  const groupKey = `${group_key.customer_id}-${group_key.delivery_place_id}-${group_key.product_id}`;

  return (
    <Card
      className={cn(
        "overflow-hidden border shadow-sm transition-all duration-300 ease-out",
        isActive
          ? "border-primary/60 bg-slate-50 shadow-md"
          : isFocused
            ? "border-primary/40 ring-primary/20 scale-[1.005] bg-white shadow-md ring-1"
            : "border-slate-200 bg-white",
      )}
      data-group-key={groupKey}
    >
      <div
        className={cn(
          "border-b px-4 py-3",
          isActive ? "border-primary/20 bg-slate-100" : "border-slate-200 bg-slate-50",
        )}
      >
        <div className="flex flex-row items-start justify-between gap-4">
          <button
            type="button"
            className="focus-visible:ring-primary/40 flex flex-1 flex-col items-start gap-1.5 text-left focus-visible:ring-2 focus-visible:outline-none"
            onClick={() => onToggle?.()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onToggle?.();
              }
            }}
          >
            {/* 上段: 月表示 */}
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-gray-500">{targetMonthLabel}</span>
            </div>

            {/* 下段: 得意先 / 製品 / 納入先 */}
            <div className="line-clamp-2 text-xs text-gray-500">
              <span className="text-sm font-semibold text-gray-500">{customerDisplay}</span>
              <span className="mx-1 text-gray-300">/</span>
              <span className="text-base font-bold text-gray-900">
                {productName}
                {productCode ? (
                  <span className="text-sm font-semibold text-gray-700"> ({productCode})</span>
                ) : null}
              </span>
              <span className="mx-1 text-gray-300">/</span>
              <span className="text-sm text-gray-500">{deliveryPlaceDisplay}</span>
            </div>
          </button>

          {/* 右側: 削除ボタンとシェブロン */}
          <div className="flex flex-shrink-0 items-center gap-2 pt-1">
            {onDelete && forecasts.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={(event) => {
                  event.stopPropagation();
                  // Delete first forecast in the group as representative
                  onDelete(forecasts[0]?.id ?? 0);
                }}
                disabled={isDeleting}
              >
                削除
              </Button>
            ) : null}

            <div className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100">
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-gray-400 transition-transform",
                  isOpen ? "rotate-180" : "rotate-0",
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {isOpen ? (
        <CardContent className="space-y-4 p-4">
          <div className="text-xs text-gray-500">単位: {unit}</div>

          <div className="grid gap-6 md:grid-cols-12">
            <div className="space-y-4 md:col-span-7">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                  <span>日次予測</span>
                  <span>{targetMonthLabel}</span>
                </div>
                <div className="grid grid-cols-10 gap-1 text-[11px]">
                  {dates.map((date) => {
                    const dateKey = formatDateKey(date);
                    const isPastDate = date < todayStart;
                    return (
                      <DayCell
                        key={dateKey}
                        date={date}
                        quantity={dailyData.get(dateKey)}
                        isToday={todayKey === dateKey}
                        isPast={isPastDate}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-6 border-t pt-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">旬別予測</h4>
                  {dekadData.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                      {dekadData.map((dekad) => (
                        <div
                          key={dekad.label}
                          className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-center"
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

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">月別予測</h4>
                  {monthlyData ? (
                    <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-center">
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
            </div>

            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 p-4 text-sm text-gray-400 md:col-span-5">
              TODO: graphs or indicators
            </div>
          </div>
        </CardContent>
      ) : (
        <div className="border-t border-slate-100 bg-white px-4 py-3 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>月合計 ({targetMonthLabel})</span>
            <span className="font-semibold text-gray-900">
              {roundedTotal.toLocaleString("ja-JP")}
              <span className="ml-1 text-xs text-gray-500">{unit}</span>
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
