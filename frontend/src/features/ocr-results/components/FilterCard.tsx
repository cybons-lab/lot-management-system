import { Card, CardContent } from "@/components/ui";

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
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4 flex-wrap">
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
