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
import {
  Plus,
  RefreshCw,
  MoreHorizontal,
  Pencil,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  Search,
  Package,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

import * as styles from "./styles";

import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
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
import { ProductGroupHeader } from "@/features/inventory/components/ProductGroupHeader";
import { useLotStats } from "@/features/inventory/hooks/useLotStats";
import { lotFiltersAtom, lotTableSettingsAtom } from "@/features/inventory/state";
import { groupLotsByProduct } from "@/features/inventory/utils/groupLots";
import { useLotsQuery } from "@/hooks/api";
import { useCreateLot, useUpdateLot, useLockLot, useUnlockLot } from "@/hooks/mutations";
import { useDialog } from "@/hooks/ui";
import { useDebounce } from "@/hooks/ui/useDebounce";
import { getLotStatuses } from "@/shared/utils/status";
import { DataTable, type Column } from "@/shared/components/data/DataTable";
import { LotStatusIcon } from "@/shared/components/data/LotStatusIcon";
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

  // 表示モード（製品別グループ / フラット）
  const [viewMode] = useState<"grouped" | "flat">("grouped");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // 検索・フィルター状態
  const [searchTerm, setSearchTerm] = useState(filters.search ?? "");
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);

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

  // カラム定義（共通部分）
  const baseColumns: Column<LotUI>[] = useMemo(
    () => [
      {
        id: "lot_number",
        header: "ロット番号",
        cell: (lot) => (
          <div className="flex flex-col">
            <span className="font-medium">{lot.lot_number}</span>
            {lot.status === "locked" && (
              <span className="flex items-center gap-1 text-xs text-amber-500">
                <Lock className="h-3 w-3" /> ロック中
              </span>
            )}
          </div>
        ),
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
            <div className="flex items-center justify-start gap-1">
              {statuses.map((s) => (
                <LotStatusIcon key={s} status={s as "locked" | "available" | "depleted"} />
              ))}
            </div>
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

  // グループ表示用カラム（仕入先なし）
  const groupedColumns = baseColumns;

  // フラット表示用カラム（製品コード・製品名・仕入先を追加）
  const flatColumns: Column<LotUI>[] = useMemo(
    () => [
      baseColumns[0], // lot_number
      {
        id: "product_code",
        header: "製品コード",
        cell: (lot) => lot.product_code ?? "–",
        sortable: true,
      },
      {
        id: "product_name",
        header: "製品名",
        cell: (lot) => lot.product_name ?? "–",
      },
      {
        id: "supplier_name",
        header: "仕入先",
        cell: (lot) => lot.supplier_name ?? "–",
        sortable: true,
      },
      ...baseColumns.slice(1), // current_quantity以降
    ],
    [baseColumns],
  );

  // 表示モードに応じてカラムを切り替え
  const columns = viewMode === "grouped" ? groupedColumns : flatColumns;

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
      // ロック中は左端にアクセントカラーのみ (背景白)
      return "bg-white border-l-4 border-amber-400";
    }
    return "bg-white border-l-4 border-transparent"; // デフォルトも透明なボーダーを入れて位置ずれ防止
  };

  // グループ化されたロット
  const groupedLots = useMemo(() => groupLotsByProduct(paginatedLots), [paginatedLots]);

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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総ロット数</CardTitle>
            <Package className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLots}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">有効ロット数</CardTitle>
            <div className="h-4 w-4 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.activeLots}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総在庫数</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(stats.totalQuantity)}</div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Section className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
            <Input
              placeholder="ロット番号、製品コード、製品名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
            className="whitespace-nowrap"
          >
            詳細フィルター
            {isAdvancedFilterOpen ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronRight className="ml-2 h-4 w-4" />
            )}
          </Button>
        </div>

        {isAdvancedFilterOpen && (
          <div className="grid grid-cols-1 gap-4 rounded-lg border bg-gray-50 p-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">製品コード</label>
              <Input
                placeholder="PROD-..."
                value={filters.productCode ?? ""}
                onChange={(e) => handleFilterChange("productCode", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">倉庫コード</label>
              <Input
                placeholder="WH-..."
                value={filters.warehouseCode ?? ""}
                onChange={(e) => handleFilterChange("warehouseCode", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ステータス</label>
              <Select
                value={filters.status ?? "all"}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全て" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  <SelectItem value="active">有効</SelectItem>
                  <SelectItem value="locked">ロック中</SelectItem>
                  <SelectItem value="depleted">在庫切れ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between space-x-2 pb-2">
              <div className="flex items-center space-x-2">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-gray-500"
              >
                リセット
              </Button>
            </div>
          </div>
        )}
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
      {/* 表示モード別コンテンツ */}
      {viewMode === "grouped" ? (
        // グループ化表示
        <div className="space-y-6">
          {groupedLots.map((group) => (
            <div key={group.key} className="overflow-hidden rounded-lg border bg-white shadow-sm">
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
            getRowClassName={getRowClassName}
          />
          {/* ページネーション */}
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
