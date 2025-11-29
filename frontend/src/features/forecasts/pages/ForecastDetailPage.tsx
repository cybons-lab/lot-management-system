/**
 * ForecastDetailPage (v2.4)
 * Single forecast entry detail page - placeholder for future implementation
 */

import { useParams, useNavigate } from "react-router-dom";

import { useForecast } from "../hooks";

import { Button } from "@/components/ui";
import { Card, CardContent } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { formatDate, formatDateTime } from "@/shared/utils/date";

export function ForecastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const forecastId = Number(id);

  const { data: forecast, isLoading, isError } = useForecast(forecastId);

  const handleBack = () => {
    navigate(ROUTES.FORECASTS.LIST);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          読み込み中...
        </div>
      </div>
    );
  }

  if (isError || !forecast) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          フォーキャストの取得に失敗しました
        </div>
        <Button onClick={handleBack} className="mt-4">
          一覧に戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">フォーキャスト詳細</h2>
          <p className="mt-1 text-gray-600">ID: {forecast.id}</p>
        </div>
        <Button variant="outline" onClick={handleBack}>
          一覧に戻る
        </Button>
      </div>

      {/* Forecast Detail */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-gray-500">日付</div>
              <div className="text-lg">{formatDate(forecast.forecast_date)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">予測数量</div>
              <div className="text-lg font-semibold">
                {Number(forecast.forecast_quantity).toLocaleString()} {forecast.unit ?? "EA"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">得意先</div>
              <div className="text-lg">
                {forecast.customer_name ?? `ID: ${forecast.customer_id}`}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">納入先</div>
              <div className="text-lg">
                {forecast.delivery_place_name ?? `ID: ${forecast.delivery_place_id}`}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">製品</div>
              <div className="text-lg">
                {forecast.product_name ?? `ID: ${forecast.product_id}`}
                {forecast.product_code && (
                  <span className="ml-2 text-sm text-gray-500">({forecast.product_code})</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">スナップショット日時</div>
              <div className="text-lg">{formatDateTime(forecast.snapshot_at)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meta Info */}
      <div className="text-sm text-gray-500">
        更新日: {forecast.updated_at ? formatDateTime(forecast.updated_at) : "-"}
      </div>
    </div>
  );
}
