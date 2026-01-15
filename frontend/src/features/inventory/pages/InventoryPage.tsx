import { ArrowUpFromLine, Box, History, Home, List, Package, RefreshCw, Truck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button, Checkbox } from "@/components/ui";
import { Label } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import { InventoryByProductTable } from "@/features/inventory/components/InventoryByProductTable";
import { InventoryBySupplierTable } from "@/features/inventory/components/InventoryBySupplierTable";
import { InventoryByWarehouseTable } from "@/features/inventory/components/InventoryByWarehouseTable";
import { InventoryTable } from "@/features/inventory/components/InventoryTable";
import { LotCreateForm } from "@/features/inventory/components/LotCreateForm";
import { useInventoryItems } from "@/features/inventory/hooks";
import { useFilterOptions } from "@/features/inventory/hooks/useFilterOptions";
import { useInventoryPageState } from "@/features/inventory/hooks/useInventoryPageState";
import {
  useInventoryByProduct,
  useInventoryBySupplier,
  useInventoryByWarehouse,
} from "@/hooks/api";
import { useCreateLot } from "@/hooks/mutations";
import { useDialog } from "@/hooks/ui";
import { ExportButton } from "@/shared/components/ExportButton";
import { FormDialog } from "@/shared/components/form";
import { Section } from "@/shared/components/layout";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export function InventoryPage() {
  const navigate = useNavigate();
  // Lot creation dialog
  const createDialog = useDialog();
  // Refresh loading state
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Data Fetching
  const {
    data: inventoryItems = [],
    isLoading: isItemsLoading,
    refetch: refetchItems,
  } = useInventoryItems(queryParams);

  const supplierQuery = useInventoryBySupplier();
  const warehouseQuery = useInventoryByWarehouse();
  const productQuery = useInventoryByProduct();

  // Stats (removed - KPI cards no longer displayed)

  // Mutual filtering with auto-selection
  const { productOptions, supplierOptions, warehouseOptions } = useFilterOptions({
    product_id: filters.product_id || undefined,
    supplier_id: filters.supplier_id || undefined,
    warehouse_id: filters.warehouse_id || undefined,
    onAutoSelectSupplier: (id) => updateFilter("supplier_id", id),
    onAutoSelectProduct: (id) => updateFilter("product_id", id),
  });

  // Lot creation mutation
  const createLotMutation = useCreateLot({
    onSuccess: () => {
      toast.success("ロットを作成しました");
      createDialog.close();
      refetchItems();
    },
    onError: (error) => toast.error(`作成に失敗しました: ${error.message} `),
  });

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
              size="icon"
              variant="outline"
              onClick={() => navigate("/inventory/withdrawals")}
              title="出庫履歴"
            >
              <History className="h-4 w-4" />
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
          </div>

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            データを更新
          </Button>
        </div>

        {/* Tab Filters (Items Only) */}
        {overviewMode === "items" && (
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
              }`}
              onClick={() => updateFilter("tab", "no_stock")}
            >
              ⚠️ 在庫なし
            </button>
          </div>
        )}

        {/* Filters (Items Only) */}
        {overviewMode === "items" && (
          <Section>
            <div className="flex flex-col gap-4">
              {/* Filter Actions Row (Primary Staff Filter) */}
              <div className="flex justify-end pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="primary_staff_only"
                    checked={filters.primary_staff_only}
                    onCheckedChange={(checked) => updateFilter("primary_staff_only", !!checked)}
                  />
                  <Label
                    htmlFor="primary_staff_only"
                    className="cursor-pointer text-sm font-medium"
                  >
                    主担当の仕入先のみ
                  </Label>
                </div>
              </div>

              {/* Filter Inputs Row */}
              <div className="grid grid-cols-4 items-end gap-4">
                <div>
                  <Label className="mb-2 block text-sm font-medium">仕入先</Label>
                  <SearchableSelect
                    options={supplierOptions}
                    value={filters.supplier_id}
                    onChange={(value) => updateFilter("supplier_id", value)}
                    placeholder="仕入先を検索..."
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-medium">倉庫</Label>
                  <SearchableSelect
                    options={warehouseOptions}
                    value={filters.warehouse_id}
                    onChange={(value) => updateFilter("warehouse_id", value)}
                    placeholder="倉庫を検索..."
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-medium">製品</Label>
                  <SearchableSelect
                    options={productOptions}
                    value={filters.product_id}
                    onChange={(value) => updateFilter("product_id", value)}
                    placeholder="製品を検索..."
                  />
                </div>
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
            <InventoryTable
              data={inventoryItems}
              isLoading={isItemsLoading}
              onRefresh={refetchItems}
            />
          )}
          {overviewMode === "supplier" && (
            <InventoryBySupplierTable
              data={supplierQuery.data || []}
              onViewDetail={(supplierId) => {
                setFilters({ ...filters, supplier_id: String(supplierId) });
                setOverviewMode("items");
              }}
            />
          )}
          {overviewMode === "warehouse" && (
            <InventoryByWarehouseTable
              data={warehouseQuery.data || []}
              onViewDetail={(warehouseId) => {
                setFilters({ ...filters, warehouse_id: String(warehouseId) });
                setOverviewMode("items");
              }}
            />
          )}
          {overviewMode === "product" && (
            <InventoryByProductTable
              data={productQuery.data || []}
              onViewDetail={(productId) => {
                setFilters({ ...filters, product_id: String(productId) });
                setOverviewMode("items");
              }}
            />
          )}
        </div>
      </div>

      {/* Lot Creation Dialog */}
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
    </PageContainer>
  );
}
