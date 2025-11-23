import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { motion } from "framer-motion";

import type { Forecast } from "@/features/forecasts/api";

interface ForecastTooltipProps {
  forecasts: Forecast[];
  isLoading: boolean;
}

export function ForecastTooltip({ forecasts, isLoading }: ForecastTooltipProps) {
  // 今日の日付
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 表示する期間（昨日〜7日後）
  const displayForecasts = forecasts.filter((f) => {
    const d = new Date(f.forecast_date);
    d.setHours(0, 0, 0, 0);
    const diffTime = d.getTime() - today.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return diffDays >= -1 && diffDays <= 7;
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -10, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute right-0 bottom-full z-50 mb-2 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-xl ring-1 ring-black/5"
    >
      <div className="mb-2 flex items-center gap-2 border-b border-gray-100 pb-2">
        <span className="i-lucide-trending-up h-4 w-4 text-blue-500" />
        <h4 className="text-xs font-bold text-gray-700">フォーキャスト (直近)</h4>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : displayForecasts.length === 0 ? (
        <div className="py-2 text-center text-xs text-gray-400">データなし</div>
      ) : (
        <div className="space-y-1.5">
          {displayForecasts.map((f) => {
            const d = new Date(f.forecast_date);
            d.setHours(0, 0, 0, 0);
            const isToday = d.getTime() === today.getTime();

            return (
              <div
                key={f.id}
                className={`flex items-center justify-between rounded px-1.5 py-0.5 text-xs ${
                  isToday ? "bg-blue-50 font-bold text-blue-700" : "text-gray-600"
                }`}
              >
                <span>{format(d, "MM/dd (eee)", { locale: ja })}</span>
                <span className={isToday ? "text-blue-700" : "text-gray-900"}>
                  {f.forecast_quantity.toLocaleString()} {f.unit || ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
