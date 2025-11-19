/**
 * ForecastDetailCard - Visual forecast display with grid layout
 *
 * 5-section layout:
 * - Section 1: Header info (product, delivery place, customer)
 * - Section 2-4: 31-day grid (3 rows using CSS Grid)
 * - Section 5: Dekad (left) and Monthly (right) aggregations
 *
 * Timeline Logic:
 * - Tier 1 (Daily): Current 31 days
 * - Tier 2 (Dekad): Next month after daily period (上旬/中旬/下旬)
 * - Tier 3 (Monthly): Month after dekad period (1 month only)
 */

import { useMemo, useState } from "react";

import type { ForecastHeaderWithLines } from "../api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ForecastDetailCardProps {
  forecast: ForecastHeaderWithLines;
}

interface ProductForecastData {
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  dailyData: Map<string, number>; // date string -> quantity
}

/**
 * Get dates for a 31-day window centered around today
 */
function get31DayDates(): Date[] {
  const today = new Date();
  const dates: Date[] = [];

  // Start from 15 days before today, go to 15 days after
  for (let i = -15; i <= 15; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }

  return dates;
}

/**
 * Format date for display
 */
function formatDateShort(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
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
}: {
  date: Date;
  quantity: number | undefined;
  isToday: boolean;
}) {
  const displayQty = quantity !== undefined ? Math.round(quantity) : null;

  return (
    <div
      className={`rounded border text-center text-xs ${
        isToday
          ? "border-blue-500 bg-blue-50"
          : displayQty !== null
            ? "border-gray-300 bg-gray-50"
            : "border-gray-200 bg-white"
      }`}
    >
      <div className="border-b border-gray-200 px-1 py-0.5 text-gray-500">
        {formatDateShort(date)}
      </div>
      <div
        className={`px-1 py-1 font-medium ${displayQty !== null ? "text-gray-900" : "text-gray-300"}`}
      >
        {displayQty !== null ? displayQty : "-"}
      </div>
    </div>
  );
}

