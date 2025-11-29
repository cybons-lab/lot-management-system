/**
 * SummaryPage.tsx (v2.2 - Phase D-6 Updated + Phase 3)
 *
 * 在庫サマリページ
 * - 在庫アイテムの統計情報を表示（製品×倉庫単位）
 * - 総在庫数、利用可能在庫数、引当済在庫数など
 * - 行展開でロット明細を表示
 */
/* eslint-disable max-lines-per-function */

import { format } from "date-fns";
import { ChevronDown, ChevronRight, RefreshCw, Box, Truck, Home, List } from "lucide-react";
import { Fragment, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useInventoryItems } from "../hooks";

import * as styles from "./styles";

import { Button, Tabs, TabsList, TabsTrigger } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { InventoryByProductTable } from "@/features/inventory/components/InventoryByProductTable";
import { InventoryBySupplierTable } from "@/features/inventory/components/InventoryBySupplierTable";
import { InventoryByWarehouseTable } from "@/features/inventory/components/InventoryByWarehouseTable";
import { StatCard } from "@/features/inventory/components/StatCard";
import { useInventoryStats } from "@/features/inventory/hooks/useInventoryStats";
import {
  useInventoryByProduct,
  useInventoryBySupplier,
  useInventoryByWarehouse,
  useLotsQuery,
} from "@/hooks/api";
import { LotStatusIcon } from "@/shared/components/data/LotStatusIcon";
import { Section } from "@/shared/components/layout";
import { fmt } from "@/shared/utils/number";
import { getLotStatuses } from "@/shared/utils/status";

// ============================================
// メインコンポーネント
// ============================================

type ViewMode = "items" | "product" | "supplier" | "warehouse";

