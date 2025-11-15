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

import { format } from "date-fns";
import { useAtom } from "jotai";
import { Plus, RefreshCw } from "lucide-react";
import { useMemo } from "react";

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
import { lotFiltersAtom, lotTableSettingsAtom } from "@/features/inventory/state";
import { useLotsQuery } from "@/hooks/api";
import { useCreateLot } from "@/hooks/mutations";
import { useDialog, useToast } from "@/hooks/ui";
import { DataTable, type Column } from "@/shared/components/data/DataTable";
import { FilterField } from "@/shared/components/data/FilterField";
import { FilterPanel } from "@/shared/components/data/FilterPanel";
import { SearchBar } from "@/shared/components/data/SearchBar";
import { LotStatusBadge } from "@/shared/components/data/StatusBadge";
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
  const toast = useToast();

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

  // テーブルカラム定義
  const columns: Column<LotUI>[] = useMemo(
    () => [
      {
        id: "lot_number",
        header: "ロット番号",
        cell: (lot: LotUI) => <span className="font-medium">{lot.lot_number}</span>,
        sortable: true,
      },
      {
        id: "product_code",
        header: "製品コード",
        cell: (lot: LotUI) => lot.product_code,
        sortable: true,
      },
      {
        id: "product_name",
        header: "製品名",
        cell: (lot: LotUI) => lot.product_name,
      },
      {
        id: "delivery_place_id",
        header: "納品場所",
        cell: (lot: LotUI): string | number => lot.delivery_place_id ?? "–",
        sortable: true,
      },
      {
        id: "current_quantity",
        header: "現在在庫",
        cell: (lot: LotUI) => {
          const qty = Number(lot.current_quantity);
          return <span className={qty > 0 ? "font-semibold" : "text-gray-400"}>{fmt(qty)}</span>;
        },
        sortable: true,
        align: "right",
      },
      {
        id: "unit",
        header: "単位",
        cell: (lot: LotUI): string => lot.unit,
        align: "center",
      },
      {
        id: "receipt_date",
        header: "入荷日",
        cell: (lot: LotUI) =>
          lot.receipt_date && lot.receipt_date !== "-"
            ? format(new Date(lot.receipt_date), "yyyy/MM/dd")
            : "-",
        sortable: true,
      },
      {
        id: "expiry_date",
        header: "有効期限",
        cell: (lot: LotUI) =>
          lot.expiry_date && lot.expiry_date !== "-"
            ? format(new Date(lot.expiry_date), "yyyy/MM/dd")
            : "-",
        sortable: true,
      },
      {
        id: "status",
        header: "ステータス",
        cell: (lot: LotUI) => {
          const status = Number(lot.current_quantity) > 0 ? "available" : "depleted";
          return <LotStatusBadge status={status} />;
        },
        sortable: true,
        align: "center",
      },
    ],
    [],
  );

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
  const stats = useMemo(() => {
    const totalLots = allLots.length;
    const activeLots = allLots.filter((lot) => Number(lot.current_quantity) > 0).length;
    const totalQuantity = allLots.reduce<number>(
      (sum, lot) => sum + Number(lot.current_quantity),
      0,
    );

    return { totalLots, activeLots, totalQuantity };
  }, [allLots]);

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

      {/* トースト表示 */}
      {toast.toasts.map((t) => (
        <div
          key={t.id}
          className={`fixed right-6 bottom-6 rounded-lg px-4 py-3 text-sm shadow-lg ${
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
    </div>
  );
}

// ============================================
// サブコンポーネント
// ============================================

interface LotCreateFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

function LotCreateForm({ onSubmit, onCancel, isSubmitting }: LotCreateFormProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      lot_number: formData.get("lot_number") as string,
      product_code: formData.get("product_code") as string,
      supplier_code: formData.get("supplier_code") as string,
      delivery_place_code: formData.get("delivery_place_code") as string,
      quantity: Number(formData.get("quantity")),
      lot_unit: formData.get("lot_unit") as string,
      receipt_date: formData.get("receipt_date") as string,
      expiry_date: (formData.get("expiry_date") as string) || undefined,
    };

    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lot_number">ロット番号 *</Label>
          <Input id="lot_number" name="lot_number" required placeholder="例: LOT-2024-001" />
        </div>

        <div>
          <Label htmlFor="product_code">製品コード *</Label>
          <Input id="product_code" name="product_code" required placeholder="例: P001" />
        </div>

        <div>
          <Label htmlFor="supplier_code">仕入先コード *</Label>
          <Input id="supplier_code" name="supplier_code" required placeholder="例: S001" />
        </div>

        <div>
          <Label htmlFor="delivery_place_code">納品場所コード *</Label>
          <Input
            id="delivery_place_code"
            name="delivery_place_code"
            required
            placeholder="例: DP01"
          />
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
          <Label htmlFor="lot_unit">単位 *</Label>
          <Input id="lot_unit" name="lot_unit" required placeholder="例: EA" defaultValue="EA" />
        </div>

        <div>
          <Label htmlFor="receipt_date">入荷日 *</Label>
          <Input id="receipt_date" name="receipt_date" type="date" required />
        </div>

        <div>
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
