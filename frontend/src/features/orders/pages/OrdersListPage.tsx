/**
 * OrdersListPage.tsx (リファクタリング版)
 *
 * 受注一覧画面
 * - 新しいフック・コンポーネントを使用
 * - データ取得: useOrdersQuery
 * - UI状態管理: useDialog, useToast, useTable, useFilters
 * - 共通コンポーネント: DataTable, etc.
 */

import { Plus, RefreshCw, Search, TrendingUp, Package, CheckCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Input } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { OrderCreateForm } from "@/features/orders/components/OrderCreateForm";
import { OrderGroupHeader } from "@/features/orders/components/OrderGroupHeader";
import { orderLineColumns } from "@/features/orders/components/OrderLineColumns";
import { useOrderStats } from "@/features/orders/hooks/useOrderStats";
import { useOrdersQuery } from "@/hooks/api";
import { useCreateOrder } from "@/hooks/mutations";
import { useDialog, useTable, useFilters } from "@/hooks/ui";
import { DataTable } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { FormDialog } from "@/shared/components/form";

/**
 * メインコンポーネント
 */
export function OrdersListPage() {
  // UI状態管理
  const createDialog = useDialog();
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  const table = useTable({
    initialPageSize: 25,
    initialSort: { column: "due_date", direction: "asc" },
  });

  // フィルター状態管理
  const filters = useFilters({
    search: "",
    customer_code: "",
    status: "all",
    unallocatedOnly: false,
  });

  // データ取得
  const {
    data: allOrders = [],
    isLoading,
    error,
    refetch,
  } = useOrdersQuery({
    customer_code: filters.values.customer_code || undefined,
    status: filters.values.status !== "all" ? filters.values.status : undefined,
    // TODO: unallocatedOnly パラメータをAPIに追加
  });

  // 受注作成Mutation
  const createOrderMutation = useCreateOrder({
    onSuccess: () => {
      toast.success("受注を作成しました");
      createDialog.close();
    },
    onError: (error) => {
      toast.error(`作成に失敗しました: ${error.message}`);
    },
  });

  // データの加工
  const sortedOrders = table.sortData(allOrders);
  const paginatedOrders = table.paginateData(sortedOrders);
  // 安全なtotal計算
  const safeTotalCount = sortedOrders?.length ?? allOrders?.length ?? 0;
  const pagination = table.calculatePagination(safeTotalCount);

  // 統計情報
  const stats = useOrderStats(allOrders);

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">受注管理</h1>
          <p className="mt-1 text-sm text-slate-600">受注一覧と引当状況を管理します</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            更新
          </Button>
          <Button size="sm" onClick={createDialog.open}>
            <Plus className="mr-2 h-4 w-4" />
            新規登録
          </Button>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">総受注数</CardTitle>
            <Package className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">未処理</CardTitle>
            <div className="h-5 w-5 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.openOrders}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">引当済</CardTitle>
            <CheckCircle className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.allocatedOrders}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">引当率</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.allocationRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={filters.values.search}
              onChange={(e) => filters.set("search", e.target.value)}
              placeholder="受注番号、得意先コード、得意先名で検索..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">得意先コード</label>
            <Input
              value={filters.values.customer_code}
              onChange={(e) => filters.set("customer_code", e.target.value)}
              placeholder="例: C001"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">ステータス</label>
            <Select
              value={filters.values.status}
              onValueChange={(value) => filters.set("status", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="draft">未処理</SelectItem>
                <SelectItem value="allocated">引当済</SelectItem>
                <SelectItem value="shipped">出荷済</SelectItem>
                <SelectItem value="closed">完了</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end space-x-2 pb-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="unallocatedOnly"
                checked={filters.values.unallocatedOnly}
                onChange={(e) => filters.set("unallocatedOnly", e.target.checked as false)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="unallocatedOnly" className="text-sm font-medium text-slate-700">
                未引当のみ表示
              </label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={filters.reset}
              className="text-xs text-slate-500"
            >
              リセット
            </Button>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="space-y-2 text-center">
            <p className="text-lg font-semibold text-red-900">データの取得に失敗しました</p>
            <p className="text-sm text-red-700">
              {error instanceof Error ? error.message : "サーバーエラーが発生しました"}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              再試行
            </Button>
          </div>
        </div>
      )}

      {/* テーブル（グループ化表示） */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-12 shadow-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
            <p className="text-sm text-gray-500">読み込み中...</p>
          </div>
        </div>
      ) : paginatedOrders.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-12 shadow-sm">
          <p className="text-sm text-gray-500">
            受注がありません。新規登録ボタンから最初の受注を作成してください。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map((order) => (
            <div
              key={order.id}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <OrderGroupHeader
                order={order}
                isExpanded={expandedOrders.has(order.id)}
                onToggle={() => {
                  const newExpanded = new Set(expandedOrders);
                  if (newExpanded.has(order.id)) {
                    newExpanded.delete(order.id);
                  } else {
                    newExpanded.add(order.id);
                  }
                  setExpandedOrders(newExpanded);
                }}
              />
              {expandedOrders.has(order.id) && order.lines && order.lines.length > 0 && (
                <DataTable
                  data={order.lines}
                  columns={orderLineColumns}
                  isLoading={false}
                  emptyMessage="明細がありません"
                />
              )}
            </div>
          ))}

          {/* ページネーション */}
          {!error && sortedOrders.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white px-6 py-4 shadow-sm">
              <TablePagination
                currentPage={pagination.page ?? 1}
                pageSize={pagination.pageSize ?? 25}
                totalCount={pagination.totalItems ?? safeTotalCount ?? 0}
                onPageChange={table.setPage}
                onPageSizeChange={table.setPageSize}
              />
            </div>
          )}
        </div>
      )}

      {/* 新規登録ダイアログ */}
      <FormDialog
        open={createDialog.isOpen}
        onClose={createDialog.close}
        title="受注新規登録"
        description="新しい受注を登録します"
        size="lg"
      >
        <OrderCreateForm
          onSubmit={async (data) => {
            await createOrderMutation.mutateAsync(data);
          }}
          onCancel={createDialog.close}
          isSubmitting={createOrderMutation.isPending}
        />
      </FormDialog>
    </div>
  );
}