export function SummaryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>("items");

  const [filters, setFilters] = useState({
    product_id: searchParams.get("product_id") || "",
    warehouse_id: searchParams.get("warehouse_id") || "",
  });

  // 展開状態管理（製品ID-倉庫IDのキー）
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Build query params
  const queryParams = {
    product_id: filters.product_id ? Number(filters.product_id) : undefined,
    warehouse_id: filters.warehouse_id ? Number(filters.warehouse_id) : undefined,
  };

  // データ取得 (Items - Default)
  const {
    data: inventoryItems = [],
    isLoading: isItemsLoading,
    error: itemsError,
    refetch: refetchItems,
  } = useInventoryItems(queryParams);

  // データ取得 (Aggregation)
  const supplierQuery = useInventoryBySupplier();
  const warehouseQuery = useInventoryByWarehouse();
  const productQuery = useInventoryByProduct();

  // 全ロット取得（展開行のフィルタリング用）
  const { data: allLots = [] } = useLotsQuery({});

  // 統計情報の計算
  const stats = useInventoryStats(inventoryItems);

  const toggleRow = (productId: number, warehouseId: number) => {
    const key = `${productId}-${warehouseId}`;
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const isRowExpanded = (productId: number, warehouseId: number) => {
    return expandedRows.has(`${productId}-${warehouseId}`);
  };

  const getLotsForItem = (productId: number, warehouseId: number) => {
    return allLots.filter(
      (lot) => lot.product_id === productId && lot.warehouse_id === warehouseId,
    );
  };

  // Drill-down handlers
  const handleSupplierClick = (supplierCode: string) => {
    // Navigate to Lots page with filter
    // TODO: Implement filter passing via Jotai or URL
    navigate(`${ROUTES.INVENTORY.LOTS}?search=${supplierCode}`);
  };

  const handleWarehouseClick = (warehouseCode: string) => {
    navigate(`${ROUTES.INVENTORY.LOTS}?search=${warehouseCode}`);
  };

  const handleProductClick = (productCode: string) => {
    navigate(`${ROUTES.INVENTORY.LOTS}?search=${productCode}`);
  };

  const handleRefresh = () => {
    switch (viewMode) {
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

  const isLoading =
    viewMode === "items"
      ? isItemsLoading
      : viewMode === "supplier"
        ? supplierQuery.isLoading
        : viewMode === "warehouse"
          ? warehouseQuery.isLoading
          : productQuery.isLoading;

  const error =
    viewMode === "items"
      ? itemsError
      : viewMode === "supplier"
        ? supplierQuery.error
        : viewMode === "warehouse"
          ? warehouseQuery.error
          : productQuery.error;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Section>
        <div className={styles.errorState.root}>
          <p className={styles.errorState.title}>データの取得に失敗しました</p>
          <p className={styles.errorState.message}>
            {error instanceof Error ? error.message : "サーバーエラーが発生しました"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className={styles.errorState.retryButton}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            再試行
          </Button>
        </div>
      </Section>
    );
  }

  const handleViewDetail = (productId: number, warehouseId: number) => {
    navigate(ROUTES.INVENTORY.ITEMS.DETAIL(productId, warehouseId));
  };

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <div className={styles.root}>
        {/* 統計カード */}
        <div className={styles.statsGrid}>
          {/* 在庫アイテム数 */}
          <StatCard
            title="在庫アイテム数"
            value={fmt(stats.totalItems)}
            description="製品×倉庫の組み合わせ数"
          />

          {/* 総在庫数 */}
          <StatCard
            title="総在庫数"
            value={fmt(stats.totalQuantity)}
            description="すべての在庫の合計数量"
            highlight
          />

          {/* 利用可能在庫数 */}
          <StatCard
            title="利用可能在庫数"
            value={fmt(stats.totalAvailable)}
            description="引当可能な在庫数"
            highlight
          />

          {/* 引当済在庫数 */}
          <StatCard
            title="引当済在庫数"
            value={fmt(stats.totalAllocated)}
            description="既に引当済の在庫数"
          />

          {/* 製品種類数 */}
          <StatCard
            title="製品種類数"
            value={fmt(stats.uniqueProducts)}
            description="在庫がある製品の種類"
          />

          {/* 倉庫数 */}
          <StatCard
            title="倉庫数"
            value={fmt(stats.uniqueWarehouses)}
            description="在庫がある倉庫の数"
          />
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center justify-between">
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
            className="w-[500px]"
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

          {/* 更新ボタン */}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            データを更新
          </Button>
        </div>

        {/* Filters (Only for Items view) */}
        {viewMode === "items" && (
          <div className={styles.filterCard}>
            <div className={styles.detailGrid.root}>
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
          </div>
        )}

        {/* Inventory Items Table (Default View) */}
        {viewMode === "items" && inventoryItems.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">{inventoryItems.length} 件の在庫アイテム</div>

            <div className={styles.table.container}>
              <table className={styles.table.root}>
                <thead className={styles.table.thead}>
                  <tr>
                    <th className={styles.table.th} style={{ width: "40px" }}></th>
                    <th className={styles.table.th}>製品</th>
                    <th className={styles.table.th}>倉庫</th>
                    <th className={styles.table.thRight}>総在庫数</th>
                    <th className={styles.table.thRight}>引当済</th>
                    <th className={styles.table.thRight}>利用可能</th>
                    <th className={styles.table.th}>最終更新</th>
                    <th className={styles.table.thRight}>アクション</th>
                  </tr>
                </thead>
                <tbody className={styles.table.tbody}>
                  {inventoryItems.map((item) => {
                    const expanded = isRowExpanded(item.product_id, item.warehouse_id);
                    const lots = expanded ? getLotsForItem(item.product_id, item.warehouse_id) : [];

                    return (
                      <Fragment key={`${item.product_id}-${item.warehouse_id}`}>
                        <tr className={styles.table.tr}>
                          <td className={styles.table.td}>
                            <button
                              onClick={() => toggleRow(item.product_id, item.warehouse_id)}
                              className="rounded p-1 hover:bg-gray-100"
                            >
                              {expanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-600" />
                              )}
                            </button>
                          </td>
                          <td className={styles.table.td}>
                            {item.product_name || item.product_code || `ID: ${item.product_id}`}
                          </td>
                          <td className={styles.table.td}>
                            {item.warehouse_name ||
                              item.warehouse_code ||
                              `ID: ${item.warehouse_id}`}
                          </td>
                          <td className={styles.table.tdRight}>{fmt(item.total_quantity)}</td>
                          <td className={styles.table.tdRightYellow}>
                            {fmt(item.allocated_quantity)}
                          </td>
                          <td className={styles.table.tdRightGreen}>
                            {fmt(item.available_quantity)}
                          </td>
                          <td className={styles.table.tdGray}>
                            {new Date(item.last_updated).toLocaleString("ja-JP")}
                          </td>
                          <td className={styles.table.tdRight}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetail(item.product_id, item.warehouse_id)}
                            >
                              詳細
                            </Button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td colSpan={8} className="bg-gray-50 p-0">
                              <div className="px-12 py-4">
                                <h4 className="mb-3 text-sm font-semibold text-gray-700">
                                  ロット一覧 ({lots.length}件)
                                </h4>
                                {lots.length > 0 ? (
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-gray-200">
                                        <th className="pb-2 text-left font-medium text-gray-600">
                                          ロット番号
                                        </th>
                                        <th className="pb-2 text-right font-medium text-gray-600">
                                          現在在庫
                                        </th>
                                        <th className="pb-2 text-left font-medium text-gray-600">
                                          単位
                                        </th>
                                        <th className="pb-2 text-left font-medium text-gray-600">
                                          入荷日
                                        </th>
                                        <th className="pb-2 text-left font-medium text-gray-600">
                                          有効期限
                                        </th>
                                        <th className="pb-2 text-left font-medium text-gray-600">
                                          ステータス
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lots.map((lot) => {
                                        const statuses = getLotStatuses(lot);
                                        return (
                                          <tr
                                            key={lot.id}
                                            className="border-b border-gray-100 hover:bg-gray-100"
                                          >
                                            <td className="py-2 font-medium text-gray-900">
                                              {lot.lot_number}
                                            </td>
                                            <td className="py-2 text-right font-semibold">
                                              {fmt(Number(lot.current_quantity))}
                                            </td>
                                            <td className="py-2 text-gray-600">{lot.unit}</td>
                                            <td className="py-2 text-gray-600">
                                              {lot.received_date
                                                ? format(new Date(lot.received_date), "yyyy/MM/dd")
                                                : "-"}
                                            </td>
                                            <td className="py-2 text-gray-600">
                                              {lot.expiry_date
                                                ? format(new Date(lot.expiry_date), "yyyy/MM/dd")
                                                : "-"}
                                            </td>
                                            <td className="py-2">
                                              <div className="flex items-center gap-1">
                                                {statuses.map((s) => (
                                                  <LotStatusIcon
                                                    key={s}
                                                    status={
                                                      s as "locked" | "available" | "depleted"
                                                    }
                                                  />
                                                ))}
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p className="text-sm text-gray-500">ロットがありません</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Aggregation Views */}
        {viewMode === "supplier" && (
          <InventoryBySupplierTable
            data={supplierQuery.data || []}
            onRowClick={handleSupplierClick}
          />
        )}
        {viewMode === "warehouse" && (
          <InventoryByWarehouseTable
            data={warehouseQuery.data || []}
            onRowClick={handleWarehouseClick}
          />
        )}
        {viewMode === "product" && (
          <InventoryByProductTable data={productQuery.data || []} onRowClick={handleProductClick} />
        )}
      </div>
    </div>
  );
}
