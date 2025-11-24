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

import { useAtom } from "jotai";
import { Plus, RefreshCw, MoreHorizontal, Pencil, Lock, Unlock } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

import * as styles from "./styles";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { LotCreateForm } from "@/features/inventory/components/LotCreateForm";
import { LotEditForm, type LotUpdateData } from "@/features/inventory/components/LotEditForm";
import { LotLockDialog } from "@/features/inventory/components/LotLockDialog";
import { useLotStats } from "@/features/inventory/hooks/useLotStats";
import { lotFiltersAtom, lotTableSettingsAtom } from "@/features/inventory/state";
import { useLotsQuery } from "@/hooks/api";
import { useCreateLot, useUpdateLot, useLockLot, useUnlockLot } from "@/hooks/mutations";
import { useDialog } from "@/hooks/ui";
import { getLotStatuses } from "@/shared/utils/status";
import { DataTable, type Column } from "@/shared/components/data/DataTable";
import { FilterField } from "@/shared/components/data/FilterField";
import { FilterPanel } from "@/shared/components/data/FilterPanel";
import { SearchBar } from "@/shared/components/data/SearchBar";
import { LotStatusBadge } from "@/shared/components/data/StatusBadge";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { FormDialog } from "@/shared/components/form";
import { Section } from "@/shared/components/layout";
import type { LotUI } from "@/shared/libs/normalize";
import type { LotResponse } from "@/shared/types/aliases";
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
  const editDialog = useDialog();
  const lockDialog = useDialog();
  const [selectedLot, setSelectedLot] = useState<LotResponse | null>(null);

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

  // Mutation Hooks
  const createLotMutation = useCreateLot({
    onSuccess: () => {
      toast.success("ロットを作成しました");
      createDialog.close();
    },
    onError: (error) => toast.error(`作成に失敗しました: ${error.message}`),
  });

  const updateLotMutation = useUpdateLot(selectedLot?.id ?? 0, {
    onSuccess: () => {
      toast.success("ロットを更新しました");
      editDialog.close();
      setSelectedLot(null);
    },
    onError: (error) => toast.error(`更新に失敗しました: ${error.message}`),
  });

  const lockLotMutation = useLockLot({
    onSuccess: () => {
      toast.success("ロットをロックしました");
      lockDialog.close();
      setSelectedLot(null);
    },
    onError: (error) => toast.error(`ロックに失敗しました: ${error.message}`),
  });

  const unlockLotMutation = useUnlockLot({
    onSuccess: () => {
      toast.success("ロットのロックを解除しました");
    },
    onError: (error) => toast.error(`ロック解除に失敗しました: ${error.message}`),
  });

  // ハンドラー
  const handleEdit = (lot: LotUI) => {
    // LotUI -> LotResponse 変換（簡易的）
    const lotData = allLots.find((l) => l.id === lot.id);
    if (lotData) {
      setSelectedLot(lotData);
      editDialog.open();
    }
  };

  const handleLock = (lot: LotUI) => {
    const lotData = allLots.find((l) => l.id === lot.id);
    if (lotData) {
      setSelectedLot(lotData);
      lockDialog.open();
    }
  };

  const handleUnlock = async (lot: LotUI) => {
    if (confirm(`ロット ${lot.lot_number} のロックを解除しますか？`)) {
      await unlockLotMutation.mutateAsync(lot.id);
    }
  };

  // カラム定義
  const columns = useMemo<Column<LotUI>[]>(
    () => [
      {
        id: "lot_number",
        header: "ロット番号",
        cell: (lot) => (
          <div className="flex flex-col">
            <span className="font-medium">{lot.lot_number}</span>
            {lot.status === "locked" && (
              <span className="text-xs text-red-600 flex items-center gap-1">
                <Lock className="h-3 w-3" /> ロック中
              </span>
            )}
          </div>
        ),
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
        cell: (lot) => lot.product_name,
      },
      {
        id: "delivery_place_id",
        header: "納品場所",
        cell: (lot) => lot.delivery_place_id ?? "–",
        sortable: true,
      },
      {
        id: "current_quantity",
        header: "現在在庫",
        cell: (lot) => {
          const qty = Number(lot.current_quantity);
          return <span className={qty > 0 ? "font-semibold" : "text-gray-400"}>{fmt(qty)}</span>;
        },
        sortable: true,
        align: "right",
      },
      {
        id: "unit",
        header: "単位",
        cell: (lot) => lot.unit,
        align: "center",
      },
      {
        id: "receipt_date",
        header: "入荷日",
        cell: (lot) =>
          lot.receipt_date && lot.receipt_date !== "-"
            ? format(new Date(lot.receipt_date), "yyyy/MM/dd")
            : "-",
        sortable: true,
      },
      {
        id: "expiry_date",
        header: "有効期限",
        cell: (lot) =>
          lot.expiry_date && lot.expiry_date !== "-"
            ? format(new Date(lot.expiry_date), "yyyy/MM/dd")
            : "-",
        sortable: true,
      },
      {
        id: "status",
        header: "ステータス",
        cell: (lot) => {
          const statuses = getLotStatuses(lot);
          return (
            <>
              {statuses.map((s) => (
                <LotStatusBadge key={s} status={s} className="mr-1" />
              ))}
            </>
          );
        },
        sortable: true,
        align: "center",
      },
      {
        id: "actions",
        header: "",
        cell: (lot) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">メニューを開く</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(lot)}>
                <Pencil className="mr-2 h-4 w-4" />
                編集
              </DropdownMenuItem>
              {lot.status === "locked" ? (
                <DropdownMenuItem onClick={() => handleUnlock(lot)}>
                  <Unlock className="mr-2 h-4 w-4" />
                  ロック解除
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleLock(lot)} className="text-red-600">
                  <Lock className="mr-2 h-4 w-4" />
                  ロック
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [allLots],
  );

  // フィルタリング
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
    setTableSettings({ ...tableSettings, page: 0 });
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
    <div className={styles.root}>
      {/* アクションバー */}
      <div className={styles.actionBar}>
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
      <div className={styles.statsGrid}>
        <div className={styles.statsCard({ variant: "default" })}>
          <div className={styles.statsLabel}>総ロット数</div>
          <div className={styles.statsValue({ color: "default" })}>{fmt(stats.totalLots)}</div>
        </div>
        <div className={styles.statsCard({ variant: "active" })}>
          <div className={styles.statsLabel}>有効ロット数</div>
          <div className={styles.statsValue({ color: "blue" })}>{fmt(stats.activeLots)}</div>
        </div>
        <div className={styles.statsCard({ variant: "default" })}>
          <div className={styles.statsLabel}>総在庫数</div>
          <div className={styles.statsValue({ color: "default" })}>{fmt(stats.totalQuantity)}</div>
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

          <div className={styles.filterGrid}>
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
                  <SelectItem value="locked">ロック中</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
          </div>

          <div className={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="inStockOnly"
              checked={filters.inStockOnly ?? false}
              onChange={(e) => handleFilterChange("inStockOnly", e.target.checked)}
              className={styles.checkbox}
            />
            <label htmlFor="inStockOnly" className={styles.checkboxLabel}>
              在庫ありのみ表示
            </label>
          </div>
        </FilterPanel>
      </Section>

      {/* エラー表示 */}
      {error && (
        <Section>
          <div className={styles.errorState.root}>
            <p className={styles.errorState.title}>データの取得に失敗しました</p>
            <p className={styles.errorState.message}>
              {error instanceof Error ? error.message : "サーバーエラーが発生しました"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className={styles.errorState.retryButton}
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

      {/* 編集ダイアログ */}
      {selectedLot && (
        <FormDialog
          open={editDialog.isOpen}
          onClose={() => {
            editDialog.close();
            setSelectedLot(null);
          }}
          title="ロット編集"
          description={`ロット ${selectedLot.lot_number} を編集します`}
          size="lg"
        >
          <LotEditForm
            initialData={selectedLot}
            onSubmit={async (data: LotUpdateData) => {
              await updateLotMutation.mutateAsync(data);
            }}
            onCancel={() => {
              editDialog.close();
              setSelectedLot(null);
            }}
            isSubmitting={updateLotMutation.isPending}
          />
        </FormDialog>
      )}

      {/* ロック確認ダイアログ */}
      {selectedLot && (
        <LotLockDialog
          open={lockDialog.isOpen}
          onClose={() => {
            lockDialog.close();
            setSelectedLot(null);
          }}
          onConfirm={async (reason) => {
            await lockLotMutation.mutateAsync({ id: selectedLot.id, reason });
          }}
          isSubmitting={lockLotMutation.isPending}
          lotNumber={selectedLot.lot_number}
        />
      )}
    </div>
  );
}
