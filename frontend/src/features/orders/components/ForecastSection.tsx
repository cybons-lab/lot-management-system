import { useQuery } from "@tanstack/react-query";
import * as React from "react";
// frontend/src/features/orders/components/ForecastSection.tsx

import { getForecastByCodes } from "@/features/forecast/api";
import type { ForecastResponse } from "@/shared/types/forecast";

type Props = {
  productCode?: string;
  customerCode?: string;
  fullWidth?: boolean;
};

export function ForecastSection({ productCode, customerCode, fullWidth = false }: Props) {
  const [isOpen, setIsOpen] = React.useState(false);

  const forecastQ = useQuery<ForecastResponse[]>({
    queryKey: ["forecast", productCode, customerCode],
    queryFn: () => getForecastByCodes(productCode as string, customerCode as string),
    enabled: isOpen && !!productCode && !!customerCode,
    staleTime: 1000 * 60,
  });

  if (!productCode || !customerCode) return null;

  const forecasts = forecastQ.data ?? [];
  const hasForecast = forecasts.length > 0;

  const renderPeriod = (forecast: ForecastResponse) => {
    switch (forecast.granularity) {
      case "daily":
        return forecast.date_day ?? "日次";
      case "dekad":
        return forecast.date_dekad_start ?? "旬次";
      case "monthly":
      default:
        return forecast.year_month ?? "月次";
    }
  };

  return (
    <div className={`rounded-lg border ${fullWidth ? "w-full" : ""}`}>
      <button
        className="flex w-full items-center justify-between p-3 text-left hover:bg-gray-50"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="flex flex-col">
          <span className="text-sm font-medium">フォーキャスト</span>
          <span className="text-xs text-gray-500">
            {productCode} × {customerCode}
          </span>
        </div>
        <span className="text-gray-400">{isOpen ? "▼" : "▶"}</span>
      </button>

      {isOpen && (
        <div className="space-y-4 border-t bg-gray-50 p-4">
          {forecastQ.isLoading ? (
            <div className="text-xs text-gray-500">フォーキャストを読み込み中...</div>
          ) : hasForecast ? (
            <div className="space-y-3">
              <div className="text-xs text-gray-600">
                アクティブなフォーキャストが {forecasts.length} 件見つかりました。
              </div>
              <div className="grid gap-3 text-xs sm:grid-cols-2 md:grid-cols-3">
                {forecasts.slice(0, 3).map((f) => (
                  <div key={f.id} className="rounded border bg-white p-3 shadow-sm">
                    <div className="text-[11px] text-gray-400 uppercase">{f.granularity}</div>
                    <div className="text-sm font-semibold text-gray-800">{renderPeriod(f)}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      予測数量: {(f.qty_forecast ?? 0).toLocaleString()} EA
                    </div>
                    <div className="mt-1 text-[11px] text-gray-400">
                      v{f.version_no}・
                      {f.version_issued_at
                        ? new Date(f.version_issued_at).toLocaleDateString()
                        : "日付不明"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded border border-dashed border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              得意先 {customerCode} 向けの {productCode} フォーキャストは登録されていません。
            </div>
          )}

          {forecastQ.isError && (
            <div className="text-xs text-red-600">
              フォーキャスト情報の取得に失敗しました。後でもう一度お試しください。
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-xs">
            <a
              href={`/forecast?product=${encodeURIComponent(productCode)}&client=${encodeURIComponent(customerCode)}`}
              className="inline-flex items-center gap-1 rounded bg-sky-600 px-3 py-1.5 text-white hover:bg-sky-700"
            >
              詳細を開く
            </a>
            <a
              href="/forecast"
              className="inline-flex items-center gap-1 rounded border px-3 py-1.5 hover:bg-gray-100"
            >
              フォーキャスト一覧
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
