/**
 * InventoryTable - Main inventory table with expandable lot details.
 * Refactored to use DataTable component.
 */
import { ArrowDownToLine, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui";
import type { InventoryItem } from "@/features/inventory/api";
import { InventoryLotList } from "@/features/inventory/components/InventoryLotList";
import { inventoryColumns } from "@/features/inventory/components/InventoryTableColumns";
import { LoadingState, EmptyState } from "@/features/inventory/components/InventoryTableComponents";
import { InventoryTableDialogs } from "@/features/inventory/components/InventoryTableDialogs";
import { QuickLotIntakeDialog } from "@/features/inventory/components/QuickLotIntakeDialog";
import { useInventoryTableLogic } from "@/features/inventory/hooks/useInventoryTableLogic";
import { QuickWithdrawalDialog, WithdrawalHistoryDialog } from "@/features/withdrawals/components";
import { DataTable } from "@/shared/components/data/DataTable";
import type { LotUI } from "@/shared/libs/normalize";

interface InventoryTableProps {
  data: InventoryItem[];
  isLoading: boolean;
  onRowClick?: (item: InventoryItem) => void;
  onRefresh?: () => void;
  /** Supplier ID from page filter - passed to quick intake dialog */
  filterSupplierId?: number;
}

/** 複合キー生成 */
const getItemKey = (item: InventoryItem) => `${item.product_id}-${item.warehouse_id}`;

// eslint-disable-next-line max-lines-per-function
export function InventoryTable({
  data,
  isLoading,
  onRowClick,
  onRefresh,
  filterSupplierId,
}: InventoryTableProps) {
  const {
    selectedLot,
    editDialog,
    lockDialog,
    updateLotMutation,
    lockLotMutation,
    handleEditLot,
    handleLockLot,
    handleUnlockLot,
    toggleRow,
    isRowExpanded,
    fetchLotsForItem,
    getLotsForItem,
    isLotsLoading,
    handleViewDetail,
    handleCloseEdit,
    handleCloseLock,
    refetchLots,
  } = useInventoryTableLogic();

  // 簡易出庫ダイアログ用の状態
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [selectedWithdrawalLot, setSelectedWithdrawalLot] = useState<LotUI | null>(null);

  const handleWithdrawLot = (lot: LotUI) => {
    setSelectedWithdrawalLot(lot);
    setWithdrawalDialogOpen(true);
  };

  // 履歴ダイアログ用の状態
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedHistoryLot, setSelectedHistoryLot] = useState<LotUI | null>(null);

  const handleHistoryLot = (lot: LotUI) => {
    setSelectedHistoryLot(lot);
    setHistoryDialogOpen(true);
  };

  // ロット簡易登録ダイアログ用の状態
  const [quickIntakeDialogOpen, setQuickIntakeDialogOpen] = useState(false);
  const [quickIntakeItem, setQuickIntakeItem] = useState<InventoryItem | null>(null);

  const handleQuickIntake = (item: InventoryItem) => {
    setQuickIntakeItem(item);
    setQuickIntakeDialogOpen(true);
  };

  const handleQuickIntakeSuccess = () => {
    refetchLots();
    onRefresh?.();
  };

  const handleWithdrawalSuccess = () => {
    refetchLots();
    onRefresh?.();
  };

  // 展開された行のIDリスト
  const expandedRowIds = useMemo(() => {
    return data.filter((item) => isRowExpanded(item.product_id, item.warehouse_id)).map(getItemKey);
  }, [data, isRowExpanded]);

  // 展開状態変更ハンドラー
  const handleExpandedRowsChange = (ids: (string | number)[]) => {
    // 変更を検出して対応する行をトグル
    const idsSet = new Set(ids.map(String));
    const currentSet = new Set(expandedRowIds);

    // 新しく展開された行
    const added = [...idsSet].find((id) => !currentSet.has(id));
    if (added) {
      const item = data.find((i) => getItemKey(i) === added);
      if (item) {
        toggleRow(item.product_id, item.warehouse_id);
        void fetchLotsForItem(item.product_id, item.warehouse_id);
      }
      return;
    }

    // 折りたたまれた行
    const removed = [...currentSet].find((id) => !idsSet.has(id));
    if (removed) {
      const item = data.find((i) => getItemKey(i) === removed);
      if (item) {
        toggleRow(item.product_id, item.warehouse_id);
      }
    }
  };

  // アクションボタン
  const navigate = useNavigate();
  const renderRowActions = (item: InventoryItem) => {
    // ロットがない場合は「ロット新規登録」ボタンを優先表示
    if (item.inventory_state === "no_lots") {
      return (
        <div className="flex justify-end gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              // ロット新規登録画面へ遷移（製品・倉庫をプリセット）
              navigate(
                `/inventory/adhoc/new?product_id=${item.product_id}&warehouse_id=${item.warehouse_id}`,
              );
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            登録
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetail(item.product_id, item.warehouse_id);
            }}
          >
            詳細
          </Button>
        </div>
      );
    }

    // 通常のアクションボタン（入庫 + 詳細）
    return (
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleQuickIntake(item);
          }}
          title="ロット入庫"
        >
          <ArrowDownToLine className="mr-1 h-4 w-4" />
          入庫
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetail(item.product_id, item.warehouse_id);
          }}
        >
          詳細
        </Button>
      </div>
    );
  };

  // 展開された行のコンテンツ
  const renderExpandedRow = (item: InventoryItem) => {
    const lots = getLotsForItem(item.product_id, item.warehouse_id);
    const loadingLots = isLotsLoading(item.product_id, item.warehouse_id);

    return (
      <InventoryLotList
        lots={lots}
        isLoading={loadingLots}
        warehouseNameFallback={item.warehouse_name || item.warehouse_code}
        onEdit={handleEditLot}
        onUnlock={handleUnlockLot}
        onLock={handleLockLot}
        onWithdraw={handleWithdrawLot}
        onHistory={handleHistoryLot}
      />
    );
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (data.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      <DataTable
        data={data}
        columns={inventoryColumns}
        getRowId={getItemKey}
        onRowClick={onRowClick}
        rowActions={renderRowActions}
        expandable
        expandedRowIds={expandedRowIds}
        onExpandedRowsChange={handleExpandedRowsChange}
        renderExpandedRow={renderExpandedRow}
        headerSlot={
          <div className="text-sm font-medium text-gray-700">{data.length} 件の在庫アイテム</div>
        }
        enableVirtualization
        scrollAreaHeight="calc(100vh - 280px)"
      />

      <InventoryTableDialogs
        selectedLot={selectedLot}
        editDialog={editDialog}
        lockDialog={lockDialog}
        updateLotMutation={updateLotMutation}
        lockLotMutation={lockLotMutation}
        onCloseEdit={handleCloseEdit}
        onCloseLock={handleCloseLock}
      />

      {/* 簡易出庫ダイアログ */}
      {selectedWithdrawalLot && (
        <QuickWithdrawalDialog
          lot={selectedWithdrawalLot}
          open={withdrawalDialogOpen}
          onOpenChange={setWithdrawalDialogOpen}
          onSuccess={handleWithdrawalSuccess}
        />
      )}

      {/* 履歴カレンダーダイアログ */}
      {selectedHistoryLot && (
        <WithdrawalHistoryDialog
          lot={selectedHistoryLot}
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          onWithdrawalSuccess={handleWithdrawalSuccess}
        />
      )}

      {/* ロット簡易登録ダイアログ */}
      <QuickLotIntakeDialog
        open={quickIntakeDialogOpen}
        onOpenChange={setQuickIntakeDialogOpen}
        onSuccess={handleQuickIntakeSuccess}
        initialProductId={quickIntakeItem?.product_id}
        initialWarehouseId={quickIntakeItem?.warehouse_id}
        initialSupplierId={filterSupplierId}
      />
    </div>
  );
}
