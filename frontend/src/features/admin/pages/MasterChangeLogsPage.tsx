/**
 * MasterChangeLogsPage - マスタ変更履歴
 * Skeleton implementation
 */

import { Button } from "@/components/ui/button";

export function MasterChangeLogsPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">マスタ変更履歴</h2>
          <p className="mt-1 text-gray-600">マスタデータの変更履歴と差分表示</p>
        </div>
        <Button variant="outline">CSV出力</Button>
      </div>

      {/* Coming Soon */}
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-lg text-gray-500">Coming Soon</p>
        <p className="mt-2 text-sm text-gray-400">
          変更履歴一覧、フィルター、差分表示機能を実装予定
        </p>
      </div>
    </div>
  );
}
