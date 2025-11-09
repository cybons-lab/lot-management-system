/**
 * OrdersListPage.tsx (リファクタリング版)
 *
 * 受注一覧画面
 * - 新しいフック・コンポーネントを使用
 * - データ取得: useOrdersQuery
 * - UI状態管理: useDialog, useToast, useTable, useFilters
 * - 共通コンポーネント: PageHeader, Section, DataTable, etc.
 */

import { format } from "date-fns";
import { Plus, RefreshCw, ExternalLink } from "lucide-react";
import { useMemo } from "react";

// バッチ3で作成したフック

// バッチ3で作成した共通コンポーネント
import { DataTable, type Column } from "@/components/shared/data/DataTable";
import { FilterField } from "@/components/shared/data/FilterField";
import { FilterPanel } from "@/components/shared/data/FilterPanel";
import { SearchBar } from "@/components/shared/data/SearchBar";
import { OrderStatusBadge } from "@/components/shared/data/StatusBadge";
import { TablePagination } from "@/components/shared/data/TablePagination";
import { FormDialog } from "@/components/shared/form";
import { PageHeader, PageContainer, Section } from "@/components/shared/layout";
// 既存の型とコンポーネント
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrdersQuery } from "@/hooks/api";
import { useCreateOrder } from "@/hooks/mutations";
import { useDialog, useToast, useTable, useFilters } from "@/hooks/ui";
import type { OrderResponse, OrderLine, AllocatedLot } from "@/types/aliases";
import type { OrderCreate } from "@/utils/validators";

/**
 * メインコンポーネント
 */
