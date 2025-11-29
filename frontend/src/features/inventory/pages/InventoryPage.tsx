import { useSetAtom } from "jotai";
import { Box, Home, List, Truck } from "lucide-react";
import { useState } from "react";

import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { InventoryByProductTable } from "@/features/inventory/components/InventoryByProductTable";
import { InventoryBySupplierTable } from "@/features/inventory/components/InventoryBySupplierTable";
import { InventoryByWarehouseTable } from "@/features/inventory/components/InventoryByWarehouseTable";
import { InventoryTable } from "@/features/inventory/components/InventoryTable";
import { LotListPanel } from "@/features/inventory/components/LotListPanel";
import { StatCard } from "@/features/inventory/components/StatCard";
import { useInventoryStats } from "@/features/inventory/hooks/useInventoryStats";
import { lotFiltersAtom } from "@/features/inventory/state";
import * as styles from "@/features/inventory/pages/styles";
import {
    useInventoryByProduct,
    useInventoryBySupplier,
    useInventoryByWarehouse,
} from "@/hooks/api";
import { useInventoryItems } from "@/features/inventory/hooks";
import type { InventoryItem } from "@/features/inventory/api";
import { Section } from "@/shared/components/layout";
import { fmt } from "@/shared/utils/number";

type OverviewMode = "items" | "product" | "supplier" | "warehouse";

export function InventoryPage() {
    const setLotFilters = useSetAtom(lotFiltersAtom);

    // Tab State
    const [activeTab, setActiveTab] = useState("overview");

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

    // Drill-down Handlers
    const handleSupplierClick = (supplierCode: string) => {
        setLotFilters((prev) => ({ ...prev, search: supplierCode }));
        setActiveTab("lots");
    };

    const handleWarehouseClick = (warehouseCode: string) => {
        setLotFilters((prev) => ({ ...prev, warehouseCode: warehouseCode }));
        setActiveTab("lots");
    };

    const handleProductClick = (productCode: string) => {
        setLotFilters((prev) => ({ ...prev, productCode: productCode }));
        setActiveTab("lots");
    };

    const handleItemClick = (productCode: string, warehouseCode: string) => {
        setLotFilters((prev) => ({ ...prev, productCode, warehouseCode }));
        setActiveTab("lots");
    }

    const handleRefresh = () => {
        if (activeTab === "overview") {
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
        }
        // LotListPanel handles its own refresh via its internal button, 
        // but we could expose a ref if we wanted a global refresh button.
    };

    return (
        <div className="mx-auto max-w-[1600px] px-6 py-6">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">在庫管理</h1>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-[400px] grid-cols-2">
                    <TabsTrigger value="overview">在庫一覧 (集計)</TabsTrigger>
                    <TabsTrigger value="lots">ロット一覧 (詳細)</TabsTrigger>
                </TabsList>

                {/* ==================== OVERVIEW TAB ==================== */}
                <TabsContent value="overview" className="space-y-6">
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
                        <Tabs
                            value={overviewMode}
                            onValueChange={(v) => setOverviewMode(v as OverviewMode)}
                            className="w-[600px]"
                        >
                            <TabsList>
                                <TabsTrigger value="items">
                                    <List className="mr-2 h-4 w-4" />
                                    アイテム一覧
                                </TabsTrigger>
                                <TabsTrigger value="product">
                                    <Box className="mr-2 h-4 w-4" />
                                    製品別
                                </TabsTrigger>
                                <TabsTrigger value="supplier">
                                    <Truck className="mr-2 h-4 w-4" />
                                    仕入先別
                                </TabsTrigger>
                                <TabsTrigger value="warehouse">
                                    <Home className="mr-2 h-4 w-4" />
                                    倉庫別
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <Button variant="outline" size="sm" onClick={handleRefresh}>
                            データを更新
                        </Button>
                    </div>

                    {/* Filters (Items Only) */}
                    {overviewMode === "items" && (
                        <Section>
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <Label className="mb-2 block text-sm font-medium">製品ID</Label>
                                    <Input
                                        type="number"
                                        value={filters.product_id}
                                        onChange={(e) => setFilters({ ...filters, product_id: e.target.value })}
                                        placeholder="製品IDで絞り込み"
                                    />
                                </div>
                                <div>
                                    <Label className="mb-2 block text-sm font-medium">倉庫ID</Label>
                                    <Input
                                        type="number"
                                        value={filters.warehouse_id}
                                        onChange={(e) => setFilters({ ...filters, warehouse_id: e.target.value })}
                                        placeholder="倉庫IDで絞り込み"
                                    />
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
                                onRowClick={(item: InventoryItem) => handleItemClick(item.product_code || "", item.warehouse_code || "")}
                            />
                        )}
                        {overviewMode === "supplier" && (
                            <InventoryBySupplierTable
                                data={supplierQuery.data || []}
                                onRowClick={handleSupplierClick}
                            />
                        )}
                        {overviewMode === "warehouse" && (
                            <InventoryByWarehouseTable
                                data={warehouseQuery.data || []}
                                onRowClick={handleWarehouseClick}
                            />
                        )}
                        {overviewMode === "product" && (
                            <InventoryByProductTable
                                data={productQuery.data || []}
                                onRowClick={handleProductClick}
                            />
                        )}
                    </div>
                </TabsContent>

                {/* ==================== LOTS TAB ==================== */}
                <TabsContent value="lots">
                    <div className="rounded-md border bg-white p-6 shadow-sm">
                        <LotListPanel />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
