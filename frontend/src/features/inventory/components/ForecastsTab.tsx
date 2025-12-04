import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { ForecastGroupList } from "./ForecastGroupList";
import { ForecastSummaryCards } from "./ForecastSummaryCards";

import { Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";

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
    forecastData?.items.reduce((sum: number, group: { forecasts?: { forecast_quantity: string | number }[] }) => {
      return sum + (group.forecasts ?? []).reduce((s: number, f: { forecast_quantity: string | number }) => s + Number(f.forecast_quantity), 0);
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
          <ForecastSummaryCards forecastData={forecastData} totalQuantity={totalQuantity} />
          <ForecastGroupList forecastData={forecastData} />
        </>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">需要予測データがありません</p>
        </div>
      )}
    </div>
  );
}
