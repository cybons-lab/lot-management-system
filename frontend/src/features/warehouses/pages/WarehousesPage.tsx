/**
 * WarehousesPage - 倉庫マスタ管理
 * Skeleton implementation
 */

import { Button } from "@/components/ui";

export function WarehousesPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">倉庫マスタ</h2>
          <p className="mt-1 text-gray-600">倉庫の作成・編集・削除</p>
        </div>
        <Button>新規倉庫作成</Button>
      </div>

      {/* Coming Soon */}
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-lg text-gray-500">Coming Soon</p>
        <p className="mt-2 text-sm text-gray-400">倉庫一覧、作成、編集、削除機能を実装予定</p>
      </div>
    </div>
  );
}
