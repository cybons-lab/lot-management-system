/**
 * ForecastDetailPage (v2.2 - Phase B-3)
 * Forecast header detail page with lines table
 */

import { useParams, useNavigate } from "react-router-dom";
import { useForecastHeader, useDeleteForecastLine } from "../hooks";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export function ForecastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const headerId = Number(id);

  // Fetch forecast header with lines
  const { data: forecast, isLoading, isError, refetch } = useForecastHeader(headerId);

  // Delete line mutation
  const deleteLineMutation = useDeleteForecastLine(headerId);

  const handleDeleteLine = async (lineId: number) => {
    if (!confirm("この明細行を削除しますか？")) return;

    try {
      await deleteLineMutation.mutateAsync(lineId);
      refetch();
    } catch (error) {
      console.error("Delete line failed:", error);
      alert("削除に失敗しました");
    }
  };

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBack}>
            一覧に戻る
          </Button>
        </div>
      </div>

      {/* Header Info */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">ヘッダ情報</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm font-medium text-gray-500">フォーキャスト番号</div>
            <div className="mt-1 text-base">{forecast.forecast_number}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">ステータス</div>
            <div className="mt-1">
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
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">得意先</div>
            <div className="mt-1 text-base">
              {forecast.customer_name || `ID: ${forecast.customer_id}`}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">納入場所</div>
            <div className="mt-1 text-base">
              {forecast.delivery_place_name || `ID: ${forecast.delivery_place_id}`}
            </div>
          </div>
          {forecast.notes && (
            <div className="md:col-span-2">
              <div className="text-sm font-medium text-gray-500">備考</div>
              <div className="mt-1 text-base">{forecast.notes}</div>
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-gray-500">作成日</div>
            <div className="mt-1 text-base">
              {new Date(forecast.created_at).toLocaleString("ja-JP")}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">更新日</div>
            <div className="mt-1 text-base">
              {new Date(forecast.updated_at).toLocaleString("ja-JP")}
            </div>
          </div>
        </div>
      </div>

      {/* Lines Table */}
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">明細一覧</h3>
          <div className="text-sm text-gray-600">{forecast.lines?.length || 0} 件の明細</div>
        </div>

        {!forecast.lines || forecast.lines.length === 0 ? (
          <div className="py-8 text-center text-gray-500">明細がありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">行番号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">製品</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">数量</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">予測日</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">粒度</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    バージョン
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {forecast.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{line.line_number}</td>
                    <td className="px-4 py-3 text-sm">
                      {line.product_name || line.product_code || `ID: ${line.product_id}`}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{line.quantity}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(line.forecast_date).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        {line.granularity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">v{line.version_no || 1}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteLine(line.id)}
                        disabled={deleteLineMutation.isPending}
                      >
                        削除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
