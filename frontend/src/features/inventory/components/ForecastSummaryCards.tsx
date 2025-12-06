import { ForecastListResponse } from "@/features/forecasts/api";
import { fmt } from "@/shared/utils/number";

interface ForecastSummaryCardsProps {
  forecastData: ForecastListResponse;
  totalQuantity: number;
}

export function ForecastSummaryCards({ forecastData, totalQuantity }: ForecastSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-gray-600">予測グループ数</div>
        <div className="mt-2 text-2xl font-bold text-gray-900">{forecastData.items.length}</div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-gray-600">総予測数量</div>
        <div className="mt-2 text-2xl font-bold text-blue-600">{fmt(totalQuantity)}</div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-gray-600">予測エントリ数</div>
        <div className="mt-2 text-2xl font-bold text-gray-900">
          {forecastData.items.reduce((sum, g) => sum + (g.forecasts ?? []).length, 0)}
        </div>
      </div>
    </div>
  );
}
