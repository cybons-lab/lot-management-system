/**
 * LotsPage.tsx (Jotaiリファクタリング版)
 *
 * ロット一覧ページ
 * - Jotai + sessionStorage で状態管理
 * - URLにクエリパラメータは出さない
 * - with_stock=true でAPI呼び出し
 */
/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
/* eslint-disable max-lines */

import { useAtom } from "jotai";
import { Plus, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { LotCreateForm } from "@/features/inventory/components/LotCreateForm";
import { useLotStats } from "@/features/inventory/hooks/useLotStats";
import { columns } from "@/features/inventory/pages/LotsPage/columns";
import { lotFiltersAtom, lotTableSettingsAtom } from "@/features/inventory/state";
import { useLotsQuery } from "@/hooks/api";
import { useCreateLot } from "@/hooks/mutations";
import { useDialog } from "@/hooks/ui";
import { DataTable } from "@/shared/components/data/DataTable";
import { FilterField } from "@/shared/components/data/FilterField";
import { FilterPanel } from "@/shared/components/data/FilterPanel";
import { SearchBar } from "@/shared/components/data/SearchBar";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { FormDialog } from "@/shared/components/form";
import { Section } from "@/shared/components/layout";
import type { LotUI } from "@/shared/libs/normalize";
import { fmt } from "@/shared/utils/number";
// ============================================
// メインコンポーネント
// ============================================

export function LotsPage() {
  // Jotai状態管理
  const [filters, setFilters] = useAtom(lotFiltersAtom);
  const [tableSettings, setTableSettings] = useAtom(lotTableSettingsAtom);

  // UI状態管理
  const createDialog = useDialog();

  // データ取得（null → undefined 変換）
  const {
    data: allLots = [],
    isLoading,
    error,
    refetch,
  } = useLotsQuery({
    with_stock: filters.inStockOnly || undefined,
    product_code: filters.productCode ?? undefined,
    delivery_place_code: filters.warehouseCode ?? undefined,
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

  // フィルタリング（検索テキスト）
  const filteredLots = useMemo(() => {
    if (!filters.search) return allLots;

    const searchLower = filters.search.toLowerCase();
    return allLots.filter(
      (lot) =>
        lot.lot_number?.toLowerCase().includes(searchLower) ||
        lot.product_code?.toLowerCase().includes(searchLower) ||
        lot.product_name?.toLowerCase().includes(searchLower),
    );
  }, [allLots, filters.search]);

  // ソート
  const sortedLots = useMemo(() => {
    if (!tableSettings.sortColumn) return filteredLots;

    const sorted = [...filteredLots].sort((a, b) => {
      const aVal = a[tableSettings.sortColumn as keyof LotUI];
      const bVal = b[tableSettings.sortColumn as keyof LotUI];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return tableSettings.sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return tableSettings.sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return sorted;
  }, [filteredLots, tableSettings.sortColumn, tableSettings.sortDirection]);

  // ページネーション
  const paginatedLots = useMemo(() => {
    const start = (tableSettings.page ?? 0) * (tableSettings.pageSize ?? 25);
    const end = start + (tableSettings.pageSize ?? 25);
    return sortedLots.slice(start, end);
  }, [sortedLots, tableSettings.page, tableSettings.pageSize]);

  // 統計情報
  const stats = useLotStats(allLots);

  // ハンドラー
  const handleFilterChange = (key: string, value: unknown) => {
    setFilters({ ...filters, [key]: value });
    setTableSettings({ ...tableSettings, page: 0 }); // フィルタ変更時はページをリセット
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      productCode: null,
      warehouseCode: null,
      status: "all",
      inStockOnly: false,
    });
    setTableSettings({ ...tableSettings, page: 0 });
  };

  return (
    <div className="space-y-6">
      {/* アクションバー */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          更新
        </Button>
        <Button size="sm" onClick={createDialog.open}>
          <Plus className="mr-2 h-4 w-4" />
          新規登録
        </Button>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md">
          <div className="text-sm font-medium text-gray-600">総ロット数</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{fmt(stats.totalLots)}</div>
        </div>
        <div className="group rounded-xl border-t border-r border-b border-l-4 border-gray-200 border-l-blue-500 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="text-sm font-medium text-gray-600">有効ロット数</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">{fmt(stats.activeLots)}</div>
        </div>
        <div className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md">
          <div className="text-sm font-medium text-gray-600">総在庫数</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{fmt(stats.totalQuantity)}</div>
        </div>
      </div>

      {/* フィルター */}
      <Section>
        <FilterPanel title="検索・フィルター" onReset={handleResetFilters}>
          <SearchBar
            value={filters.search ?? ""}
            onChange={(value: string) => handleFilterChange("search", value)}
            placeholder="ロット番号、製品コード、製品名で検索..."
          />

          <div className="grid grid-cols-3 gap-3">
            <FilterField label="製品コード">
              <Input
                value={filters.productCode ?? ""}
                onChange={(e) => handleFilterChange("productCode", e.target.value || null)}
                placeholder="例: P001"
              />
            </FilterField>

            <FilterField label="納品場所コード">
              <Input
                value={filters.warehouseCode ?? ""}
                onChange={(e) => handleFilterChange("warehouseCode", e.target.value || null)}
                placeholder="例: DP01"
              />
            </FilterField>

            <FilterField label="ステータス">
              <Select
                value={filters.status ?? "all"}
                onValueChange={(value) => handleFilterChange("status", value)}
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
              id="inStockOnly"
              checked={filters.inStockOnly ?? false}
              onChange={(e) => handleFilterChange("inStockOnly", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="inStockOnly" className="text-sm text-gray-700">
              在庫ありのみ表示
            </label>
          </div>
        </FilterPanel>
      </Section>

      {/* エラー表示 */}
      {error && (
        <Section>
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-semibold text-red-800">データの取得に失敗しました</p>
            <p className="mt-2 text-xs text-red-600">
              {error instanceof Error ? error.message : "サーバーエラーが発生しました"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-4 border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              再試行
            </Button>
          </div>
        </Section>
      )}

      {/* テーブル */}
      <Section>
        <DataTable
          data={paginatedLots}
          columns={columns}
          sort={
            tableSettings.sortColumn && tableSettings.sortDirection
              ? { column: tableSettings.sortColumn, direction: tableSettings.sortDirection }
              : undefined
          }
          isLoading={isLoading}
          emptyMessage="ロットがありません。新規登録ボタンから最初のロットを作成してください。"
        />

        {!isLoading && !error && sortedLots.length > 0 && (
          <TablePagination
            currentPage={(tableSettings.page ?? 0) + 1}
            pageSize={tableSettings.pageSize ?? 25}
            totalCount={sortedLots.length}
            onPageChange={(page) => setTableSettings({ ...tableSettings, page: page - 1 })}
            onPageSizeChange={(pageSize) =>
              setTableSettings({ ...tableSettings, pageSize, page: 0 })
            }
          />
        )}
      </Section>

      {/* 新規登録ダイアログ */}
      <FormDialog
        open={createDialog.isOpen}
        onClose={createDialog.close}
        title="ロット新規登録"
        description="新しいロットを登録します"
        size="lg"
      >
        <LotCreateForm
          onSubmit={async (data) => {
            await createLotMutation.mutateAsync(
              data as Parameters<typeof createLotMutation.mutateAsync>[0],
            );
          }}
          onCancel={createDialog.close}
          isSubmitting={createLotMutation.isPending}
        />
      </FormDialog>
    </div>
  );
}

