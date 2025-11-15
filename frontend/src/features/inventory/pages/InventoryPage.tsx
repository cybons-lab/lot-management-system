/**
 * InventoryPage.tsx (リファクタリング版)
 *
 * ロット管理画面
 * - 新しいフック・コンポーネントを使用
 * - データ取得: useLotsQuery
 * - UI状態管理: useDialog, useToast, useTable, useFilters
 * - 共通コンポーネント: PageHeader, Section, DataTable, etc.
 */
/* eslint-disable max-lines */

import { format } from "date-fns";
import { Plus, RefreshCw } from "lucide-react";
import { useMemo } from "react";

// バッチ3で作成したフック

// バッチ3で作成した共通コンポーネント
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
import { useCreateLot } from "@/hooks/mutations";
import { useDialog, useToast, useTable, useFilters } from "@/hooks/ui";
import { DataTable, type Column } from "@/shared/components/data/DataTable";
import { FilterField } from "@/shared/components/data/FilterField";
import { FilterPanel } from "@/shared/components/data/FilterPanel";
import { SearchBar } from "@/shared/components/data/SearchBar";
import { LotStatusBadge } from "@/shared/components/data/StatusBadge";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { FormDialog } from "@/shared/components/form";
import { PageHeader, PageContainer, Section } from "@/shared/components/layout";
import type { LotUI } from "@/shared/libs/normalize";
import { formatCodeAndName } from "@/shared/libs/utils";

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
    delivery_place_code: "", // warehouse_code → delivery_place_code
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
    product_code: filters.values.product_code || undefined,
    with_stock: filters.values.hasStock,
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
        id: "delivery_place",
        header: "納品先",
        cell: (lot: LotUI): string => {
          // LotUI から delivery_place_* を段階的に外しているため、存在時のみ安全にナローイング
          const codeUnknown = (lot as unknown as { delivery_place_code?: unknown })
            .delivery_place_code;
          const nameUnknown = (lot as unknown as { delivery_place_name?: unknown })
            .delivery_place_name;
          const code =
            typeof codeUnknown === "string" || codeUnknown == null
              ? (codeUnknown as string | null | undefined)
              : undefined;
          const name =
            typeof nameUnknown === "string" || nameUnknown == null
              ? (nameUnknown as string | null | undefined)
              : undefined;
          return formatCodeAndName(code, name) || "—";
        },
        sortable: true,
      },
      {
        id: "current_quantity",
        header: "現在在庫",
        cell: (lot: LotUI) => {
          const qty = Number(lot.current_quantity);
          return (
            <span className={qty > 0 ? "font-semibold" : "text-gray-400"}>
              {qty.toLocaleString()}
            </span>
          );
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
          // Derive status from current_quantity (DDL v2.2: DECIMAL as string)
          const status = Number(lot.current_quantity) > 0 ? "available" : "depleted";
          return <LotStatusBadge status={status} />;
        },
        sortable: true,
        align: "center",
      },
    ],
    [],
  );

  // データの加工
  const sortedLots = table.sortData(allLots);
  const paginatedLots = table.paginateData(sortedLots);
  // 安全なtotal計算
  const safeTotalCount = sortedLots?.length ?? allLots?.length ?? 0;
  const pagination = table.calculatePagination(safeTotalCount);

  // 統計情報
  const stats = useMemo(() => {
    const totalLots = allLots?.length ?? 0;
    const activeLots = (allLots ?? []).filter(
      (lot: LotUI) => Number(lot.current_quantity) > 0,
    ).length;
    const totalQuantity = (allLots ?? []).reduce<number>(
      (sum, lot) => sum + Number(lot.current_quantity),
      0,
    );

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
      <div className="mb-6 grid grid-cols-3 gap-4">
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
        <FilterPanel title="検索・フィルター" onReset={filters.reset}>
          <SearchBar
            value={filters.values.search}
            onChange={(value: string) => filters.set("search", value)}
            placeholder="ロット番号、製品コード、製品名で検索..."
          />

          <div className="grid grid-cols-3 gap-3">
            <FilterField label="製品コード">
              <Input
                value={filters.values.product_code}
                onChange={(e) => filters.set("product_code", e.target.value)}
                placeholder="例: P001"
              />
            </FilterField>

            <FilterField label="納品先コード">
              {/* 倉庫コード → 納品先コード */}
              <Input
                value={filters.values.delivery_place_code}
                onChange={(e) => filters.set("delivery_place_code", e.target.value)}
                placeholder="例: DP-001"
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
              onChange={(e) => filters.set("hasStock", e.target.checked as false)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="hasStock" className="text-sm text-gray-700">
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
            table.sort && table.sort.column && table.sort.direction
              ? { column: table.sort.column, direction: table.sort.direction }
              : undefined
          }
          isLoading={isLoading}
          emptyMessage="ロットがありません。新規登録ボタンから最初のロットを作成してください。"
        />

        {!isLoading && !error && sortedLots.length > 0 && (
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
    </PageContainer>
  );
}

/**
 * ロット作成フォームコンポーネント
 */
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
      delivery_place_code: formData.get("delivery_place_code") as string, // warehouse_code → delivery_place_code
      delivery_place_name: formData.get("delivery_place_name") as string, // 追加
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
          <Label htmlFor="delivery_place_code">納品先コード</Label>
          {/* 倉庫コード → 納品先コード */}
          <Input id="delivery_place_code" name="delivery_place_code" placeholder="例: DP-001" />
        </div>

        <div>
          <Label htmlFor="delivery_place_name">納品先名</Label>
          {/* 追加 */}
          <Input id="delivery_place_name" name="delivery_place_name" placeholder="例: 東京倉庫" />
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
