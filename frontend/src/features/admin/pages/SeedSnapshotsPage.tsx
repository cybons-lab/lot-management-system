/**
 * SeedSnapshotsPage - スナップショット管理
 * Skeleton implementation
 */

import { Button } from "@/components/ui/button";

export function SeedSnapshotsPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">スナップショット管理</h2>
          <p className="mt-1 text-gray-600">データベーススナップショットの作成・復元</p>
        </div>
        <Button>新規スナップショット作成</Button>
      </div>

      {/* Coming Soon */}
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-lg text-gray-500">Coming Soon</p>
        <p className="mt-2 text-sm text-gray-400">
          スナップショット一覧、作成、復元、削除機能を実装予定
        </p>
      </div>
    </div>
  );
}
