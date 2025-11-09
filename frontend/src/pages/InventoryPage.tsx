/**
 * InventoryPage.tsx (リファクタリング版)
 *
 * ロット管理画面
 * - 新しいフック・コンポーネントを使用
 * - データ取得: useLotsQuery
 * - UI状態管理: useDialog, useToast, useTable, useFilters
 * - 共通コンポーネント: PageHeader, Section, DataTable, etc.
 */

import { format } from "date-fns";
import { Plus, RefreshCw } from "lucide-react";
import { useMemo } from "react";

// バッチ3で作成したフック
import { useCreateLot } from "@/hooks/mutations";
import { useDialog, useToast, useTable, useFilters } from "@/hooks/ui";

// バッチ3で作成した共通コンポーネント
import {
  DataTable,
  TablePagination,
  SearchBar,
  FilterPanel,
  FilterField,
  StatusBadge,
  LotStatusBadge,
  type Column,
} from "@/components/shared/data";
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
import { useLotsQuery } from "@/hooks/api";
import type { LotWithStock } from "@/utils/validators/lot-schemas";

/**
 * メインコンポーネント
 */
export function InventoryPage() {
  // UI状態管理
  const createDialog = useDialog();
  const toast = useToast();
  const table = useTable({
    initialPageSize: 25,
    initialSort: { column: "receipt_date", direction: "desc" },
  });

  // フィルター状態管理
  const filters = useFilters({
    search: "",
    product_code: "",
    warehouseCode: "",
    status: "all",
    hasStock: false,
  });

  // データ取得
  const {
    data: allLots = [],
    isLoading,
    error,
    refetch,
  } = useLotsQuery({
    product_code: filters.values.productCode || undefined,
    warehouseCode: filters.values.warehouseCode || undefined,
    status: filters.values.status !== "all" ? filters.values.status : undefined,
    search: filters.values.search || undefined,
    hasStock: filters.values.hasStock,
  });

  // ロット作成Mutation
  const createLotMutation = useCreateLot({
    onSuccess: () => {
      toast.success("ロットを作成しました");
      createDialog.close();
    },
    onError: (error) => {
      toast.error(`作成に失敗しました: ${error.message}`);
    },
  });

  // テーブルカラム定義
  const columns: Column<LotWithStock>[] = useMemo(
    () => [
      {
        id: "lot_no",
        header: "ロット番号",
        cell: (lot) => <span className="font-medium">{lot.lot_no}</span>,
        sortable: true,
      },
      {
        id: "product_code",
        header: "製品コード",
        cell: (lot) => lot.product_code,
        sortable: true,
      },
      {
        id: "product_name",
        header: "製品名",
        cell: (lot) => lot.product_name || "-",
      },
      {
        id: "warehouse_code",
        header: "倉庫",
        cell: (lot) => lot.warehouse_name || lot.warehouse_code,
        sortable: true,
      },
      {
        id: "current_quantity",
        header: "現在在庫",
        cell: (lot) => (
          <span className={lot.current_quantity > 0 ? "font-semibold" : "text-gray-400"}>
            {lot.current_quantity.toLocaleString()}
          </span>
        ),
        sortable: true,
        align: "right",
      },
      {
        id: "unit",
        header: "単位",
        cell: (lot) => lot.unit || "EA",
        align: "center",
      },
      {
        id: "receipt_date",
        header: "入荷日",
        cell: (lot) => (lot.receipt_date ? format(new Date(lot.receipt_date), "yyyy/MM/dd") : "-"),
        sortable: true,
      },
      {
        id: "expiry_date",
        header: "有効期限",
        cell: (lot) => (lot.expiry_date ? format(new Date(lot.expiry_date), "yyyy/MM/dd") : "-"),
        sortable: true,
      },
      {
        id: "status",
        header: "ステータス",
        cell: (lot) => <LotStatusBadge status={lot.status} />,
        sortable: true,
        align: "center",
      },
    ],
    [],
  );

  // データの加工
  const sortedLots = table.sortData(allLots);
  const paginatedLots = table.paginateData(sortedLots);
  const pagination = table.calculatePagination(sortedLots.length);

  // 統計情報
  const stats = useMemo(() => {
    const totalLots = allLots.length;
    const activeLots = allLots.filter((lot) => lot.status === "active").length;
    const totalQuantity = allLots.reduce((sum, lot) => sum + (lot.current_quantity || 0), 0);

    return { totalLots, activeLots, totalQuantity };
  }, [allLots]);

  return (
    <PageContainer>
      <PageHeader
        title="ロット管理"
        subtitle="在庫ロットの一覧と登録"
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
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">総ロット数</div>
          <div className="mt-1 text-2xl font-bold">{stats.totalLots}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">有効ロット数</div>
          <div className="mt-1 text-2xl font-bold">{stats.activeLots}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">総在庫数</div>
          <div className="mt-1 text-2xl font-bold">{stats.totalQuantity.toLocaleString()}</div>
        </div>
      </div>

      {/* フィルター */}
      <Section className="mb-6">
        <FilterPanel
          title="検索・フィルター"
          activeCount={filters.activeCount}
          onReset={filters.reset}
        >
          <SearchBar
            value={filters.values.search}
            onChange={(value) => filters.set("search", value)}
            placeholder="ロット番号、製品コード、製品名で検索..."
          />

          <div className="grid grid-cols-3 gap-3">
            <FilterField label="製品コード">
              <Input
                value={filters.values.productCode}
                onChange={(e) => filters.set("productCode", e.target.value)}
                placeholder="例: P001"
              />
            </FilterField>

            <FilterField label="倉庫コード">
              <Input
                value={filters.values.warehouseCode}
                onChange={(e) => filters.set("warehouseCode", e.target.value)}
                placeholder="例: W01"
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
                  <SelectItem value="active">有効</SelectItem>
                  <SelectItem value="allocated">引当済</SelectItem>
                  <SelectItem value="shipped">出荷済</SelectItem>
                  <SelectItem value="inactive">無効</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hasStock"
              checked={filters.values.hasStock}
              onChange={(e) => filters.set("hasStock", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="hasStock" className="text-sm text-gray-700">
              在庫ありのみ表示
            </label>
          </div>
        </FilterPanel>
      </Section>

      {/* テーブル */}
      <Section>
        <DataTable
          data={paginatedLots}
          columns={columns}
          getRowKey={(lot) => lot.id}
          sort={table.sort}
          onSort={table.handleSort}
          isLoading={isLoading}
          error={error}
          emptyMessage="ロットがありません"
        />

        {!isLoading && !error && sortedLots.length > 0 && (
          <TablePagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
          />
        )}
      </Section>

      {/* 新規登録ダイアログ */}
      <FormDialog
        isOpen={createDialog.isOpen}
        onClose={createDialog.close}
        title="ロット新規登録"
        size="lg"
      >
        <LotCreateForm
          onSubmit={async (data) => {
            await createLotMutation.mutateAsync(data);
          }}
          onCancel={createDialog.close}
          isSubmitting={createLotMutation.isPending}
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
 * ロット作成フォームコンポーネント
 */
interface LotCreateFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

function LotCreateForm({ onSubmit, onCancel, isSubmitting }: LotCreateFormProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      lot_no: formData.get("lot_no") as string,
      product_code: formData.get("product_code") as string,
      warehouse_code: formData.get("warehouse_code") as string,
      quantity: Number(formData.get("quantity")),
      unit: formData.get("unit") as string,
      receipt_date: formData.get("receipt_date") as string,
      expiry_date: (formData.get("expiry_date") as string) || undefined,
      status: "active",
    };

    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lot_no">ロット番号 *</Label>
          <Input id="lot_no" name="lot_no" required placeholder="例: LOT-2024-001" />
        </div>

        <div>
          <Label htmlFor="product_code">製品コード *</Label>
          <Input id="product_code" name="product_code" required placeholder="例: P001" />
        </div>

        <div>
          <Label htmlFor="warehouse_code">倉庫コード *</Label>
          <Input id="warehouse_code" name="warehouse_code" required placeholder="例: W01" />
        </div>

        <div>
          <Label htmlFor="quantity">数量 *</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            required
            min="0"
            step="0.01"
            placeholder="例: 1000"
          />
        </div>

        <div>
          <Label htmlFor="unit">単位 *</Label>
          <Input id="unit" name="unit" required placeholder="例: EA" defaultValue="EA" />
        </div>

        <div>
          <Label htmlFor="receipt_date">入荷日 *</Label>
          <Input id="receipt_date" name="receipt_date" type="date" required />
        </div>

        <div className="col-span-2">
          <Label htmlFor="expiry_date">有効期限</Label>
          <Input id="expiry_date" name="expiry_date" type="date" />
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
