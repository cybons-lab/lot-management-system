/**
 * ForecastDetailCard - Visual forecast display with grid layout
 *
 * 5-section layout:
 * - Section 1: Header info (product, delivery place, customer)
 * - Section 2-4: 31-day grid (3 rows of ~10-11 tiles)
 * - Section 5: Dekad (left) and Monthly (right) aggregations
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
 * Check if a date is a dekad date (1st, 11th, 21st)
 */
function isDekadDate(date: Date): boolean {
  const day = date.getDate();
  return day === 1 || day === 11 || day === 21;
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

export function ForecastDetailCard({ forecast }: ForecastDetailCardProps) {
  // Group lines by product
  const productData = useMemo(() => {
    const productMap = new Map<number, ProductForecastData>();

    for (const line of forecast.lines) {
      if (!productMap.has(line.product_id)) {
        productMap.set(line.product_id, {
          productId: line.product_id,
          productCode: line.product_code ?? `P${line.product_id}`,
          productName: line.product_name ?? `Product ${line.product_id}`,
          unit: line.unit,
          dailyData: new Map(),
        });
      }

      const data = productMap.get(line.product_id)!;
      data.dailyData.set(line.delivery_date, line.forecast_quantity);
    }

    return Array.from(productMap.values());
  }, [forecast.lines]);

  // Selected product
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    productData[0]?.productId ?? null
  );

  const selectedProduct = productData.find(p => p.productId === selectedProductId);

  // Get 31-day dates
  const dates = useMemo(() => get31DayDates(), []);

  // Split into 3 rows of ~11 tiles each
  const row1 = dates.slice(0, 11);
  const row2 = dates.slice(11, 21);
  const row3 = dates.slice(21, 31);

  // Calculate dekad aggregations
  const dekadData = useMemo(() => {
    if (!selectedProduct) return [];

    const dekads: { label: string; total: number }[] = [];
    const dekadDates = dates.filter(isDekadDate);

    for (const date of dekadDates) {
      const dateKey = formatDateKey(date);
      const qty = selectedProduct.dailyData.get(dateKey) ?? 0;
      dekads.push({
        label: formatDateShort(date),
        total: qty,
      });
    }

    return dekads;
  }, [selectedProduct, dates]);

  // Calculate monthly aggregations
  const monthlyData = useMemo(() => {
    if (!selectedProduct) return [];

    const monthlyMap = new Map<string, number>();

    for (const [dateStr, qty] of selectedProduct.dailyData) {
      const date = new Date(dateStr);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + qty);
    }

    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 4)
      .map(([key, total]) => {
        const [year, month] = key.split("-");
        return {
          label: `${year}/${month}`,
          total,
        };
      });
  }, [selectedProduct]);

  if (productData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          明細データがありません
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {/* Section 1: Header Info */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">フォーキャスト詳細</CardTitle>
            <p className="mt-1 text-sm text-gray-600">
              {forecast.forecast_number}
            </p>
          </div>
          <div className="text-right text-sm">
            <div className="text-gray-500">得意先</div>
            <div className="font-medium">
              {forecast.customer_name ?? `ID: ${forecast.customer_id}`}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <div className="text-sm text-gray-500">納入場所</div>
            <div className="font-medium">
              {forecast.delivery_place_name ?? `ID: ${forecast.delivery_place_id}`}
            </div>
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
                  <SelectItem
                    key={product.productId}
                    value={product.productId.toString()}
                  >
                    {product.productCode} - {product.productName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedProduct && (
          <div className="mt-2 text-sm text-gray-600">
            単位: {selectedProduct.unit}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Section 2-4: 31-day Grid */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-700">
            日次予測 (31日間)
          </h4>
          <div className="space-y-1">
            {/* Row 1 */}
            <div className="flex gap-1">
              {row1.map((date) => {
                const dateKey = formatDateKey(date);
                const qty = selectedProduct?.dailyData.get(dateKey);
                const isToday = formatDateKey(new Date()) === dateKey;

                return (
                  <div
                    key={dateKey}
                    className={`flex-1 rounded border p-1 text-center text-xs ${
                      isToday
                        ? "border-blue-500 bg-blue-50"
                        : qty
                          ? "border-gray-300 bg-gray-50"
                          : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="text-gray-500">{formatDateShort(date)}</div>
                    <div className={`font-medium ${qty ? "text-gray-900" : "text-gray-300"}`}>
                      {qty ?? "-"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Row 2 */}
            <div className="flex gap-1">
              {row2.map((date) => {
                const dateKey = formatDateKey(date);
                const qty = selectedProduct?.dailyData.get(dateKey);
                const isToday = formatDateKey(new Date()) === dateKey;

                return (
                  <div
                    key={dateKey}
                    className={`flex-1 rounded border p-1 text-center text-xs ${
                      isToday
                        ? "border-blue-500 bg-blue-50"
                        : qty
                          ? "border-gray-300 bg-gray-50"
                          : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="text-gray-500">{formatDateShort(date)}</div>
                    <div className={`font-medium ${qty ? "text-gray-900" : "text-gray-300"}`}>
                      {qty ?? "-"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Row 3 */}
            <div className="flex gap-1">
              {row3.map((date) => {
                const dateKey = formatDateKey(date);
                const qty = selectedProduct?.dailyData.get(dateKey);
                const isToday = formatDateKey(new Date()) === dateKey;

                return (
                  <div
                    key={dateKey}
                    className={`flex-1 rounded border p-1 text-center text-xs ${
                      isToday
                        ? "border-blue-500 bg-blue-50"
                        : qty
                          ? "border-gray-300 bg-gray-50"
                          : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="text-gray-500">{formatDateShort(date)}</div>
                    <div className={`font-medium ${qty ? "text-gray-900" : "text-gray-300"}`}>
                      {qty ?? "-"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 5: Dekad and Monthly Aggregations */}
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          {/* Dekad (left) */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-700">旬別予測</h4>
            <div className="flex flex-wrap gap-2">
              {dekadData.map((dekad, index) => (
                <div
                  key={index}
                  className="rounded border border-green-300 bg-green-50 px-2 py-1 text-center text-xs"
                >
                  <div className="text-green-600">{dekad.label}</div>
                  <div className="font-medium text-green-900">{dekad.total}</div>
                </div>
              ))}
              {dekadData.length === 0 && (
                <div className="text-sm text-gray-400">データなし</div>
              )}
            </div>
          </div>

          {/* Monthly (right) */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-700">月別予測</h4>
            <div className="flex flex-wrap gap-2">
              {monthlyData.map((month, index) => (
                <div
                  key={index}
                  className="rounded border border-purple-300 bg-purple-50 px-2 py-1 text-center text-xs"
                >
                  <div className="text-purple-600">{month.label}</div>
                  <div className="font-medium text-purple-900">{month.total}</div>
                </div>
              ))}
              {monthlyData.length === 0 && (
                <div className="text-sm text-gray-400">データなし</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