export function OrdersListPage() {
  // UI状態管理
  const createDialog = useDialog();
  const toast = useToast();
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

  // テーブルカラム定義
  const columns: Column<OrderResponse>[] = useMemo(
    () => [
      {
        id: "order_no",
        header: "受注番号",
        cell: (order: OrderResponse) => <span className="font-medium">{order.order_no}</span>,
        sortable: true,
      },
      {
        id: "customer_code",
        header: "得意先",
        cell: (order: OrderResponse) => (
          <div>
            <div className="font-medium">{order.customer_code}</div>
            {order.customer_name && (
              <div className="text-xs text-gray-600">{order.customer_name}</div>
            )}
          </div>
        ),
        sortable: true,
      },
      {
        id: "order_date",
        header: "受注日",
        cell: (order: OrderResponse) => format(new Date(order.order_date), "yyyy/MM/dd"),
        sortable: true,
      },
      {
        id: "due_date",
        header: "納期",
        cell: (order: OrderResponse) =>
          order.due_date ? format(new Date(order.due_date), "yyyy/MM/dd") : "-",
        sortable: true,
      },
      {
        id: "lines_count",
        header: "明細数",
        cell: (order: OrderResponse) => (
          <span className="text-center">{order.lines?.length || 0}</span>
        ),
        align: "center",
      },
      {
        id: "allocation_status",
        header: "引当状況",
        cell: (order: OrderResponse) => {
          const lines = order.lines || [];
          const totalQty = lines.reduce((sum: number, line: OrderLine) => sum + line.quantity, 0);
          const allocatedQty = lines.reduce((sum: number, line: OrderLine) => {
            const allocated =
              line.allocated_lots?.reduce(
                (a: number, alloc: AllocatedLot) => a + (alloc.allocated_qty || 0),
                0,
              ) || 0;
            return sum + allocated;
          }, 0);

          const rate = totalQty > 0 ? (allocatedQty / totalQty) * 100 : 0;

          return (
            <div className="flex items-center space-x-2">
              <div className="h-2 w-24 rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full ${
                    rate === 100 ? "bg-green-500" : rate > 0 ? "bg-blue-500" : "bg-gray-300"
                  }`}
                  style={{ width: `${rate}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">{rate.toFixed(0)}%</span>
            </div>
          );
        },
      },
      {
        id: "status",
        header: "ステータス",
        cell: (order: OrderResponse) => <OrderStatusBadge status={order.status} />,
        sortable: true,
        align: "center",
      },
      {
        id: "actions",
        header: "",
        cell: (order: OrderResponse) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // 引当画面へ遷移するロジック
              window.location.href = `/allocation?selected=${order.id}`;
            }}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        ),
        width: "60px",
      },
    ],
    [],
  );

  // データの加工
  const sortedOrders = table.sortData(allOrders);
  const paginatedOrders = table.paginateData(sortedOrders);
  const pagination = table.calculatePagination(sortedOrders.length);

  // 統計情報
  // TODO: calculateOrderStats を実装
  const stats = useMemo(
    () => ({
      totalOrders: allOrders.length,
      openOrders: allOrders.filter((o) => o.status === "open").length,
      allocatedOrders: allOrders.filter((o) => o.status === "allocated").length,
      allocationRate:
        allOrders.length > 0
          ? (allOrders.filter((o) => o.status === "allocated").length / allOrders.length) * 100
          : 0,
    }),
    [allOrders],
  );

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
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">総受注数</div>
          <div className="mt-1 text-2xl font-bold">{stats.totalOrders}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">未処理</div>
          <div className="mt-1 text-2xl font-bold text-yellow-600">{stats.openOrders}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">引当済</div>
          <div className="mt-1 text-2xl font-bold text-blue-600">{stats.allocatedOrders}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">引当率</div>
          <div className="mt-1 text-2xl font-bold text-green-600">
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
                  <SelectItem value="open">未処理</SelectItem>
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
        {!isLoading &&
          !error &&
          sortedOrders.length > 0 &&
          (() => {
            const paginationProps = {
              ...pagination,
              onPageChange: table.setPage,
              onPageSizeChange: table.setPageSize,
            } as unknown as React.ComponentProps<typeof TablePagination>;
            return <TablePagination {...paginationProps} />;
          })()}
      </Section>

      {/* 新規登録ダイアログ */}
      <FormDialog
        open={createDialog.isOpen}
        onClose={createDialog.close}
        title="受注新規登録"
        size="lg"
        onSubmit={async () => {}}
      >
        <OrderCreateForm
          onSubmit={async (data) => {
            await createOrderMutation.mutateAsync(data);
          }}
          onCancel={createDialog.close}
          isSubmitting={createOrderMutation.isPending}
        />
      </FormDialog>

      {/* トースト表示 */}
      {toast.toasts.map((t) => (
        <div
          key={t.id}
          className={`fixed bottom-6 right-6 rounded-lg px-4 py-3 text-sm shadow-lg ${
            t.variant === "success"
              ? "bg-green-600 text-white"
              : t.variant === "error"
                ? "bg-red-600 text-white"
                : "bg-slate-900 text-white"
          }`}
        >
          {t.message}
        </div>
      ))}
    </PageContainer>
  );
}

/**
 * 受注作成フォームコンポーネント
 */
interface OrderCreateFormProps {
  onSubmit: (data: OrderCreate) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

function OrderCreateForm({ onSubmit, onCancel, isSubmitting }: OrderCreateFormProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      order_no: formData.get("order_no") as string,
      customer_code: formData.get("customer_code") as string,
      order_date: formData.get("order_date") as string,
      status: "open",
      lines: [], // 明細は後で追加
    };

    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="order_no">受注番号 *</Label>
          <Input id="order_no" name="order_no" required placeholder="例: ORD-2024-001" />
        </div>

        <div>
          <Label htmlFor="customer_code">得意先コード *</Label>
          <Input id="customer_code" name="customer_code" required placeholder="例: C001" />
        </div>

        <div>
          <Label htmlFor="order_date">受注日 *</Label>
          <Input id="order_date" name="order_date" type="date" required />
        </div>

        <div>
          <Label htmlFor="due_date">納期</Label>
          <Input id="due_date" name="due_date" type="date" />
        </div>

        <div>
          <Label htmlFor="ship_to">出荷先</Label>
          <Input id="ship_to" name="ship_to" placeholder="例: 東京営業所" />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "作成中..." : "作成"}
        </Button>
      </div>
    </form>
  );
}
