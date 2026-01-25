/**
 * InventoryTable - Main inventory table with expandable lot details.
 * Refactored to use DataTable component.
 */
import { ArrowDownToLine, Plus } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui";
import type { InventoryItem } from "@/features/inventory/api";
import { InventoryLotList } from "@/features/inventory/components/InventoryLotList";
import { inventoryColumns } from "@/features/inventory/components/InventoryTableColumns";
import { EmptyState, LoadingState } from "@/features/inventory/components/InventoryTableComponents";
import { InventoryTableDialogs } from "@/features/inventory/components/InventoryTableDialogs";
import { QuickLotIntakeDialog } from "@/features/inventory/components/QuickLotIntakeDialog";
import { useInventoryDialogs } from "@/features/inventory/hooks/useInventoryDialogs";
import { useInventoryTableLogic } from "@/features/inventory/hooks/useInventoryTableLogic";
import { QuickWithdrawalDialog, WithdrawalHistoryDialog } from "@/features/withdrawals/components";
import { DataTable } from "@/shared/components/data/DataTable";

interface InventoryTableProps {
  data: InventoryItem[];
  isLoading: boolean;
  onRowClick?: (item: InventoryItem) => void;
  onRefresh?: () => void;
  /** Supplier ID from page filter - passed to quick intake dialog */
  filterSupplierId?: number;
  /** Custom header content (replaces default count display) */
  headerContent?: React.ReactNode;
}

/** 複合キー生成 */
const getItemKey = (item: InventoryItem) =>
  `${item.supplier_id ?? "all"}-${item.product_id}-${item.warehouse_id}`;

// eslint-disable-next-line max-lines-per-function
export function InventoryTable({
  data,
  isLoading,
  onRowClick,
  onRefresh,
  filterSupplierId,
  headerContent,
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
    handleArchiveLot,
    handleUnarchiveLot,
    isRowExpanded,
    fetchLotsForItem,
    getLotsForItem,
    isLotsLoading,
    handleViewDetail,
    handleCloseEdit,
    handleCloseLock,
    refetchLots,
    setExpandedRows,
  } = useInventoryTableLogic();

  // ダイアログ状態管理（排他的に1つだけ開く）
  const {
    openWithdrawal,
    openHistory,
    openQuickIntake,
    close: closeDialog,
    isWithdrawalOpen,
    isHistoryOpen,
    isQuickIntakeOpen,
    withdrawalLot,
    historyLot,
    quickIntakeItem,
  } = useInventoryDialogs();

  const handleSuccess = () => {
    refetchLots();
    onRefresh?.();
  };

  // 展開された行のIDリスト
  const expandedRowIds = useMemo(() => {
    return data.filter((item) => isRowExpanded(item.product_id, item.warehouse_id)).map(getItemKey);
  }, [data, isRowExpanded]);

  // 展開状態変更ハンドラー
  const handleExpandedRowsChange = (ids: (string | number)[]) => {
    const idsSet = new Set(ids.map(String));
    const currentSet = new Set(expandedRowIds);

    // 新しく展開された行のロットデータを取得
    const addedIds = [...idsSet].filter((id) => !currentSet.has(id));
    addedIds.forEach((added) => {
      const item = data.find((i) => getItemKey(i) === added);
      if (item) {
        void fetchLotsForItem(item.product_id, item.warehouse_id);
      }
    });

    // 展開状態を直接更新（product_id-warehouse_id形式に変換）
    const expandKeys = new Set<string>();
    ids.forEach((id) => {
      const item = data.find((i) => getItemKey(i) === String(id));
      if (item) {
        expandKeys.add(`${item.product_id}-${item.warehouse_id}`);
      }
    });
    setExpandedRows(expandKeys);
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
            openQuickIntake(item);
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
        onWithdraw={openWithdrawal}
        onHistory={openHistory}
        onArchive={handleArchiveLot}
        onUnarchive={handleUnarchiveLot}
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
        expandMode="single"
        expandedRowIds={expandedRowIds}
        onExpandedRowsChange={handleExpandedRowsChange}
        renderExpandedRow={renderExpandedRow}
        headerSlot={
          <div className="text-sm font-medium text-gray-700">
            {headerContent ?? `${data.length} 件の在庫アイテム`}
          </div>
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
      {withdrawalLot && (
        <QuickWithdrawalDialog
          lot={withdrawalLot}
          open={isWithdrawalOpen}
          onOpenChange={(open) => !open && closeDialog()}
          onSuccess={handleSuccess}
        />
      )}

      {/* 履歴カレンダーダイアログ */}
      {historyLot && (
        <WithdrawalHistoryDialog
          lot={historyLot}
          open={isHistoryOpen}
          onOpenChange={(open) => !open && closeDialog()}
          onWithdrawalSuccess={handleSuccess}
        />
      )}

      {/* ロット簡易登録ダイアログ */}
      <QuickLotIntakeDialog
        open={isQuickIntakeOpen}
        onOpenChange={(open) => !open && closeDialog()}
        onSuccess={handleSuccess}
        initialProductId={quickIntakeItem?.product_id}
        initialWarehouseId={quickIntakeItem?.warehouse_id}
        initialSupplierId={quickIntakeItem?.supplier_id ?? filterSupplierId}
      />
    </div>
  );
}
