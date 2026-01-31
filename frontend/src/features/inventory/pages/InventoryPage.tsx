import {
  ArrowUpFromLine,
  Box,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  History,
  Home,
  List,
  Package,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button, Label } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import { ROUTES } from "@/constants/routes";
import {
  SupplierAssignmentWarning,
  SupplierFilterCheckbox,
} from "@/features/assignments/components";
import { useSupplierFilter } from "@/features/assignments/hooks";
import { InventoryByProductTable } from "@/features/inventory/components/InventoryByProductTable";
import { InventoryBySupplierTable } from "@/features/inventory/components/InventoryBySupplierTable";
import { InventoryByWarehouseTable } from "@/features/inventory/components/InventoryByWarehouseTable";
import { InventoryTable } from "@/features/inventory/components/InventoryTable";
import { LotSearchPanel } from "@/features/inventory/components/LotSearchPanel";
import { useInventoryItems } from "@/features/inventory/hooks";
import { useFilterOptions } from "@/features/inventory/hooks/useFilterOptions";
import { useInventoryPageState } from "@/features/inventory/hooks/useInventoryPageState";
import {
  useInventoryByProduct,
  useInventoryBySupplier,
  useInventoryByWarehouse,
} from "@/hooks/api";
import { ExportButton } from "@/shared/components/ExportButton";
import { Section } from "@/shared/components/layout";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function InventoryPage() {
  const navigate = useNavigate();
  // Refresh loading state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 担当仕入先フィルターロジック（共通フック）
  const { filterEnabled, toggleFilter } = useSupplierFilter();

  // Page state (Jotai atom - persisted in sessionStorage)
  const {
    overviewMode,
    filters,
    queryParams,
    setOverviewMode,
    updateFilter,
    setFilters,
    resetFilters,
  } = useInventoryPageState();

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 共通フックのfilterEnabledとfiltersのprimary_staff_onlyを同期
  useEffect(() => {
    updateFilter("primary_staff_only", filterEnabled);
  }, [filterEnabled, updateFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Data Fetching
  const {
    data,
    isLoading: isItemsLoading,
    refetch: refetchItems,
  } = useInventoryItems({
    ...queryParams,
    skip: (page - 1) * pageSize,
    limit: pageSize,
  });

  const inventoryItems = data?.items ?? [];
  const totalCount = data?.total ?? 0;

  const supplierQuery = useInventoryBySupplier();
  const warehouseQuery = useInventoryByWarehouse();
  const productQuery = useInventoryByProduct();

  // Stats (removed - KPI cards no longer displayed)

  // Mutual filtering with auto-selection
  const { productOptions, supplierOptions, warehouseOptions } = useFilterOptions({
    product_group_id: filters.product_group_id || undefined,
    supplier_id: filters.supplier_id || undefined,
    warehouse_id: filters.warehouse_id || undefined,
    tab: filters.tab,
    primary_staff_only: filters.primary_staff_only,
    mode: filters.candidate_mode,
    onAutoSelectSupplier: (id) => updateFilter("supplier_id", id),
    onAutoSelectProduct: (id) => updateFilter("product_group_id", id),
  });

  // Note: Auto-clearing of invalid filters is NOT needed here because:
  // 1. The filter-options API endpoint only returns valid combinations
  // 2. SearchableSelect prevents selecting invalid options
  // 3. Auto-selection in useFilterOptions handles single-option cases
  // So filters naturally stay valid without explicit clearing logic

  useEffect(() => {
    if (filters.candidate_mode === "stock" && filters.tab === "no_stock") {
      updateFilter("tab", "in_stock");
    }
  }, [filters.candidate_mode, filters.tab, updateFilter]);

  const filteredSupplierData = useMemo(() => {
    let data = supplierQuery.data || [];
    if (filters.supplier_id) {
      data = data.filter((row) => row.supplier_id === Number(filters.supplier_id));
    }
    if (filters.primary_staff_only) {
      data = data.filter((row) => row.is_primary_supplier);
    }
    return data;
  }, [supplierQuery.data, filters.supplier_id, filters.primary_staff_only]);

  const filteredWarehouseData = useMemo(() => {
    let data = warehouseQuery.data || [];
    if (filters.warehouse_id) {
      data = data.filter((row) => row.warehouse_id === Number(filters.warehouse_id));
    }
    return data;
  }, [warehouseQuery.data, filters.warehouse_id]);

  const filteredProductData = useMemo(() => {
    let data = productQuery.data || [];
    if (filters.product_group_id) {
      data = data.filter((row) => row.product_group_id === Number(filters.product_group_id));
    }
    return data;
  }, [productQuery.data, filters.product_group_id]);

  const showFilters = overviewMode !== "lots";
  const showTabFilters = overviewMode === "items";
  const showSupplierFilter = overviewMode === "items" || overviewMode === "supplier";
  const showWarehouseFilter = overviewMode === "items" || overviewMode === "warehouse";
  const showProductFilter = overviewMode === "items" || overviewMode === "product";
  const showPrimaryStaffOnly = overviewMode === "items" || overviewMode === "supplier";

  const handleFilterChange = <K extends keyof typeof filters>(
    key: K,
    value: (typeof filters)[K],
  ) => {
    updateFilter(key as keyof typeof filters, value);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      switch (overviewMode) {
        case "items":
          await refetchItems();
          break;
        case "supplier":
          await supplierQuery.refetch();
          break;
        case "warehouse":
          await warehouseQuery.refetch();
          break;
        case "product":
          await productQuery.refetch();
          break;
      }
      toast.success("データを更新しました");
    } catch {
      toast.error("データの更新に失敗しました");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="在庫管理"
        actions={
          <div className="flex gap-2">
            <ExportButton apiPath="lots/export/download" filePrefix="lots" size="sm" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(ROUTES.INVENTORY.EXCEL_PORTAL)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel View
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/inventory/history")}>
              <History className="mr-2 h-4 w-4" />
              入出庫履歴
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/inventory/withdrawals/new")}
            >
              <ArrowUpFromLine className="mr-2 h-4 w-4" />
              出庫登録
            </Button>
            <Button size="sm" onClick={() => navigate("/inventory/adhoc/new")}>
              <Package className="mr-2 h-4 w-4" />
              ロット新規登録
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* 担当仕入先未設定警告 */}
        <SupplierAssignmentWarning />

        {/* View Mode Switcher & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={overviewMode === "items" ? "default" : "outline"}
              size="sm"
              onClick={() => setOverviewMode("items")}
            >
              <List className="mr-2 h-4 w-4" />
              アイテム一覧
            </Button>
            <Button
              variant={overviewMode === "product" ? "default" : "outline"}
              size="sm"
              onClick={() => setOverviewMode("product")}
            >
              <Box className="mr-2 h-4 w-4" />
              製品別
            </Button>
            <Button
              variant={overviewMode === "supplier" ? "default" : "outline"}
              size="sm"
              onClick={() => setOverviewMode("supplier")}
            >
              <Truck className="mr-2 h-4 w-4" />
              仕入先別
            </Button>
            <Button
              variant={overviewMode === "warehouse" ? "default" : "outline"}
              size="sm"
              onClick={() => setOverviewMode("warehouse")}
            >
              <Home className="mr-2 h-4 w-4" />
              倉庫別
            </Button>
            <Button
              variant={overviewMode === "lots" ? "default" : "outline"}
              size="sm"
              onClick={() => setOverviewMode("lots")}
            >
              <Search className="mr-2 h-4 w-4" />
              ロット検索
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            データを更新
          </Button>
        </div>

        {/* Tab Filters (Items Only) */}
        {showTabFilters && (
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <button
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                filters.tab === "all"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => updateFilter("tab", "all")}
            >
              すべて
            </button>
            <button
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                filters.tab === "in_stock"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => updateFilter("tab", "in_stock")}
            >
              ✅ 在庫あり
            </button>
            <button
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                filters.tab === "no_stock"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              } ${filters.candidate_mode === "stock" ? "cursor-not-allowed opacity-50" : ""}`}
              disabled={filters.candidate_mode === "stock"}
              onClick={() => updateFilter("tab", "no_stock")}
              title={
                filters.candidate_mode === "stock"
                  ? "在庫あり基準では在庫なしタブは利用できません"
                  : undefined
              }
            >
              ⚠️ 在庫なし
            </button>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <Section>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-4 pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Label className="text-sm font-medium">候補の基準</Label>
                  <select
                    className="h-9 rounded-md border border-slate-300 bg-transparent px-3 text-sm"
                    value={filters.candidate_mode}
                    onChange={(event) =>
                      updateFilter("candidate_mode", event.target.value as "stock" | "master")
                    }
                  >
                    <option value="stock">在庫あり</option>
                    <option value="master">マスタ</option>
                  </select>
                  <span className="text-xs text-slate-500">
                    在庫一覧の候補は在庫あり基準です（必要ならマスタ検索に切替）
                  </span>
                </div>

                {showPrimaryStaffOnly && (
                  <SupplierFilterCheckbox enabled={filterEnabled} onToggle={toggleFilter} />
                )}
              </div>
              {filters.candidate_mode === "master" && (
                <p className="text-xs text-amber-600">
                  マスタ基準のため、在庫がない組み合わせでは一覧が空になる場合があります
                </p>
              )}

              {/* Filter Inputs Row */}
              <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 lg:grid-cols-4">
                {showSupplierFilter && (
                  <div>
                    <Label className="mb-2 block text-sm font-medium">仕入先</Label>
                    <SearchableSelect
                      options={supplierOptions}
                      value={filters.supplier_id}
                      onChange={(value) => handleFilterChange("supplier_id", value)}
                      placeholder="仕入先を検索..."
                    />
                  </div>
                )}
                {showWarehouseFilter && (
                  <div>
                    <Label className="mb-2 block text-sm font-medium">倉庫</Label>
                    <SearchableSelect
                      options={warehouseOptions}
                      value={filters.warehouse_id}
                      onChange={(value) => handleFilterChange("warehouse_id", value)}
                      placeholder="倉庫を検索..."
                    />
                  </div>
                )}
                {showProductFilter && (
                  <div>
                    <Label className="mb-2 block text-sm font-medium">製品</Label>
                    <SearchableSelect
                      options={productOptions}
                      value={filters.product_group_id}
                      onChange={(value) => handleFilterChange("product_group_id", value)}
                      placeholder="製品を検索..."
                    />
                  </div>
                )}
                <div>
                  <Button variant="outline" onClick={resetFilters} className="w-full">
                    フィルタをリセット
                  </Button>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Tables */}
        <div className="rounded-md border bg-white shadow-sm">
          {overviewMode === "items" && (
            <>
              <InventoryTable
                data={inventoryItems}
                isLoading={isItemsLoading}
                onRefresh={refetchItems}
                filterSupplierId={filters.supplier_id ? Number(filters.supplier_id) : undefined}
                headerContent={`ページ ${page} (全${totalCount}件中 ${
                  (page - 1) * pageSize + 1
                }-${Math.min(page * pageSize, totalCount)}件を表示)`}
              />
              {/* Pagination Controls */}
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>表示件数:</span>
                    <select
                      className="h-8 rounded-md border border-slate-300 bg-transparent px-2 text-sm"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      {[20, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    ページ {page} / {Math.ceil(totalCount / pageSize)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1 || isItemsLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">前へ</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={inventoryItems.length < pageSize || isItemsLoading}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">次へ</span>
                  </Button>
                </div>
              </div>
            </>
          )}
          {overviewMode === "supplier" && (
            <InventoryBySupplierTable
              data={filteredSupplierData}
              onViewDetail={(supplierId) => {
                setFilters({ ...filters, supplier_id: String(supplierId) });
                setOverviewMode("items");
              }}
            />
          )}
          {overviewMode === "warehouse" && (
            <InventoryByWarehouseTable
              data={filteredWarehouseData}
              onViewDetail={(warehouseId) => {
                setFilters({ ...filters, warehouse_id: String(warehouseId) });
                setOverviewMode("items");
              }}
            />
          )}
          {overviewMode === "product" && (
            <InventoryByProductTable
              data={filteredProductData}
              onViewDetail={(productId) => {
                setFilters({ ...filters, product_group_id: String(productId) });
                setOverviewMode("items");
              }}
            />
          )}
          {overviewMode === "lots" && <LotSearchPanel />}
        </div>
      </div>
    </PageContainer>
  );
}
