/**
 * OrderDetailPage - 受注詳細
 * Skeleton implementation
 */

import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">受注詳細</h2>
          <p className="mt-1 text-gray-600">受注ID: {orderId}</p>
        </div>
        <div className="space-x-2">
          <Button>引当画面へ</Button>
          <Button variant="outline">ステータス更新</Button>
          <Button variant="destructive">キャンセル</Button>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-lg text-gray-500">Coming Soon</p>
        <p className="mt-2 text-sm text-gray-400">
          受注ヘッダ情報、受注明細、引当詳細、操作ログを実装予定
        </p>
      </div>
    </div>
  );
}
