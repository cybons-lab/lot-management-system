/**
 * AllocationSuggestionsPage - 引当推奨管理
 * Skeleton implementation
 */

import { Button } from "@/components/ui/button";

export function AllocationSuggestionsPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">引当推奨</h2>
          <p className="mt-1 text-gray-600">システム推奨の引当候補一覧</p>
        </div>
        <div className="space-x-2">
          <Button>推奨生成</Button>
          <Button variant="outline">一括削除</Button>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-lg text-gray-500">Coming Soon</p>
        <p className="mt-2 text-sm text-gray-400">引当推奨一覧、推奨生成、推奨削除機能を実装予定</p>
      </div>
    </div>
  );
}
