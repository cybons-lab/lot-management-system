/**
 * LotDetailPage - ロット詳細・編集
 * Skeleton implementation
 */

import { useParams } from "react-router-dom";
import { Button } from "@/components/ui";

export function LotDetailPage() {
  const { lotId } = useParams<{ lotId: string }>();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ロット詳細</h2>
          <p className="mt-1 text-gray-600">ロットID: {lotId}</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline">編集</Button>
          <Button variant="destructive">削除</Button>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-lg text-gray-500">Coming Soon</p>
        <p className="mt-2 text-sm text-gray-400">
          ロット基本情報、在庫変動履歴、引当状況を実装予定
        </p>
      </div>
    </div>
  );
}
