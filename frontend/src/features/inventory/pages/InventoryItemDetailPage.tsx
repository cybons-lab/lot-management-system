/* eslint-disable max-lines */
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { InventoryLotActions } from "../components/InventoryLotActions";
import { LotArchiveDialog } from "../components/LotArchiveDialog";
import { LotEditForm, type LotUpdateData } from "../components/LotEditForm";
import { LotLockDialog } from "../components/LotLockDialog";
import { useInventoryItem, inventoryItemKeys } from "../hooks";
import { useLotActions } from "../hooks/useLotActions";

import * as styles from "./styles";

import { Button, Checkbox, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { IntakeHistoryList } from "@/features/intake-history/components/IntakeHistoryList";
import { ForecastsTab } from "@/features/inventory/components/ForecastsTab";
import { InboundPlansTab } from "@/features/inventory/components/InboundPlansTab";
import { ReplenishmentTab } from "@/features/inventory/components/ReplenishmentTab";
import {
  QuickWithdrawalDialog,
  WithdrawalHistoryDialog,
  WithdrawalHistoryList,
} from "@/features/withdrawals/components";
import { useLotsQuery } from "@/hooks/api";
import { DataTable, type Column } from "@/shared/components/data/DataTable";
import { LotStatusIcon } from "@/shared/components/data/LotStatusIcon";
import { FormDialog } from "@/shared/components/form";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import type { LotUI } from "@/shared/libs/normalize";
import { calculateAvailable } from "@/shared/utils/decimal";
import { fmt } from "@/shared/utils/number";
import { getLotStatuses } from "@/shared/utils/status";

// eslint-disable-next-line max-lines-per-function, complexity
export function InventoryItemDetailPage() {
  const { productId, warehouseId } = useParams<{ productId: string; warehouseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("summary");
  const [showArchived, setShowArchived] = useState(false);

  // 簡易出庫ダイアログ用の状態
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [selectedLotForWithdrawal, setSelectedLotForWithdrawal] = useState<LotUI | null>(null);

  // 履歴ダイアログ用の状態
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedLotForHistory, setSelectedLotForHistory] = useState<LotUI | null>(null);

  // アーカイブ確認ダイアログ用の状態
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedLotForArchive, setSelectedLotForArchive] = useState<LotUI | null>(null);

  const productIdNum = productId ? Number(productId) : 0;
  const warehouseIdNum = warehouseId ? Number(warehouseId) : 0;

  const { data: item, isLoading, isError } = useInventoryItem(productIdNum, warehouseIdNum);

  // 全ロット取得してフィルタリング
  const { data: allLots = [], isLoading: lotsLoading, refetch: refetchLots } = useLotsQuery({});

  // フィルタリングロジック
  const itemLots = allLots.filter(
    (lot) =>
      lot.product_id === productIdNum &&
      lot.warehouse_id === warehouseIdNum &&
      (showArchived || lot.status !== "archived"),
  );

  const handleBack = () => {
    navigate(ROUTES.INVENTORY.SUMMARY);
  };

  const handleOpenWithdrawal = (lot: LotUI) => {
    setSelectedLotForWithdrawal({
      ...lot,
      warehouse_name: lot.warehouse_name || item?.warehouse_name || item?.warehouse_code,
    });
    setWithdrawalDialogOpen(true);
  };

  // 履歴ダイアログを開く
  const handleOpenHistory = (lot: LotUI) => {
    setSelectedLotForHistory({
      ...lot,
      warehouse_name: lot.warehouse_name || item?.warehouse_name || item?.warehouse_code,
    });
    setHistoryDialogOpen(true);
  };

  // アーカイブ確認ダイアログを開く
  const handleOpenArchive = (lot: LotUI) => {
    setSelectedLotForArchive(lot);
    setArchiveDialogOpen(true);
  };

  const handleWithdrawalSuccess = () => {
    refetchLots();
    queryClient.invalidateQueries({
      queryKey: inventoryItemKeys.detail(productIdNum, warehouseIdNum),
    });
    queryClient.invalidateQueries({
      queryKey: ["withdrawals", "list", { productId: productIdNum, warehouseId: warehouseIdNum }],
    });
  };

  // 統一されたロット操作フックを使用
  const {
    selectedLot,
    editDialog,
    lockDialog,
    updateLotMutation,
    lockLotMutation,
    handleEditLot,
    handleLockLot,
    handleUnlockLot,
    handleCloseEdit,
    handleCloseLock,
    archiveLot,
  } = useLotActions({
    onLotsChanged: () => {
      refetchLots();
      queryClient.invalidateQueries({
        queryKey: inventoryItemKeys.detail(productIdNum, warehouseIdNum),
      });
    },
  });

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
          <div className="flex items-center gap-1 overflow-visible">
            {statuses.map((s) => (
              <LotStatusIcon key={s} status={s} />
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
      cell: (lot) => (
        <InventoryLotActions
          lot={lot}
          onWithdraw={handleOpenWithdrawal}
          onEdit={handleEditLot}
          onLock={handleLockLot}
          onUnlock={handleUnlockLot}
          onHistory={handleOpenHistory}
          onArchive={handleOpenArchive}
        />
      ),
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
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
          <span className="text-lg">←</span>
          在庫管理
        </Button>
        <PageHeader
          title="在庫詳細"
          subtitle={`${item.product_name || "名称未設定"} (${item.product_code || "-"}) / ${item.warehouse_name || "名称未設定"} (${item.warehouse_code || "-"})`}
        />
      </div>

      {/* Basic Info Card */}
      <div className={styles.filterCard}>
        <h3 className="mb-4 text-lg font-semibold">基本情報</h3>
        <div className={styles.detailGrid.root}>
          <div>
            <div className={styles.detailGrid.label}>製品</div>
            <div className={styles.detailGrid.value}>
              {item.product_name || "名称未設定"} ({item.product_code || "-"})
            </div>
          </div>
          <div>
            <div className={styles.detailGrid.label}>倉庫</div>
            <div className={styles.detailGrid.value}>
              {item.warehouse_name || "名称未設定"} ({item.warehouse_code || "-"})
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
          <TabsTrigger value="intake_history">入庫履歴</TabsTrigger>
          <TabsTrigger value="history">出庫履歴</TabsTrigger>
          <TabsTrigger value="forecast">需要予測</TabsTrigger>
          <TabsTrigger value="replenishment">発注提案</TabsTrigger>
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
          <div className="flex justify-end p-2 bg-white rounded-t-lg border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-archived"
                checked={showArchived}
                onCheckedChange={(checked) => setShowArchived(checked as boolean)}
              />
              <label
                htmlFor="show-archived"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-600"
              >
                アーカイブ済みのロットを表示
              </label>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <DataTable
              data={itemLots}
              columns={lotColumns}
              getRowId={(row) => row.id}
              isLoading={lotsLoading}
              emptyMessage="該当するロットがありません。"
            />
          </div>
        </TabsContent>

        {/* Tab 3: 入荷予定 */}
        <TabsContent value="inbound" className="space-y-4">
          <InboundPlansTab productId={productIdNum} warehouseId={warehouseIdNum} />
        </TabsContent>

        {/* Tab: 入庫履歴 */}
        <TabsContent value="intake_history" className="space-y-4">
          <IntakeHistoryList
            productId={productIdNum}
            warehouseId={warehouseIdNum}
            isCompact={true}
          />
        </TabsContent>

        {/* Tab 4: 出庫履歴 */}
        <TabsContent value="history" className="space-y-4">
          <WithdrawalHistoryList productId={productIdNum} warehouseId={warehouseIdNum} />
        </TabsContent>

        {/* Tab 5: 需要予測 */}
        <TabsContent value="forecast" className="space-y-4">
          <ForecastsTab productId={productIdNum} />
        </TabsContent>

        {/* Tab 6: 発注提案 */}
        <TabsContent value="replenishment" className="space-y-4">
          <ReplenishmentTab productId={productIdNum} warehouseId={warehouseIdNum} />
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

      {/* 履歴カレンダーダイアログ */}
      {selectedLotForHistory && (
        <WithdrawalHistoryDialog
          lot={selectedLotForHistory}
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          onWithdrawalSuccess={handleWithdrawalSuccess}
        />
      )}

      {/* 編集ダイアログ */}
      {selectedLot && (
        <FormDialog
          open={editDialog.isOpen}
          onClose={handleCloseEdit}
          title="ロット編集"
          description={`ロット ${selectedLot.lot_number} を編集します`}
          size="lg"
        >
          <LotEditForm
            initialData={selectedLot}
            onSubmit={async (data: LotUpdateData) => {
              await updateLotMutation.mutateAsync(data);
            }}
            onCancel={handleCloseEdit}
            isSubmitting={updateLotMutation.isPending}
          />
        </FormDialog>
      )}

      {/* ロック確認ダイアログ */}
      {selectedLot && (
        <LotLockDialog
          open={lockDialog.isOpen}
          onClose={handleCloseLock}
          onConfirm={async (reason, quantity) => {
            await lockLotMutation.mutateAsync({ id: selectedLot.id, reason, quantity });
          }}
          isSubmitting={lockLotMutation.isPending}
          lotNumber={selectedLot.lot_number}
          availableQuantity={calculateAvailable(
            selectedLot.current_quantity,
            selectedLot.allocated_quantity,
            selectedLot.locked_quantity,
          ).toNumber()}
        />
      )}

      {/* アーカイブ確認ダイアログ */}
      {selectedLotForArchive && (
        <LotArchiveDialog
          lot={selectedLotForArchive}
          open={archiveDialogOpen}
          onOpenChange={setArchiveDialogOpen}
          onConfirm={async (lotNumber) => {
            const confirmedLot = selectedLotForArchive;
            await archiveLot({ id: confirmedLot.id, lotNumber });
            refetchLots();
            queryClient.invalidateQueries({
              queryKey: inventoryItemKeys.detail(productIdNum, warehouseIdNum),
            });
          }}
          isSubmitting={false}
        />
      )}
    </div>
  );
}
