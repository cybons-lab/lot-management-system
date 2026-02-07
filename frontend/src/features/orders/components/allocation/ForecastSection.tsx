import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { getForecasts, type ForecastListResponse, type Forecast } from "@/features/forecasts/api";
import { formatDate } from "@/shared/utils/date";

interface Props {
  productGroupId?: number;
  customerId?: number;
  fullWidth?: boolean;
}

export function ForecastSection({ productGroupId, customerId, fullWidth = false }: Props) {
  const [isOpen, setIsOpen] = React.useState(false);

  const forecastQ = useQuery<ForecastListResponse>({
    queryKey: ["forecast", productGroupId, customerId],
    queryFn: () =>
      getForecasts({
        supplier_item_id: productGroupId,
        customer_id: customerId,
      }),
    enabled: isOpen && productGroupId != null && customerId != null,
    staleTime: 1000 * 60,
  });

  if (!productGroupId || !customerId) return null;

  // Extract forecasts from first group (or flatten all groups)
  const allForecasts: Forecast[] = [];
  if (forecastQ.data?.items) {
    for (const group of forecastQ.data.items) {
      allForecasts.push(...(group.forecasts ?? []));
    }
  }

  // Sort by forecast_date ascending and take upcoming ones
  const sortedForecasts = allForecasts
    .filter((f) => new Date(f.forecast_date) >= new Date())
    .sort((a, b) => new Date(a.forecast_date).getTime() - new Date(b.forecast_date).getTime())
    .slice(0, 6);

  const hasForecast = sortedForecasts.length > 0;
  const totalGroups = forecastQ.data?.total ?? 0;

  return (
    <div className={`rounded-lg border ${fullWidth ? "w-full" : ""}`}>
      <button
        className="flex w-full items-center justify-between p-3 text-left hover:bg-gray-50"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="flex flex-col">
          <span className="text-sm font-medium">フォーキャスト</span>
          <span className="text-xs text-gray-500">
            製品ID: {productGroupId} × 得意先ID: {customerId}
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
                {totalGroups} グループ、今後のフォーキャスト {sortedForecasts.length} 件を表示
              </div>
              <div className="grid gap-3 text-xs sm:grid-cols-2 md:grid-cols-3">
                {sortedForecasts.map((f) => (
                  <div key={f.id} className="rounded border bg-white p-3 shadow-sm">
                    <div className="text-[11px] text-gray-400 uppercase">
                      {formatDate(f.forecast_date)}
                    </div>
                    <div className="text-sm font-semibold text-gray-800">
                      {Number(f.forecast_quantity).toLocaleString()} {f.unit ?? "EA"}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-400">
                      {f.product_name ?? `製品ID: ${f.supplier_item_id}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded border border-dashed border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              得意先ID {customerId} 向けの製品ID {productGroupId}{" "}
              フォーキャストは登録されていません。
            </div>
          )}

          {forecastQ.isError && (
            <div className="text-xs text-red-600">
              フォーキャスト情報の取得に失敗しました。後でもう一度お試しください。
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-xs">
            <a
              href={`/forecasts?supplier_item_id=${productGroupId}&customer_id=${customerId}`}
              className="inline-flex items-center gap-1 rounded bg-sky-600 px-3 py-1.5 text-white hover:bg-sky-700"
            >
              詳細を開く
            </a>
            <a
              href="/forecasts"
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
