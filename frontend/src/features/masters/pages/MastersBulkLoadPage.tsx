/**
 * MastersBulkLoadPage - マスタ一括登録
 * Skeleton implementation
 */

import { Button } from "@/components/ui";

export function MastersBulkLoadPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">マスタ一括登録</h2>
        <p className="mt-1 text-gray-600">CSVファイルからマスタデータを一括登録</p>
      </div>

      {/* Coming Soon */}
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-lg text-gray-500">Coming Soon</p>
        <p className="mt-2 text-sm text-gray-400">
          ファイルアップロード、プレビュー、登録実行機能を実装予定
        </p>
        <div className="mt-4">
          <Button variant="outline" disabled>
            CSVテンプレートダウンロード
          </Button>
        </div>
      </div>
    </div>
  );
}
