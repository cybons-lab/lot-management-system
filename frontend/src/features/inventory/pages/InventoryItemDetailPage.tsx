/**
 * InventoryItemDetailPage (v2.2 - Phase D-6 + Phase 3 + Phase 4)
 * Inventory item detail page (product × warehouse) with tabbed interface
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useInventoryItem } from "../hooks";

import * as styles from "./styles";

import { Button } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { useLotsQuery } from "@/hooks/api";
import { DataTable, type Column } from "@/shared/components/data/DataTable";
import { LotStatusIcon } from "@/shared/components/data/LotStatusIcon";
import { getLotStatuses } from "@/shared/utils/status";
import { fmt } from "@/shared/utils/number";
import { format } from "date-fns";
import type { LotUI } from "@/shared/libs/normalize";

// eslint-disable-next-line max-lines-per-function
export function InventoryItemDetailPage() {
  const { productId, warehouseId } = useParams<{ productId: string; warehouseId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("summary");

  const productIdNum = productId ? Number(productId) : 0;
  const warehouseIdNum = warehouseId ? Number(warehouseId) : 0;

  const { data: item, isLoading, isError } = useInventoryItem(productIdNum, warehouseIdNum);

  // 全ロット取得してフィルタリング
  const { data: allLots = [], isLoading: lotsLoading } = useLotsQuery({});
  const itemLots = allLots.filter(
    (lot) => lot.product_id === productIdNum && lot.warehouse_id === warehouseIdNum,
  );

  const handleBack = () => {
    navigate(ROUTES.INVENTORY.SUMMARY);
  };

  // ロットテーブルのカラム定義
  const lotColumns: Column<LotUI>[] = [
    {
      id: "lot_number",
      header: "ロット番号",
      cell: (lot) => <span className="font-medium">{lot.lot_number}</span>,
      sortable: true,
    },
    {
      id: "current_quantity",
      header: "現在在庫",
      cell: (lot) => {
        const qty = Number(lot.current_quantity);
        return <span className={qty > 0 ? "font-semibold" : "text-slate-400"}>{fmt(qty)}</span>;
      },
      sortable: true,
      align: "right",
    },
    {
      id: "unit",
      header: "単位",
      cell: (lot) => lot.unit,
      align: "left",
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
          <div className="flex items-center gap-1">
            {statuses.map((s) => (
              <LotStatusIcon key={s} status={s as "locked" | "available" | "depleted"} />
            ))}
          </div>
        );
      },
      sortable: true,
      align: "left",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center p-6">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className={styles.root}>
        <div className={styles.errorState.root}>
          <p className={styles.errorState.message}>在庫アイテムが見つかりませんでした</p>
        </div>
        <Button onClick={handleBack}>戻る</Button>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">在庫アイテム詳細</h2>
          <p className="mt-1 text-gray-600">
            製品ID: {item.product_id} / 倉庫ID: {item.warehouse_id}
          </p>
        </div>
        <Button variant="outline" onClick={handleBack}>
          一覧に戻る
        </Button>
      </div>

      {/* Basic Info Card */}
      <div className={styles.filterCard}>
        <h3 className="mb-4 text-lg font-semibold">基本情報</h3>
        <div className={styles.detailGrid.root}>
          <div>
            <div className={styles.detailGrid.label}>製品</div>
            <div className={styles.detailGrid.value}>
              {item.product_name || item.product_code || `ID: ${item.product_id}`}
            </div>
          </div>
          <div>
            <div className={styles.detailGrid.label}>倉庫</div>
            <div className={styles.detailGrid.value}>
              {item.warehouse_name || `ID: ${item.warehouse_id}`}
            </div>
          </div>
          <div>
            <div className={styles.detailGrid.label}>最終更新</div>
            <div className={styles.detailGrid.value}>
              {new Date(item.last_updated).toLocaleString("ja-JP")}
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">サマリ</TabsTrigger>
          <TabsTrigger value="lots">ロット一覧 ({itemLots.length})</TabsTrigger>
          <TabsTrigger value="inbound">入荷予定</TabsTrigger>
          <TabsTrigger value="forecast">需要予測</TabsTrigger>
        </TabsList>

        {/* Tab 1: サマリ */}
        <TabsContent value="summary" className="space-y-4">
          {/* Inventory Stats */}
          <div className={styles.statsGrid}>
            {/* Total Quantity */}
            <div className={styles.statsCard({ variant: "default" })}>
              <div className={styles.statsLabel}>総在庫数</div>
              <div className={styles.statsValue({ color: "default" })}>
                {fmt(item.total_quantity)}
              </div>
              <div className="mt-2 text-xs text-gray-500">すべての在庫数</div>
            </div>

            {/* Allocated Quantity */}
            <div className={styles.statsCard({ variant: "default" })}>
              <div className={styles.statsLabel}>引当済在庫数</div>
              <div className="mt-3 text-3xl font-bold text-yellow-600">
                {fmt(item.allocated_quantity)}
              </div>
              <div className="mt-2 text-xs text-gray-500">引当済の在庫数</div>
            </div>

            {/* Available Quantity */}
            <div className={styles.statsCard({ variant: "active" })}>
              <div className={styles.statsLabel}>利用可能在庫数</div>
              <div className={styles.statsValue({ color: "blue" })}>
                {fmt(item.available_quantity)}
              </div>
              <div className="mt-2 text-xs text-gray-500">引当可能な在庫数</div>
            </div>
          </div>

          {/* Calculation Info */}
          <div className="rounded-lg border bg-blue-50 p-4">
            <h4 className="text-sm font-semibold text-blue-800">在庫数の計算式</h4>
            <p className="mt-2 text-sm text-blue-700">
              利用可能在庫数 = 総在庫数 - 引当済在庫数
              <br />({fmt(item.available_quantity)} = {fmt(item.total_quantity)} -{" "}
              {fmt(item.allocated_quantity)})
            </p>
          </div>
        </TabsContent>

        {/* Tab 2: ロット一覧 */}
        <TabsContent value="lots" className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <DataTable
              data={itemLots}
              columns={lotColumns}
              isLoading={lotsLoading}
              emptyMessage="該当するロットがありません。"
            />
          </div>
        </TabsContent>

        {/* Tab 3: 入荷予定 */}
        <TabsContent value="inbound" className="space-y-4">
          <InboundPlansTab productId={productIdNum} warehouseId={warehouseIdNum} />
        </TabsContent>

        {/* Tab 4: 需要予測 */}
        <TabsContent value="forecast" className="space-y-4">
          <ForecastsTab productId={productIdNum} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===== Sub Components =====

