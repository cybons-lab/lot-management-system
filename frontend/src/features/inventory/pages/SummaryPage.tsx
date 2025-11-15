/**
 * SummaryPage.tsx (v2.2 - Phase D-6 Updated)
 *
 * 在庫サマリページ
 * - 在庫アイテムの統計情報を表示（製品×倉庫単位）
 * - 総在庫数、利用可能在庫数、引当済在庫数など
 */
/* eslint-disable max-lines-per-function */

import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInventoryItems } from "../hooks";
import { Section } from "@/shared/components/layout";
import { fmt } from "@/shared/utils/number";
import { ROUTES } from "@/constants/routes";

// ============================================
// メインコンポーネント
// ============================================

export function SummaryPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    product_id: "",
    warehouse_id: "",
  });

  // Build query params
  const queryParams = {
    product_id: filters.product_id ? Number(filters.product_id) : undefined,
    warehouse_id: filters.warehouse_id ? Number(filters.warehouse_id) : undefined,
  };

  // データ取得
  const { data: inventoryItems = [], isLoading, error, refetch } = useInventoryItems(queryParams);

  // 統計情報の計算
  const stats = useMemo(() => {
    const totalItems = inventoryItems.length;
    const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.total_quantity, 0);
    const totalAllocated = inventoryItems.reduce((sum, item) => sum + item.allocated_quantity, 0);
    const totalAvailable = inventoryItems.reduce((sum, item) => sum + item.available_quantity, 0);
    const uniqueProducts = new Set(inventoryItems.map((item) => item.product_id)).size;
    const uniqueWarehouses = new Set(inventoryItems.map((item) => item.warehouse_id)).size;

    return {
      totalItems,
      totalQuantity,
      totalAllocated,
      totalAvailable,
      uniqueProducts,
      uniqueWarehouses,
    };
  }, [inventoryItems]);

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
    );
  }

  const handleViewDetail = (productId: number, warehouseId: number) => {
    navigate(ROUTES.INVENTORY.ITEMS.DETAIL(productId, warehouseId));
  };

  return (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      {/* Filters */}
      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
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

      {/* Inventory Items Table */}
      {inventoryItems.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">{inventoryItems.length} 件の在庫アイテム</div>

          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">製品</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">倉庫</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    総在庫数
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">引当済</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    利用可能
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    最終更新
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inventoryItems.map((item) => (
                  <tr key={item.inventory_item_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {item.product_name || item.product_code || `ID: ${item.product_id}`}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.warehouse_name || `ID: ${item.warehouse_id}`}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      {fmt(item.total_quantity)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-yellow-600">
                      {fmt(item.allocated_quantity)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                      {fmt(item.available_quantity)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(item.last_updated).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetail(item.product_id, item.warehouse_id)}
                      >
                        詳細
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 更新ボタン */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          データを更新
        </Button>
      </div>
    </div>
  );
}

// ============================================
// サブコンポーネント
// ============================================

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  highlight?: boolean;
}

function StatCard({ title, value, description, highlight }: StatCardProps) {
  return (
    <div
      className={`group rounded-xl border bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
        highlight
          ? "border-t border-r border-b border-l-4 border-gray-200 border-l-blue-500"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="text-sm font-medium text-gray-600">{title}</div>
      <div className={`mt-3 text-3xl font-bold ${highlight ? "text-blue-600" : "text-gray-900"}`}>
        {value}
      </div>
      {description && <div className="mt-2 text-xs text-gray-500">{description}</div>}
    </div>
  );
}
