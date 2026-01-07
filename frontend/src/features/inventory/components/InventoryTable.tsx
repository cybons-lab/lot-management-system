import { useState } from "react";

import type { InventoryItem } from "@/features/inventory/api";
import {
  LoadingState,
  EmptyState,
  InventoryRow,
} from "@/features/inventory/components/InventoryTableComponents";
import { LotEditForm, type LotUpdateData } from "@/features/inventory/components/LotEditForm";
import { LotLockDialog } from "@/features/inventory/components/LotLockDialog";
import { useInventoryTableLogic } from "@/features/inventory/hooks/useInventoryTableLogic";
import * as styles from "@/features/inventory/pages/styles";
import { QuickWithdrawalDialog } from "@/features/withdrawals/components";
import { FormDialog } from "@/shared/components/form";
import type { LotUI } from "@/shared/libs/normalize";

interface InventoryTableProps {
  data: InventoryItem[];
  isLoading: boolean;
  onRowClick?: (item: InventoryItem) => void;
  onRefresh?: () => void;
}

export function InventoryTable({
  data,
  isLoading,
  onRowClick,
  onRefresh,
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
    getLotsForItem,
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

  const handleWithdrawalSuccess = () => {
    refetchLots();
    onRefresh?.();
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (data.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">{data.length} 件の在庫アイテム</div>

      <div className={styles.table.container}>
        <table className={styles.table.root}>
          <thead className={styles.table.thead}>
            <tr>
              <th className={styles.table.th} style={{ width: "40px" }}></th>
              <th className={styles.table.th}>製品</th>
              <th className={styles.table.th}>倉庫</th>
              <th className={styles.table.thRight}>ロット数</th>
              <th className={styles.table.thRight}>総在庫数</th>
              <th className={styles.table.thRight}>仮引当</th>
              <th className={styles.table.thRight}>確定引当</th>
              <th className={styles.table.thRight}>利用可能</th>
              <th className={styles.table.th}>最終更新</th>
              <th className={styles.table.thRight}>アクション</th>
            </tr>
          </thead>
          <tbody className={styles.table.tbody}>
            {data.map((item) => {
              const expanded = isRowExpanded(item.product_id, item.warehouse_id);
              // ロット数は常に取得して表示
              const lots = getLotsForItem(item.product_id, item.warehouse_id);

              return (
                <InventoryRow
                  key={`${item.product_id}-${item.warehouse_id}`}
                  item={item}
                  isExpanded={expanded}
                  lots={lots}
                  onToggleRow={toggleRow}
                  onRowClick={onRowClick}
                  onViewDetail={handleViewDetail}
                  onEditLot={handleEditLot}
                  onLockLot={handleLockLot}
                  onUnlockLot={handleUnlockLot}
                  onWithdrawLot={handleWithdrawLot}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <LotDialogs
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
    </div>
  );
}

interface LotDialogsProps {
  selectedLot: ReturnType<typeof useInventoryTableLogic>["selectedLot"];
  editDialog: ReturnType<typeof useInventoryTableLogic>["editDialog"];
  lockDialog: ReturnType<typeof useInventoryTableLogic>["lockDialog"];
  updateLotMutation: ReturnType<typeof useInventoryTableLogic>["updateLotMutation"];
  lockLotMutation: ReturnType<typeof useInventoryTableLogic>["lockLotMutation"];
  onCloseEdit: () => void;
  onCloseLock: () => void;
}

function LotDialogs({
  selectedLot,
  editDialog,
  lockDialog,
  updateLotMutation,
  lockLotMutation,
  onCloseEdit,
  onCloseLock,
}: LotDialogsProps) {
  if (!selectedLot) return null;

  return (
    <>
      <FormDialog
        open={editDialog.isOpen}
        onClose={onCloseEdit}
        title="ロット編集"
        description={`ロット ${selectedLot.lot_number} を編集します`}
        size="lg"
      >
        <LotEditForm
          initialData={selectedLot}
          onSubmit={async (data: LotUpdateData) => {
            await updateLotMutation.mutateAsync(data);
          }}
          onCancel={onCloseEdit}
          isSubmitting={updateLotMutation.isPending}
        />
      </FormDialog>

      <LotLockDialog
        open={lockDialog.isOpen}
        onClose={onCloseLock}
        onConfirm={async (reason, quantity) => {
          await lockLotMutation.mutateAsync({ id: selectedLot.id, reason, quantity });
        }}
        isSubmitting={lockLotMutation.isPending}
        lotNumber={selectedLot.lot_number}
        availableQuantity={
          Number(selectedLot.current_quantity) -
          Number(selectedLot.allocated_quantity) -
          Number(selectedLot.locked_quantity || 0)
        }
      />
    </>
  );
}
