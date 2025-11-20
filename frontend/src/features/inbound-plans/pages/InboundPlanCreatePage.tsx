/**
 * InboundPlanCreatePage - 入荷予定新規作成
 * Skeleton implementation
 */

import { Button } from "@/components/ui";

export function InboundPlanCreatePage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">入荷予定作成</h2>
          <p className="mt-1 text-gray-600">新規入荷予定の登録</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline">キャンセル</Button>
          <Button>保存</Button>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-lg text-gray-500">Coming Soon</p>
        <p className="mt-2 text-sm text-gray-400">
          仕入先選択、入荷予定日入力、明細入力テーブルを実装予定
        </p>
      </div>
    </div>
  );
}
