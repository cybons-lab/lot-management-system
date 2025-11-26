/**
 * ForecastDetailCard - Visual forecast display with grid layout (v2.5 - Refactored)
 *
 * 3-section layout:
 * - Section 1: Compact header (customer, product, delivery place)
 * - Section 2: Daily grid that always starts on the first day of the target month
 * - Section 3: Dekad (left) and Monthly (right) aggregations beneath the grid
 */

import { useNavigate } from "react-router-dom";

import { ForecastAggregations } from "./ForecastAggregations";
import { ForecastCardHeader } from "./ForecastCardHeader";
import { ForecastCollapsedSummary } from "./ForecastCollapsedSummary";
import { ForecastDailyGrid } from "./ForecastDailyGrid";
import { useForecastCalculations } from "./hooks/use-forecast-calculations";
import type { ForecastDetailCardProps } from "./types";
import { formatDateKey, getTodayStart } from "./utils/date-utils";

import { Button, Card, CardContent } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
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
  const navigate = useNavigate();
  const { group_key, forecasts } = group;

  // Calculate all forecast data using custom hook
  const { dailyData, unit, targetMonthStartDate, dates, dekadData, monthlyData, targetMonthTotal } =
    useForecastCalculations(group);

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
  const targetMonthLabel = `${targetMonthStartDate.getFullYear()}年${
    targetMonthStartDate.getMonth() + 1
  }月`;

  const customerDisplay = group_key.customer_name ?? `得意先ID:${group_key.customer_id}`;
  const deliveryPlaceDisplay =
    group_key.delivery_place_name ?? `納入先ID:${group_key.delivery_place_id}`;
  const productName = group_key.product_name ?? `製品ID:${group_key.product_id}`;
  const productCode = group_key.product_code;

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
              />

              <ForecastAggregations dekadData={dekadData} monthlyData={monthlyData} />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 md:col-span-5">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">関連情報</h4>
              <div className="space-y-3">
                <div className="rounded-md bg-blue-50 p-3">
                  <div className="mb-2 text-xs font-medium text-blue-700">在庫状況</div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-blue-600">この製品の在庫状況を確認します</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 bg-white text-xs hover:bg-blue-100"
                      onClick={() =>
                        navigate(`${ROUTES.INVENTORY.SUMMARY}?product_id=${group_key.product_id}`)
                      }
                    >
                      在庫を確認
                    </Button>
                  </div>
                </div>

                <div className="rounded-md bg-green-50 p-3">
                  <div className="mb-2 text-xs font-medium text-green-700">入荷予定</div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-green-600">この製品の入荷予定を確認します</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 bg-white text-xs hover:bg-green-100"
                      onClick={() =>
                        navigate(`${ROUTES.INBOUND_PLANS.LIST}?product_id=${group_key.product_id}`)
                      }
                    >
                      入荷予定を確認
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
