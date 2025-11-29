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
import { Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { LotCreateForm } from "@/features/inventory/components/LotCreateForm";
import { LotEditForm, type LotUpdateData } from "@/features/inventory/components/LotEditForm";
import { LotLockDialog } from "@/features/inventory/components/LotLockDialog";
import { LotsPageFilters } from "@/features/inventory/components/LotsPageFilters";
import { LotStatsCards } from "@/features/inventory/components/LotStatsCards";
import { ProductGroupHeader } from "@/features/inventory/components/ProductGroupHeader";
import { useLotColumns } from "@/features/inventory/hooks/useLotColumns";
import { useLotStats } from "@/features/inventory/hooks/useLotStats";
import { lotFiltersAtom, lotTableSettingsAtom } from "@/features/inventory/state";
import { groupLotsByProduct } from "@/features/inventory/utils/groupLots";
import { useLotsQuery } from "@/hooks/api";
import { useCreateLot, useUpdateLot, useLockLot, useUnlockLot } from "@/hooks/mutations";
import { useDialog } from "@/hooks/ui";
import { useDebounce } from "@/hooks/ui/useDebounce";
import { DataTable } from "@/shared/components/data/DataTable";
import { TablePagination } from "@/shared/components/data/TablePagination";
import { FormDialog } from "@/shared/components/form";
import type { LotUI } from "@/shared/libs/normalize";
import { getLotStatuses } from "@/shared/utils/status";

// ============================================
// メインコンポーネント
// ============================================

export function LotsPage() {
  // Jotai状態管理
  const [filters, setFilters] = useAtom(lotFiltersAtom);
  const [tableSettings, setTableSettings] = useAtom(lotTableSettingsAtom);
  const [searchParams] = useSearchParams();

  // UI状態管理
  const createDialog = useDialog();
  const editDialog = useDialog();
  const lockDialog = useDialog();
  const [selectedLot, setSelectedLot] = useState<LotUI | null>(null);

  // 表示モード（製品別グループ / フラット）
  const [viewMode] = useState<"grouped" | "flat">("grouped");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // 検索・フィルター状態
  const [searchTerm, setSearchTerm] = useState(filters.search ?? "");
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);

  // URLクエリパラメータから検索条件を初期化
  useEffect(() => {
    const searchParam = searchParams.get("search");
    if (searchParam && searchParam !== filters.search) {
      setFilters((prev) => ({ ...prev, search: searchParam }));
      setSearchTerm(searchParam);
    }
  }, [searchParams, setFilters]);

  // 検索語のデバウンス
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // デバウンスされた検索語をフィルタに適用
  useEffect(() => {
    if (debouncedSearchTerm !== filters.search) {
      setFilters((prev) => ({ ...prev, search: debouncedSearchTerm }));
      setTableSettings((prev) => ({ ...prev, page: 0 }));
    }
  }, [debouncedSearchTerm, filters.search, setFilters, setTableSettings]);

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
  const handleEdit = useCallback(
    (lot: LotUI) => {
      // LotUI -> LotResponse 変換（簡易的）
      const lotData = allLots.find((l) => l.id === lot.id);
      if (lotData) {
        setSelectedLot(lotData);
        editDialog.open();
      }
    },
    [allLots, editDialog],
  );

  const handleLock = useCallback(
    (lot: LotUI) => {
      const lotData = allLots.find((l) => l.id === lot.id);
      if (lotData) {
        setSelectedLot(lotData);
        lockDialog.open();
      }
    },
    [allLots, lockDialog],
  );

  const handleUnlock = useCallback(
    async (lot: LotUI) => {
      if (confirm(`ロット ${lot.lot_number} のロックを解除しますか？`)) {
        await unlockLotMutation.mutateAsync({ id: lot.id });
      }
    },
    [unlockLotMutation],
  );

  // カラム定義
  const columns = useLotColumns({
    viewMode,
    onEdit: handleEdit,
    onLock: handleLock,
    onUnlock: handleUnlock,
  });

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
    setSearchTerm("");
    setFilters({
      search: "",
      productCode: null,
      warehouseCode: null,
      status: "all",
      inStockOnly: false,
    });
    setTableSettings({ ...tableSettings, page: 0 });
  };

  // 行のスタイル判定
  const getRowClassName = (lot: LotUI) => {
    const statuses = getLotStatuses(lot);
    if (statuses.includes("locked")) {
      // ロック中は全体を薄く表示
      return "opacity-50";
    }
    return "";
  };

  // グループ化されたロット
  const groupedLots = useMemo(() => groupLotsByProduct(paginatedLots), [paginatedLots]);

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
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
      <LotStatsCards stats={stats} />

      {/* フィルター */}
      <LotsPageFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isAdvancedOpen={isAdvancedFilterOpen}
        onToggleAdvanced={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
      />

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

      {/* テーブル */}
      {/* 表示モード別コンテンツ */}
      {viewMode === "grouped" ? (
        // グループ化表示
        <div className="space-y-6">
          {groupedLots.map((group) => (
            <div
              key={group.key}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <ProductGroupHeader
                productCode={group.productCode}
                productName={group.productName}
                supplierName={group.supplierName}
                totalCurrentQuantity={group.totalCurrentQuantity}
                lotCount={group.lotCount}
                minExpiryDate={group.minExpiryDate}
                isExpanded={expandedGroups.has(group.key)}
                onToggle={() => {
                  const newExpanded = new Set(expandedGroups);
                  if (newExpanded.has(group.key)) {
                    newExpanded.delete(group.key);
                  } else {
                    newExpanded.add(group.key);
                  }
                  setExpandedGroups(newExpanded);
                }}
              />
              {expandedGroups.has(group.key) && (
                <DataTable
                  data={group.lots}
                  columns={columns}
                  sort={
                    tableSettings.sortColumn && tableSettings.sortDirection
                      ? { column: tableSettings.sortColumn, direction: tableSettings.sortDirection }
                      : undefined
                  }
                  isLoading={isLoading}
                  emptyMessage="ロットがありません。"
                  getRowClassName={getRowClassName}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        // フラット表示（従来通り）
        <div className="space-y-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
            getRowClassName={getRowClassName}
          />
          {/* ページネーション */}
          {!isLoading && !error && sortedLots.length > 0 && (
            <div className="border-t border-slate-200 px-6 py-4">
              <TablePagination
                currentPage={(tableSettings.page ?? 0) + 1}
                pageSize={tableSettings.pageSize ?? 25}
                totalCount={sortedLots.length}
                onPageChange={(page) => setTableSettings({ ...tableSettings, page: page - 1 })}
                onPageSizeChange={(pageSize) =>
                  setTableSettings({ ...tableSettings, pageSize, page: 0 })
                }
              />
            </div>
          )}
        </div>
      )}

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
          onConfirm={async (reason, quantity) => {
            await lockLotMutation.mutateAsync({ id: selectedLot.id, reason, quantity });
          }}
          isSubmitting={lockLotMutation.isPending}
          lotNumber={selectedLot.lot_number}
          availableQuantity={
            Number(selectedLot.current_quantity) -
            Number(selectedLot.allocated_quantity) -
            Number(selectedLot.locked_quantity || 0)
          }
        />
      )}
    </div>
  );
}