interface InboundPlansTabProps {
  productId: number;
  warehouseId: number;
}

function InboundPlansTab({}: InboundPlansTabProps) {
  const { data: allPlans, isLoading } = useQuery({
    queryKey: ["inbound-plans"],
    queryFn: async () => {
      const { getInboundPlans } = await import("@/features/inbound-plans/api");
      return getInboundPlans({});
    },
  });

  // Filter plans that have lines for this product
  const relevantPlans =
    allPlans?.filter(() => {
      // Note: We would need to fetch plan details to filter by product_id
      // For now, show all plans (to be improved with backend filtering)
      return true;
    }) || [];

  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">入荷予定</h3>
        <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.INBOUND_PLANS.LIST)}>
          入荷予定一覧へ
        </Button>
      </div>

      {relevantPlans.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="p-3 text-left font-medium text-gray-600">予定番号</th>
                <th className="p-3 text-left font-medium text-gray-600">仕入先</th>
                <th className="p-3 text-left font-medium text-gray-600">入荷予定日</th>
                <th className="p-3 text-left font-medium text-gray-600">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {relevantPlans.slice(0, 10).map((plan) => (
                <tr key={plan.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3">{plan.plan_number}</td>
                  <td className="p-3">{plan.supplier_name || `ID:${plan.supplier_id}`}</td>
                  <td className="p-3">
                    {format(new Date(plan.planned_arrival_date), "yyyy/MM/dd")}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        plan.status === "received"
                          ? "bg-green-100 text-green-700"
                          : plan.status === "pending"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {plan.status === "received"
                        ? "入荷済"
                        : plan.status === "pending"
                          ? "予定"
                          : "キャンセル"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">入荷予定がありません</p>
        </div>
      )}

      {relevantPlans.length > 10 && (
        <p className="text-sm text-gray-500">
          {relevantPlans.length - 10}件の入荷予定が他にあります
        </p>
      )}
    </div>
  );
}

interface ForecastsTabProps {
  productId: number;
}

function ForecastsTab({ productId }: ForecastsTabProps) {
  const { data: forecastData, isLoading } = useQuery({
    queryKey: ["forecasts", productId],
    queryFn: async () => {
      const { getForecasts } = await import("@/features/forecasts/api");
      return getForecasts({ product_id: productId, limit: 100 });
    },
  });

  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  const totalQuantity =
    forecastData?.items.reduce((sum, group) => {
      return sum + group.forecasts.reduce((s, f) => s + f.forecast_quantity, 0);
    }, 0) || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">需要予測</h3>
        <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.FORECASTS.LIST)}>
          需要予測一覧へ
        </Button>
      </div>

      {forecastData && forecastData.items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-600">予測グループ数</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {forecastData.items.length}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-600">総予測数量</div>
              <div className="mt-2 text-2xl font-bold text-blue-600">{fmt(totalQuantity)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-600">予測エントリ数</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {forecastData.items.reduce((sum, g) => sum + g.forecasts.length, 0)}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="mb-3 font-semibold">予測グループ一覧</h4>
            <div className="space-y-2">
              {forecastData.items.slice(0, 5).map((group, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border-b border-gray-100 pb-2"
                >
                  <div className="text-sm">
                    <span className="font-medium">
                      {group.group_key.customer_name || `顧客${group.group_key.customer_id}`}
                    </span>
                    {" → "}
                    <span>
                      {group.group_key.delivery_place_name ||
                        `納入先${group.group_key.delivery_place_id}`}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-blue-600">
                    {fmt(group.forecasts.reduce((s, f) => s + f.forecast_quantity, 0))}
                  </div>
                </div>
              ))}
            </div>
            {forecastData.items.length > 5 && (
              <p className="mt-3 text-sm text-gray-500">
                他 {forecastData.items.length - 5} グループ
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">需要予測データがありません</p>
        </div>
      )}
    </div>
  );
}
