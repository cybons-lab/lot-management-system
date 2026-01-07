/**
 * InventoryItemDetailPage (v2.2 - Phase D-6 + Phase 3 + Phase 4)
 * Inventory item detail page (product × warehouse) with tabbed interface
 */

import { format } from "date-fns";
import { ArrowUpFromLine } from "lucide-react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useInventoryItem } from "../hooks";

import * as styles from "./styles";

import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { ForecastsTab } from "@/features/inventory/components/ForecastsTab";
import { InboundPlansTab } from "@/features/inventory/components/InboundPlansTab";
import { QuickWithdrawalDialog } from "@/features/withdrawals/components";
import { useLotsQuery } from "@/hooks/api";
import { DataTable, type Column } from "@/shared/components/data/DataTable";
import { LotStatusIcon } from "@/shared/components/data/LotStatusIcon";
import type { LotUI } from "@/shared/libs/normalize";
import { fmt } from "@/shared/utils/number";
import { getLotStatuses } from "@/shared/utils/status";

// eslint-disable-next-line max-lines-per-function
export function InventoryItemDetailPage() {
  const { productId, warehouseId } = useParams<{ productId: string; warehouseId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("summary");

  // 簡易出庫ダイアログ用の状態
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [selectedLotForWithdrawal, setSelectedLotForWithdrawal] = useState<LotUI | null>(null);

  const productIdNum = productId ? Number(productId) : 0;
  const warehouseIdNum = warehouseId ? Number(warehouseId) : 0;

  const { data: item, isLoading, isError } = useInventoryItem(productIdNum, warehouseIdNum);

  // 全ロット取得してフィルタリング
  const { data: allLots = [], isLoading: lotsLoading, refetch: refetchLots } = useLotsQuery({});
  const itemLots = allLots.filter(
    (lot) => lot.product_id === productIdNum && lot.warehouse_id === warehouseIdNum,
  );

  const handleBack = () => {
    navigate(ROUTES.INVENTORY.SUMMARY);
  };

  // 出庫ダイアログを開く
  const handleOpenWithdrawal = (lot: LotUI) => {
    setSelectedLotForWithdrawal(lot);
    setWithdrawalDialogOpen(true);
  };

  // 出庫成功時のハンドラ
  const handleWithdrawalSuccess = () => {
    refetchLots();
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
    {
      id: "actions",
      header: "操作",
      cell: (lot) => {
        const availableQty =
          Number(lot.current_quantity) -
          Number(lot.allocated_quantity) -
          Number(lot.locked_quantity || 0);
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenWithdrawal(lot)}
            disabled={availableQty <= 0}
            className="h-7 px-2 text-xs"
          >
            <ArrowUpFromLine className="mr-1 h-3 w-3" />
            出庫
          </Button>
        );
      },
      align: "center",
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

      {/* 簡易出庫ダイアログ */}
      {selectedLotForWithdrawal && (
        <QuickWithdrawalDialog
          lot={selectedLotForWithdrawal}
          open={withdrawalDialogOpen}
          onOpenChange={setWithdrawalDialogOpen}
          onSuccess={handleWithdrawalSuccess}
        />
      )}
    </div>
  );
}

// Sub Components removed (extracted to separate files)
