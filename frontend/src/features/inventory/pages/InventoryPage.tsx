import { ArrowUpFromLine, Box, History, Home, List, Package, Plus, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { Label } from "@/components/ui";
import { SearchableSelect } from "@/components/ui/form/SearchableSelect";
import { InventoryByProductTable } from "@/features/inventory/components/InventoryByProductTable";
import { InventoryBySupplierTable } from "@/features/inventory/components/InventoryBySupplierTable";
import { InventoryByWarehouseTable } from "@/features/inventory/components/InventoryByWarehouseTable";
import { InventoryTable } from "@/features/inventory/components/InventoryTable";
import { LotCreateForm } from "@/features/inventory/components/LotCreateForm";
import { StatCard } from "@/features/inventory/components/StatCard";
import { useInventoryItems } from "@/features/inventory/hooks";
import { useInventoryStats } from "@/features/inventory/hooks/useInventoryStats";
import * as styles from "@/features/inventory/pages/styles";
import {
  useInventoryByProduct,
  useInventoryBySupplier,
  useInventoryByWarehouse,
} from "@/hooks/api";
import { useProductsQuery, useWarehousesQuery } from "@/hooks/api/useMastersQuery";
import { useCreateLot } from "@/hooks/mutations";
import { useDialog } from "@/hooks/ui";
import { FormDialog } from "@/shared/components/form";
import { Section } from "@/shared/components/layout";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { fmt } from "@/shared/utils/number";

type OverviewMode = "items" | "product" | "supplier" | "warehouse";

export function InventoryPage() {
  const navigate = useNavigate();
  // Lot creation dialog
  const createDialog = useDialog();

  // Overview View Mode
  const [overviewMode, setOverviewMode] = useState<OverviewMode>("items");

  // Filters for Items View
  const [filters, setFilters] = useState({
    product_id: "",
    warehouse_id: "",
  });

  // Build query params for items
  const queryParams = {
    product_id: filters.product_id ? Number(filters.product_id) : undefined,
    warehouse_id: filters.warehouse_id ? Number(filters.warehouse_id) : undefined,
  };

  // Data Fetching
  const {
    data: inventoryItems = [],
    isLoading: isItemsLoading,
    refetch: refetchItems,
  } = useInventoryItems(queryParams);

  const supplierQuery = useInventoryBySupplier();
  const warehouseQuery = useInventoryByWarehouse();
  const productQuery = useInventoryByProduct();

  // Stats
  const stats = useInventoryStats(inventoryItems);

  // Master data for filter options
  const { data: products = [] } = useProductsQuery();
  const { data: warehouses = [] } = useWarehousesQuery();

  // Generate filter options
  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: String(p.id),
        label: `${p.product_code} - ${p.product_name}`,
      })),
    [products],
  );

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((w) => ({
        value: String(w.id),
        label: `${w.warehouse_code} - ${w.warehouse_name}`,
      })),
    [warehouses],
  );

  // Lot creation mutation
  const createLotMutation = useCreateLot({
    onSuccess: () => {
      toast.success("ロットを作成しました");
      createDialog.close();
      refetchItems();
    },
    onError: (error) => toast.error(`作成に失敗しました: ${error.message}`),
  });

  const handleRefresh = () => {
    switch (overviewMode) {
      case "items":
        refetchItems();
        break;
      case "supplier":
        supplierQuery.refetch();
        break;
      case "warehouse":
        warehouseQuery.refetch();
        break;
      case "product":
        productQuery.refetch();
        break;
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="在庫管理"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/inventory/withdrawals")}>
              <History className="mr-2 h-4 w-4" />
              出庫履歴
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/inventory/withdrawals/new")}
            >
              <ArrowUpFromLine className="mr-2 h-4 w-4" />
              出庫登録
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/inventory/adhoc/new")}>
              <Package className="mr-2 h-4 w-4" />
              アドホックロット作成
            </Button>
            <Button size="sm" onClick={createDialog.open}>
              <Plus className="mr-2 h-4 w-4" />
              ロット新規登録
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <StatCard
            title="在庫アイテム数"
            value={fmt(stats.totalItems)}
            description="製品×倉庫の組み合わせ数"
          />
          <StatCard
            title="総在庫数"
            value={fmt(stats.totalQuantity)}
            description="すべての在庫の合計数量"
            highlight
          />
          <StatCard
            title="利用可能在庫数"
            value={fmt(stats.totalAvailable)}
            description="引当可能な在庫数"
            highlight
          />
          <StatCard
            title="引当済在庫数"
            value={fmt(stats.totalAllocated)}
            description="既に引当済の在庫数"
          />
          <StatCard
            title="製品種類数"
            value={fmt(stats.uniqueProducts)}
            description="在庫がある製品の種類"
          />
          <StatCard
            title="倉庫数"
            value={fmt(stats.uniqueWarehouses)}
            description="在庫がある倉庫の数"
          />
        </div>

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

          <Button variant="outline" size="sm" onClick={handleRefresh}>
            データを更新
          </Button>
        </div>

        {/* Filters (Items Only) */}
        {overviewMode === "items" && (
          <Section>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="mb-2 block text-sm font-medium">製品</Label>
                <SearchableSelect
                  options={productOptions}
                  value={filters.product_id}
                  onChange={(value) => setFilters({ ...filters, product_id: value })}
                  placeholder="製品を検索..."
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium">倉庫</Label>
                <SearchableSelect
                  options={warehouseOptions}
                  value={filters.warehouse_id}
                  onChange={(value) => setFilters({ ...filters, warehouse_id: value })}
                  placeholder="倉庫を検索..."
                />
              </div>
            </div>
          </Section>
        )}

        {/* Tables */}
        <div className="rounded-md border bg-white shadow-sm">
          {overviewMode === "items" && (
            <InventoryTable data={inventoryItems} isLoading={isItemsLoading} />
          )}
          {overviewMode === "supplier" && (
            <InventoryBySupplierTable data={supplierQuery.data || []} />
          )}
          {overviewMode === "warehouse" && (
            <InventoryByWarehouseTable data={warehouseQuery.data || []} />
          )}
          {overviewMode === "product" && <InventoryByProductTable data={productQuery.data || []} />}
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
