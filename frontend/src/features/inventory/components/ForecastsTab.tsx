import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { fmt } from "@/shared/utils/number";

interface ForecastsTabProps {
  productId: number;
}

export function ForecastsTab({ productId }: ForecastsTabProps) {
  const { data: forecastData, isLoading } = useQuery({
    queryKey: ["forecasts", productId],
    queryFn: async () => {
      const { getForecasts } = await import("@/features/forecasts/api");
      return getForecasts({ product_id: productId, limit: 100 });
    },
  });

  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  const totalQuantity =
    forecastData?.items.reduce((sum, group) => {
      return sum + (group.forecasts ?? []).reduce((s, f) => s + Number(f.forecast_quantity), 0);
    }, 0) || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">需要予測</h3>
        <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.FORECASTS.LIST)}>
          需要予測一覧へ
        </Button>
      </div>

      {forecastData && forecastData.items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-600">予測グループ数</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {forecastData.items.length}
              </div>
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

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="mb-3 font-semibold">予測グループ一覧</h4>
            <div className="space-y-2">
              {forecastData.items.slice(0, 5).map((group, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border-b border-gray-100 pb-2"
                >
                  <div className="text-sm">
                    <span className="font-medium">
                      {group.group_key.customer_name || `顧客${group.group_key.customer_id}`}
                    </span>
                    {" → "}
                    <span>
                      {group.group_key.delivery_place_name ||
                        `納入先${group.group_key.delivery_place_id}`}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-blue-600">
                    {fmt(
                      (group.forecasts ?? []).reduce((s, f) => s + Number(f.forecast_quantity), 0),
                    )}
                  </div>
                </div>
              ))}
            </div>
            {forecastData.items.length > 5 && (
              <p className="mt-3 text-sm text-gray-500">
                他 {forecastData.items.length - 5} グループ
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">需要予測データがありません</p>
        </div>
      )}
    </div>
  );
}
