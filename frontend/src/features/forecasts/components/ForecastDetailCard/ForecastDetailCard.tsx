/**
 * ForecastDetailCard - Visual forecast display with grid layout (v2.5 - Refactored)
 *
 * 3-section layout:
 * - Section 1: Compact header (customer, product, delivery place)
 * - Section 2: Daily grid that always starts on the first day of the target month
 * - Section 3: Dekad (left) and Monthly (right) aggregations beneath the grid
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { ForecastAggregations } from "./ForecastAggregations";
import { ForecastCardHeader } from "./ForecastCardHeader";
import { ForecastCollapsedSummary } from "./ForecastCollapsedSummary";
import { ForecastDailyGrid } from "./ForecastDailyGrid";
import { useForecastCalculations } from "./hooks/use-forecast-calculations";
import { PlanningAllocationPanel } from "./PlanningAllocationPanel";
import { RelatedOrdersSection } from "./RelatedOrdersSection";
import type { ForecastDetailCardProps } from "./types";
import { formatDateKey, getTodayStart } from "./utils/date-utils";
import { WarehouseInfoCard } from "./WarehouseInfoCard";

import { bulkAutoAllocate } from "@/features/allocations/api";
import { Card, CardContent } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

export function ForecastDetailCard({
  group,
  onDelete,
  isDeleting,
  isOpen = true,
  isActive = false,
  isFocused = false,
  onToggle,
}: ForecastDetailCardProps) {
  const { group_key, forecasts = [] } = group;
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Calculate all forecast data using custom hook
  const { dailyData, unit, targetMonthStartDate, dates, dekadData, monthlyData, targetMonthTotal } =
    useForecastCalculations(group);

  // グループ自動引当 mutation
  const autoAllocateMutation = useMutation({
    mutationFn: () =>
      bulkAutoAllocate({
        product_id: group_key.product_id,
        customer_id: group_key.customer_id,
        delivery_place_id: group_key.delivery_place_id,
      }),
    onSuccess: (result) => {
      if (result.allocated_lines > 0) {
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
      // 関連クエリを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    },
    onError: (error) => {
      console.error("Auto-allocate failed:", error);
      toast.error("自動引当に失敗しました");
    },
  });

  // Early return if no forecasts
  if (forecasts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          フォーキャストデータがありません
        </CardContent>
      </Card>
    );
  }

  // Prepare display values
  const now = new Date();
  const todayKey = formatDateKey(now);
  const todayStart = getTodayStart();
  const targetMonthLabel = `${targetMonthStartDate.getFullYear()}年${targetMonthStartDate.getMonth() + 1
    }月`;

  const customerDisplay = group_key.customer_name ?? `得意先ID:${group_key.customer_id}`;
  const deliveryPlaceDisplay =
    group_key.delivery_place_name ?? `納入先ID:${group_key.delivery_place_id}`;
  const productName = group_key.product_name ?? `製品ID:${group_key.product_id}`;
  const productCode = group_key.product_code;

  const groupKey = `${group_key.customer_id}-${group_key.delivery_place_id}-${group_key.product_id}`;

  // 自動引当ハンドラー
  const handleAutoAllocate = () => {
    autoAllocateMutation.mutate();
  };

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
      <ForecastCardHeader
        targetMonthLabel={targetMonthLabel}
        customerDisplay={customerDisplay}
        productName={productName}
        productCode={productCode}
        deliveryPlaceDisplay={deliveryPlaceDisplay}
        groupKey={groupKey}
        isActive={isActive}
        isOpen={isOpen}
        onToggle={onToggle}
        onAutoAllocate={handleAutoAllocate}
        onDelete={onDelete}
        isDeleting={isDeleting}
        firstForecastId={forecasts[0]?.id}
      />

      {isOpen ? (
        <CardContent className="space-y-4 p-4">
          <div className="text-xs text-gray-500">単位: {unit}</div>

          <div className="grid gap-6 md:grid-cols-12">
            <div className="space-y-4 md:col-span-7">
              <ForecastDailyGrid
                dates={dates}
                dailyData={dailyData}
                targetMonthLabel={targetMonthLabel}
                todayKey={todayKey}
                todayStart={todayStart}
                hoveredDate={hoveredDate}
                onDateHover={setHoveredDate}
              />

              <ForecastAggregations dekadData={dekadData} monthlyData={monthlyData} />
            </div>

            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-3 md:col-span-5">
              <div>
                <h4 className="text-xs font-semibold text-gray-700">在庫情報</h4>
                <WarehouseInfoCard productId={group_key.product_id} />
              </div>

              <div className="border-t pt-3">
                <PlanningAllocationPanel
                  customerId={group_key.customer_id}
                  deliveryPlaceId={group_key.delivery_place_id}
                  productId={group_key.product_id}
                />
              </div>
            </div>
          </div>

          {/* 関連受注セクション */}
          <RelatedOrdersSection
            group={group}
            hoveredDate={hoveredDate}
            onDateHover={setHoveredDate}
          />
        </CardContent>
      ) : (
        <ForecastCollapsedSummary
          targetMonthLabel={targetMonthLabel}
          roundedTotal={targetMonthTotal}
          unit={unit}
        />
      )}
    </Card>
  );
}
