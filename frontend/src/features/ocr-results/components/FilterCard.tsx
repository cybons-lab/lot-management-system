import { Menu } from "lucide-react";
import { useState } from "react";

import { Card, CardContent } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

// eslint-disable-next-line max-lines-per-function -- フィルタUIの論理的なまとまり
export function FilterCard({
  taskDate,
  setTaskDate,
  viewMode,
  statusFilter,
  setStatusFilter,
  showErrorsOnly,
  setShowErrorsOnly,
}: {
  taskDate: string;
  setTaskDate: (v: string) => void;
  viewMode: "current" | "completed";
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  showErrorsOnly: boolean;
  setShowErrorsOnly: (v: boolean) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <CardContent className="p-4">
        {/* ハンバーガーメニュートグル（小型画面用） */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="lg:hidden flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-3 transition-colors"
          aria-label="フィルタを表示/非表示"
        >
          <Menu className="h-5 w-5" />
          <span>フィルタ</span>
          <span className="text-xs text-gray-500">{isExpanded ? "（開く）" : "（閉じる）"}</span>
        </button>

        {/* フィルタコンテンツ（大画面では常に表示、小画面では折りたたみ可能） */}
        <div
          className={cn(
            "flex gap-4 flex-wrap",
            "lg:flex", // 大画面では常に表示
            !isExpanded && "hidden lg:flex", // 小画面では折りたたみ状態に応じて表示/非表示
          )}
        >
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="task-date" className="block text-sm font-medium text-gray-700 mb-1">
              タスク日付
            </label>
            <input
              id="task-date"
              type="date"
              value={taskDate}
              onChange={(e) => setTaskDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {viewMode === "current" && (
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">全て</option>
                <option value="PENDING">保留中</option>
                <option value="IMPORTED">インポート済み</option>
                <option value="ERROR">エラー</option>
              </select>
            </div>
          )}
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showErrorsOnly}
                onChange={(e) => setShowErrorsOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">エラーのみ表示</span>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
