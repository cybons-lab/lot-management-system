import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { formatDate } from "@/shared/utils/date";

// ============================================
// 型定義
// ============================================

export interface InboundPlan {
  id: number;
  plan_number: string;
  supplier_id: number;
  supplier_name?: string;
  planned_arrival_date: string;
  status: "planned" | "partially_received" | "received" | "cancelled";
  created_at: string;
}

export interface InboundPlansFilters {
  supplier_id: string;
  product_id?: string;
  status: "" | "planned" | "partially_received" | "received" | "cancelled";
  date_from: string;
  date_to: string;
}

interface InboundPlansListProps {
  plans?: InboundPlan[];
  isLoading: boolean;
  isError: boolean;
  filters: InboundPlansFilters;
  onFilterChange: (filters: InboundPlansFilters) => void;
  onDelete: (id: number) => void;
  onViewDetail: (id: number) => void;
  isDeleting?: boolean;
  onSyncFromSAP?: () => void;
  isSyncing?: boolean;
}

// ============================================
// メインコンポーネント
// ============================================

export function InboundPlansList({
  plans,
  isLoading,
  isError,
  filters,
  onFilterChange,
  onDelete,
  onViewDetail,
  isDeleting,
  onSyncFromSAP,
  isSyncing,
}: InboundPlansListProps) {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">入荷予定一覧</h2>
          <p className="mt-1 text-gray-600">入荷予定管理（ロット自動生成対応）</p>
        </div>
        {onSyncFromSAP && (
          <Button onClick={onSyncFromSAP} disabled={isSyncing} size="default">
            {isSyncing ? "同期中..." : "SAPから取得"}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <Label className="mb-2 block text-sm font-medium">仕入先ID</Label>
            <Input
              type="number"
              value={filters.supplier_id}
              onChange={(e) => onFilterChange({ ...filters, supplier_id: e.target.value })}
              placeholder="仕入先IDで絞り込み"
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">ステータス</Label>
            <select
              value={filters.status}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  status: e.target.value as
                    | ""
                    | "planned"
                    | "partially_received"
                    | "received"
                    | "cancelled",
                })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">すべて</option>
              <option value="planned">Planned（予定）</option>
              <option value="partially_received">Partially Received（一部入荷）</option>
              <option value="received">Received（入荷済）</option>
              <option value="cancelled">Cancelled（キャンセル）</option>
            </select>
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">入荷予定日（開始）</Label>
            <Input
              type="date"
              value={filters.date_from}
              onChange={(e) => onFilterChange({ ...filters, date_from: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">入荷予定日（終了）</Label>
            <Input
              type="date"
              value={filters.date_to}
              onChange={(e) => onFilterChange({ ...filters, date_to: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Data display area */}
      {isLoading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          読み込み中...
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-600">
          データの取得に失敗しました
        </div>
      ) : !Array.isArray(plans) || plans.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          入荷予定が登録されていません
          {!Array.isArray(plans) && plans && (
            <div className="mt-2 text-xs text-red-500">
              データ形式エラー: 配列ではありません (Received: {typeof plans})
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">{plans.length} 件の入荷予定が見つかりました</div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    入荷予定番号
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">仕入先</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    入荷予定日
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    ステータス
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">作成日</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{plan.plan_number}</td>
                    <td className="px-4 py-3 text-sm">
                      {plan.supplier_name || `ID: ${plan.supplier_id}`}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatDate(plan.planned_arrival_date)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${plan.status === "planned"
                            ? "bg-yellow-100 text-yellow-800"
                            : plan.status === "partially_received"
                              ? "bg-blue-100 text-blue-800"
                              : plan.status === "received"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        {plan.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(plan.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => onViewDetail(plan.id)}>
                          詳細
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDelete(plan.id)}
                          disabled={isDeleting}
                        >
                          削除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