export function ForecastDetailCard({ forecast }: ForecastDetailCardProps) {
  // Group lines by product with proper number conversion
  const productData = useMemo(() => {
    const productMap = new Map<number, ProductForecastData>();

    for (const line of forecast.lines) {
      if (!productMap.has(line.product_id)) {
        productMap.set(line.product_id, {
          productId: line.product_id,
          productCode: line.product_code ?? `P${line.product_id}`,
          productName: line.product_name ?? "名称未定",
          unit: line.unit,
          dailyData: new Map(),
        });
      }

      const data = productMap.get(line.product_id)!;
      // Ensure quantity is converted to number (fix NaN issue)
      const qty = Number(line.quantity) || 0;
      data.dailyData.set(line.delivery_date, qty);
    }

    return Array.from(productMap.values());
  }, [forecast.lines]);

  // Selected product
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    productData[0]?.productId ?? null,
  );

  const selectedProduct = productData.find((p) => p.productId === selectedProductId);

  // Get 31-day dates
  const dates = useMemo(() => get31DayDates(), []);

  // Split into 3 rows for CSS Grid (10 columns each, last row has remainder)
  const row1 = dates.slice(0, 10);
  const row2 = dates.slice(10, 20);
  const row3 = dates.slice(20, 31);

  // Calculate the target months for dekad and monthly
  const { dekadMonth, monthlyMonth } = useMemo(() => {
    // Get the last date of the daily period
    const lastDailyDate = dates[dates.length - 1];
    if (!lastDailyDate) {
      return { dekadMonth: null, monthlyMonth: null };
    }

    // Dekad month: next month after the last daily date
    const dekadDate = new Date(lastDailyDate);
    dekadDate.setMonth(dekadDate.getMonth() + 1);
    dekadDate.setDate(1);

    // Monthly month: month after dekad
    const monthlyDate = new Date(dekadDate);
    monthlyDate.setMonth(monthlyDate.getMonth() + 1);

    return {
      dekadMonth: { year: dekadDate.getFullYear(), month: dekadDate.getMonth() },
      monthlyMonth: { year: monthlyDate.getFullYear(), month: monthlyDate.getMonth() },
    };
  }, [dates]);

  // Calculate dekad aggregations for the target month
  const dekadData = useMemo(() => {
    if (!selectedProduct || !dekadMonth) return [];

    // Sum quantities for each dekad period (1-10, 11-20, 21-end)
    let jouTotal = 0;
    let chuTotal = 0;
    let geTotal = 0;

    for (const [dateStr, qty] of selectedProduct.dailyData) {
      const date = new Date(dateStr);
      if (date.getFullYear() === dekadMonth.year && date.getMonth() === dekadMonth.month) {
        const day = date.getDate();
        // Ensure qty is a valid number
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
  }, [selectedProduct, dekadMonth]);

  // Calculate monthly aggregation for the target month (single month)
  const monthlyData = useMemo(() => {
    if (!selectedProduct || !monthlyMonth) return null;

    let total = 0;

    for (const [dateStr, qty] of selectedProduct.dailyData) {
      const date = new Date(dateStr);
      if (date.getFullYear() === monthlyMonth.year && date.getMonth() === monthlyMonth.month) {
        // Ensure qty is a valid number
        const numQty = Number(qty) || 0;
        total += numQty;
      }
    }

    return {
      label: `${monthlyMonth.year}年${monthlyMonth.month + 1}月`,
      total: Math.round(total),
    };
  }, [selectedProduct, monthlyMonth]);

  if (productData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">明細データがありません</CardContent>
      </Card>
    );
  }

  const todayKey = formatDateKey(new Date());

  // Format display strings for customer and delivery place
  const customerDisplay = forecast.customer_name
    ? `${forecast.customer_id} : ${forecast.customer_name}`
    : `ID: ${forecast.customer_id} : 名称未定`;

  const deliveryPlaceDisplay = forecast.delivery_place_name
    ? `${forecast.delivery_place_id} : ${forecast.delivery_place_name}`
    : `ID: ${forecast.delivery_place_id} : 名称未定`;

  return (
    <Card>
      {/* Section 1: Header Info */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">フォーキャスト詳細</CardTitle>
            <p className="mt-1 text-sm text-gray-600">{forecast.forecast_number}</p>
          </div>
          <div className="text-right text-sm">
            <div className="text-gray-500">得意先</div>
            <div className="font-medium">{customerDisplay}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <div className="text-sm text-gray-500">納入場所</div>
            <div className="font-medium">{deliveryPlaceDisplay}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">製品選択</div>
            <Select
              value={selectedProductId?.toString() ?? ""}
              onValueChange={(value) => setSelectedProductId(Number(value))}
            >
              <SelectTrigger className="mt-1 h-8">
                <SelectValue placeholder="製品を選択" />
              </SelectTrigger>
              <SelectContent>
                {productData.map((product) => (
                  <SelectItem key={product.productId} value={product.productId.toString()}>
                    {product.productCode} : {product.productName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedProduct && (
          <div className="mt-2 text-sm text-gray-600">
            選択中: {selectedProduct.productCode} : {selectedProduct.productName} （単位:{" "}
            {selectedProduct.unit}）
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Section 2-4: 31-day Grid using CSS Grid */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-700">日次予測 (31日間)</h4>
          <div className="space-y-1">
            {/* Row 1: 10 cells */}
            <div className="grid grid-cols-10 gap-0.5">
              {row1.map((date) => {
                const dateKey = formatDateKey(date);
                return (
                  <DayCell
                    key={dateKey}
                    date={date}
                    quantity={selectedProduct?.dailyData.get(dateKey)}
                    isToday={todayKey === dateKey}
                  />
                );
              })}
            </div>

            {/* Row 2: 10 cells */}
            <div className="grid grid-cols-10 gap-0.5">
              {row2.map((date) => {
                const dateKey = formatDateKey(date);
                return (
                  <DayCell
                    key={dateKey}
                    date={date}
                    quantity={selectedProduct?.dailyData.get(dateKey)}
                    isToday={todayKey === dateKey}
                  />
                );
              })}
            </div>

            {/* Row 3: 11 cells (remainder) */}
            <div className="grid grid-cols-10 gap-0.5">
              {row3.map((date) => {
                const dateKey = formatDateKey(date);
                return (
                  <DayCell
                    key={dateKey}
                    date={date}
                    quantity={selectedProduct?.dailyData.get(dateKey)}
                    isToday={todayKey === dateKey}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 5: Dekad and Monthly Aggregations */}
        <div className="grid grid-cols-2 gap-6 border-t pt-4">
          {/* Dekad (left) */}
          <div>
            <h4 className="mb-3 font-semibold text-gray-700">旬別予測</h4>
            <div className="flex gap-3">
              {dekadData.map((dekad) => (
                <div
                  key={dekad.label}
                  className="flex-1 rounded-lg border-2 border-green-300 bg-green-50 px-3 py-2 text-center"
                >
                  <div className="text-sm font-medium text-green-700">{dekad.label}</div>
                  <div className="mt-1 text-xl font-bold text-green-900">{dekad.total}</div>
                </div>
              ))}
              {dekadData.length === 0 && <div className="text-sm text-gray-400">データなし</div>}
            </div>
          </div>

          {/* Monthly (right) */}
          <div>
            <h4 className="mb-3 font-semibold text-gray-700">月別予測</h4>
            {monthlyData ? (
              <div className="rounded-lg border-2 border-purple-300 bg-purple-50 px-4 py-3 text-center">
                <div className="text-sm font-medium text-purple-700">{monthlyData.label}</div>
                <div className="mt-1 text-2xl font-bold text-purple-900">{monthlyData.total}</div>
              </div>
            ) : (
              <div className="text-sm text-gray-400">データなし</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
