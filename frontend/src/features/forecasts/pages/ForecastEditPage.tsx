/**
 * ForecastEditPage - フォーキャスト編集
 * Skeleton implementation
 */

import { useParams } from "react-router-dom";

import { Button } from "@/components/ui";

export function ForecastEditPage() {
  const { forecastId } = useParams<{ forecastId: string }>();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">フォーキャスト編集</h2>
          <p className="mt-1 text-gray-600">ID: {forecastId}</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline">キャンセル</Button>
          <Button>保存</Button>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-lg text-gray-500">Coming Soon</p>
        <p className="mt-2 text-sm text-gray-400">ヘッダ編集フォーム、明細編集テーブルを実装予定</p>
      </div>
    </div>
  );
}
