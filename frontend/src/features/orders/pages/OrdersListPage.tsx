/**
 * OrdersListPage.tsx (リファクタリング版)
 *
 * 受注一覧画面
 * - 新しいフック・コンポーネントを使用
 * - データ取得: useOrdersQuery
 * - UI状態管理: useDialog, useToast, useTable, useFilters
 * - 共通コンポーネント: DataTable, etc.
 */

import { Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { OrderCreateForm } from "@/features/orders/components/OrderCreateForm";
import { orderLineColumns } from "@/features/orders/components/OrderLineColumns";
import { useOrderLines, type OrderLineRow } from "@/features/orders/hooks/useOrderLines";
import { useCreateOrder } from "@/hooks/mutations";
import { useDialog, useTable, useFilters } from "@/hooks/ui";
import { DataTable } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { FormDialog } from "@/shared/components/form";
import { coerceAllocatedLots } from "@/shared/libs/allocations";

/**
 * メインコンポーネント
 */
export function OrdersListPage() {
  // UI状態管理
  const createDialog = useDialog();

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

  // データ取得 (Line-based)
  const {
    data: allOrderLines = [],
    isLoading,
    error,
    refetch,
  } = useOrderLines({
    customer_code: filters.values.customer_code || undefined,
    status: filters.values.status !== "all" ? filters.values.status : undefined,
  });

  // 受注作成Mutation
  const createOrderMutation = useCreateOrder({
    onSuccess: () => {
      toast.success("受注を作成しました");
      createDialog.close();
      refetch();
    },
    onError: (error) => {
      toast.error(`作成に失敗しました: ${error.message}`);
    },
  });

  // データの加工 (フィルタリング & ソート)
  // useFiltersのsearchは受注番号や顧客名での検索を想定
  const filteredLines = allOrderLines.filter((line: OrderLineRow) => {
    if (filters.values.search) {
      const searchLower = filters.values.search.toLowerCase();
      const matchOrderNo = line.order_number.toLowerCase().includes(searchLower);
      const matchCustomer =
        line.customer_name.toLowerCase().includes(searchLower) ||
        line.customer_code.toLowerCase().includes(searchLower);
      const matchProduct =
        line.product_name?.toLowerCase().includes(searchLower) ||
        line.product_code?.toLowerCase().includes(searchLower);

      if (!matchOrderNo && !matchCustomer && !matchProduct) return false;
    }

    if (filters.values.unallocatedOnly) {
      // 簡易的な未引当判定: 引当率 < 100
      const orderQty = Number(line.order_quantity ?? line.quantity ?? 0);
      const lots = coerceAllocatedLots(line.allocated_lots);
      const allocatedQty = lots.reduce(
        (acc: number, alloc: any) => acc + Number(alloc.allocated_quantity ?? alloc.allocated_qty ?? 0),
        0,
      );
      if (orderQty > 0 && allocatedQty >= orderQty) return false;
    }

    return true;
  });

  const sortedLines = table.sortData(filteredLines);
  const paginatedLines = table.paginateData(sortedLines);
  const safeTotalCount = filteredLines.length;
  const pagination = table.calculatePagination(safeTotalCount);

  // 統計情報 (Lineベースでの集計は少し異なるが、一旦既存のuseOrderStatsはOrder単位なのでここでは表示しないか、別途計算が必要)
  // 今回はシンプルにリスト表示を優先し、統計カードは一旦非表示にするか、後で再実装する。
  // 要件は「明細単位表示への変更」なので、リスト部分を重点的に変更する。

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">受注管理</h1>
          <p className="mt-1 text-sm text-slate-600">受注明細一覧と引当状況を管理します</p>
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

      {/* フィルター */}
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <Input
              value={filters.values.search}
              onChange={(e) => filters.set("search", e.target.value)}
              placeholder="受注番号、得意先、製品で検索..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="customer-code-filter" className="text-sm font-medium text-slate-700">
              得意先コード
            </label>
            <Input
              id="customer-code-filter"
              value={filters.values.customer_code}
              onChange={(e) => filters.set("customer_code", e.target.value)}
              placeholder="例: C001"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="status-filter" className="text-sm font-medium text-slate-700">
              ステータス
            </label>
            <Select
              value={filters.values.status}
              onValueChange={(value) => filters.set("status", value)}
            >
              <SelectTrigger id="status-filter">
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

      {/* テーブル (Flat Line List) */}
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <DataTable
            data={paginatedLines}
            columns={orderLineColumns}
            isLoading={isLoading}
            emptyMessage="明細がありません"
          />
        </div>

        {/* ページネーション */}
        {!error && sortedLines.length > 0 && (
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
