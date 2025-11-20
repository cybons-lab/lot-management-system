/**
 * OrdersListPage.tsx (リファクタリング版)
 *
 * 受注一覧画面
 * - 新しいフック・コンポーネントを使用
 * - データ取得: useOrdersQuery
 * - UI状態管理: useDialog, useToast, useTable, useFilters
 * - 共通コンポーネント: PageHeader, Section, DataTable, etc.
 */

import { Plus, RefreshCw } from "lucide-react";

// バッチ3で作成したフック

// バッチ3で作成した共通コンポーネント
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { OrderCreateForm } from "@/features/orders/components/OrderCreateForm";
import { useOrderStats } from "@/features/orders/hooks/useOrderStats";
import { columns } from "@/features/orders/pages/OrdersListPage/columns";
import { useOrdersQuery } from "@/hooks/api";
import { useCreateOrder } from "@/hooks/mutations";
import { useDialog, useTable, useFilters } from "@/hooks/ui";
import { DataTable } from "@/shared/components/data/DataTable";
import { FilterField } from "@/shared/components/data/FilterField";
import { FilterPanel } from "@/shared/components/data/FilterPanel";
import { SearchBar } from "@/shared/components/data/SearchBar";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { FormDialog } from "@/shared/components/form";
import { PageHeader, PageContainer, Section } from "@/shared/components/layout";

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
    <PageContainer>
      <PageHeader
        title="受注管理"
        subtitle="受注一覧と引当状況"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              更新
            </Button>
            <Button size="sm" onClick={createDialog.open}>
              <Plus className="mr-2 h-4 w-4" />
              新規登録
            </Button>
          </>
        }
      />

      {/* 統計情報 */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md">
          <div className="text-sm font-medium text-gray-600">総受注数</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.totalOrders}</div>
        </div>
        <div className="group rounded-xl border-t border-r border-b border-l-4 border-gray-200 border-l-yellow-500 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="text-sm font-medium text-gray-600">未処理</div>
          <div className="mt-2 text-3xl font-bold text-yellow-600">{stats.openOrders}</div>
        </div>
        <div className="group rounded-xl border-t border-r border-b border-l-4 border-gray-200 border-l-blue-500 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="text-sm font-medium text-gray-600">引当済</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">{stats.allocatedOrders}</div>
        </div>
        <div className="group rounded-xl border-t border-r border-b border-l-4 border-gray-200 border-l-green-500 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="text-sm font-medium text-gray-600">引当率</div>
          <div className="mt-2 text-3xl font-bold text-green-600">
            {stats.allocationRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* フィルター */}
      <Section className="mb-6">
        <FilterPanel title="検索・フィルター" onReset={filters.reset}>
          <SearchBar
            value={filters.values.search}
            onChange={(value: string) => filters.set("search", value)}
            placeholder="受注番号、得意先コード、得意先名で検索..."
          />

          <div className="grid grid-cols-2 gap-3">
            <FilterField label="得意先コード">
              <Input
                value={filters.values.customer_code}
                onChange={(e) => filters.set("customer_code", e.target.value)}
                placeholder="例: C001"
              />
            </FilterField>

            <FilterField label="ステータス">
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
            </FilterField>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="unallocatedOnly"
              checked={filters.values.unallocatedOnly}
              onChange={(e) => filters.set("unallocatedOnly", e.target.checked as false)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="unallocatedOnly" className="text-sm text-gray-700">
              未引当のみ表示
            </label>
          </div>
        </FilterPanel>
      </Section>

      {/* テーブル */}
      <Section>
        <DataTable
          data={paginatedOrders}
          columns={columns}
          sort={
            table.sort && table.sort.column && table.sort.direction
              ? { column: table.sort.column, direction: table.sort.direction }
              : undefined
          }
          isLoading={isLoading}
          emptyMessage="受注がありません"
        />
        {!isLoading && !error && sortedOrders.length > 0 && (
          <TablePagination
            currentPage={pagination.page ?? 1}
            pageSize={pagination.pageSize ?? 25}
            totalCount={pagination.totalItems ?? safeTotalCount ?? 0}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
          />
        )}
      </Section>

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
    </PageContainer>
  );
}

