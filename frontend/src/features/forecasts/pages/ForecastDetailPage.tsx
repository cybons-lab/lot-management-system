/**
 * ForecastDetailPage (v2.2 - Phase B-3)
 * Forecast header detail page with visual grid layout
 */

import { useParams, useNavigate } from "react-router-dom";

import { ForecastDetailCard } from "../components";
import { useForecastHeader } from "../hooks";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export function ForecastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const headerId = Number(id);

  // Fetch forecast header with lines
  const { data: forecast, isLoading, isError } = useForecastHeader(headerId);

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
          フォーキャストヘッダの取得に失敗しました
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
          <p className="mt-1 text-gray-600">{forecast.forecast_number}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                forecast.status === "active"
                  ? "bg-green-100 text-green-800"
                  : forecast.status === "completed"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {forecast.status}
            </span>
          </div>
          <Button variant="outline" onClick={handleBack}>
            一覧に戻る
          </Button>
        </div>
      </div>

      {/* Forecast Detail Card */}
      <ForecastDetailCard forecast={forecast} />

      {/* Summary Info */}
      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 md:grid-cols-4">
        <div>
          <span className="font-medium">明細数:</span> {forecast.lines?.length ?? 0} 件
        </div>
        <div>
          <span className="font-medium">開始日:</span>{" "}
          {forecast.forecast_start_date
            ? new Date(forecast.forecast_start_date).toLocaleDateString("ja-JP")
            : "-"}
        </div>
        <div>
          <span className="font-medium">終了日:</span>{" "}
          {forecast.forecast_end_date
            ? new Date(forecast.forecast_end_date).toLocaleDateString("ja-JP")
            : "-"}
        </div>
        <div>
          <span className="font-medium">更新日:</span>{" "}
          {new Date(forecast.updated_at).toLocaleString("ja-JP")}
        </div>
      </div>
    </div>
  );
}
