/**
 * InventoryTable - Main inventory table with expandable lot details.
 */
/* eslint-disable max-lines-per-function */
import { useMemo } from "react";

import { RowActions } from "./InventoryTableRowActions";

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
  filterSupplierId?: number;
  headerContent?: React.ReactNode;
}

const getItemKey = (item: InventoryItem) =>
  `${item.supplier_id ?? "all"}-${item.product_group_id}-${item.warehouse_id}`;

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
  const expandedRowIds = useMemo(
    () =>
      data
        .filter((item) => isRowExpanded(item.product_group_id, item.warehouse_id))
        .map(getItemKey),
    [data, isRowExpanded],
  );

  const handleExpandedRowsChange = (ids: (string | number)[]) => {
    const idsSet = new Set(ids.map(String)),
      currentSet = new Set(expandedRowIds);
    [...idsSet]
      .filter((id) => !currentSet.has(id))
      .forEach((added) => {
        const item = data.find((i) => getItemKey(i) === added);
        if (item) void fetchLotsForItem(item.product_group_id, item.warehouse_id);
      });
    const expandKeys = new Set<string>();
    ids.forEach((id) => {
      const item = data.find((i) => getItemKey(i) === String(id));
      if (item) expandKeys.add(`${item.product_group_id}-${item.warehouse_id}`);
    });
    setExpandedRows(expandKeys);
  };

  const renderExpandedRow = (item: InventoryItem) => (
    <InventoryLotList
      lots={getLotsForItem(item.product_group_id, item.warehouse_id)}
      isLoading={isLotsLoading(item.product_group_id, item.warehouse_id)}
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

  if (isLoading) return <LoadingState />;
  if (data.length === 0) return <EmptyState />;

  return (
    <div>
      <DataTable
        data={data}
        columns={inventoryColumns}
        getRowId={getItemKey}
        onRowClick={onRowClick}
        rowActions={(item) => (
          <RowActions
            item={item}
            onOpenQuickIntake={openQuickIntake}
            onViewDetail={handleViewDetail}
          />
        )}
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
      {withdrawalLot && (
        <QuickWithdrawalDialog
          lot={withdrawalLot}
          open={isWithdrawalOpen}
          onOpenChange={(open) => !open && closeDialog()}
          onSuccess={handleSuccess}
        />
      )}
      {historyLot && (
        <WithdrawalHistoryDialog
          lot={historyLot}
          open={isHistoryOpen}
          onOpenChange={(open) => !open && closeDialog()}
          onWithdrawalSuccess={handleSuccess}
        />
      )}
      <QuickLotIntakeDialog
        open={isQuickIntakeOpen}
        onOpenChange={(open) => !open && closeDialog()}
        onSuccess={handleSuccess}
        initialProductId={quickIntakeItem?.product_group_id}
        initialWarehouseId={quickIntakeItem?.warehouse_id}
        initialSupplierId={quickIntakeItem?.supplier_id ?? filterSupplierId}
      />
    </div>
  );
}
