/* eslint-disable max-lines-per-function */
import { useState, useRef, useCallback, useEffect } from "react";

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
import { QuickWithdrawalDialog, WithdrawalHistoryDialog } from "@/features/withdrawals/components";
import { FormDialog } from "@/shared/components/form";
import type { LotUI } from "@/shared/libs/normalize";

interface InventoryTableProps {
  data: InventoryItem[];
  isLoading: boolean;
  onRowClick?: (item: InventoryItem) => void;
  onRefresh?: () => void;
}

export function InventoryTable({ data, isLoading, onRowClick, onRefresh }: InventoryTableProps) {
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

  // 履歴ダイアログ用の状態
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedHistoryLot, setSelectedHistoryLot] = useState<LotUI | null>(null);

  const handleHistoryLot = (lot: LotUI) => {
    setSelectedHistoryLot(lot);
    setHistoryDialogOpen(true);
  };

  const handleWithdrawalSuccess = () => {
    refetchLots();
    onRefresh?.();
  };

  // 列リサイズロジック
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    expander: 40,
    product: 200,
    warehouse: 150,
    lots: 80,
    total: 80,
    soft: 80,
    hard: 80,
    available: 80,
    updated: 150,
    actions: 100,
  });

  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, columnId: string) => {
    e.preventDefault();
    resizingColumn.current = columnId;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    startX.current = clientX;
    startWidth.current = columnWidths[columnId];

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
    document.addEventListener("touchmove", handleResizeMove);
    document.addEventListener("touchend", handleResizeEnd);
  };

  const handleResizeMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!resizingColumn.current) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const diff = clientX - startX.current;

    // 最小幅を30pxに設定
    const newWidth = Math.max(30, startWidth.current + diff);

    setColumnWidths((prev) => ({
      ...prev,
      [resizingColumn.current!]: newWidth,
    }));
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizingColumn.current = null;
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
    document.removeEventListener("touchmove", handleResizeMove);
    document.removeEventListener("touchend", handleResizeEnd);
  }, [handleResizeMove]);

  // コンポーネントのアンマウント時にイベントリスナーを解除
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      document.removeEventListener("touchmove", handleResizeMove);
      document.removeEventListener("touchend", handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  // リサイズハンドルのレンダリングヘルパー
  const ResizeHandle = ({ columnId }: { columnId: string }) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      onMouseDown={(e) => handleResizeStart(e, columnId)}
      onTouchStart={(e) => handleResizeStart(e, columnId)}
      className="absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none bg-slate-200 opacity-0 transition-opacity select-none group-hover:opacity-50 hover:bg-blue-400 hover:opacity-100"
      onClick={(e) => e.stopPropagation()}
    />
  );

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
              <th
                className={`${styles.table.th} group relative`}
                style={{ width: columnWidths.expander }}
              >
                <ResizeHandle columnId="expander" />
              </th>
              <th
                className={`${styles.table.th} group relative`}
                style={{ width: columnWidths.product }}
              >
                製品
                <ResizeHandle columnId="product" />
              </th>
              <th
                className={`${styles.table.th} group relative`}
                style={{ width: columnWidths.warehouse }}
              >
                倉庫
                <ResizeHandle columnId="warehouse" />
              </th>
              <th
                className={`${styles.table.thRight} group relative`}
                style={{ width: columnWidths.lots }}
              >
                ロット数
                <ResizeHandle columnId="lots" />
              </th>
              <th
                className={`${styles.table.thRight} group relative`}
                style={{ width: columnWidths.total }}
              >
                総在庫数
                <ResizeHandle columnId="total" />
              </th>
              <th
                className={`${styles.table.thRight} group relative`}
                style={{ width: columnWidths.soft }}
              >
                仮引当
                <ResizeHandle columnId="soft" />
              </th>
              <th
                className={`${styles.table.thRight} group relative`}
                style={{ width: columnWidths.hard }}
              >
                確定引当
                <ResizeHandle columnId="hard" />
              </th>
              <th
                className={`${styles.table.thRight} group relative`}
                style={{ width: columnWidths.available }}
              >
                利用可能
                <ResizeHandle columnId="available" />
              </th>
              <th
                className={`${styles.table.th} group relative`}
                style={{ width: columnWidths.updated }}
              >
                最終更新
                <ResizeHandle columnId="updated" />
              </th>
              <th
                className={`${styles.table.thRight} group relative`}
                style={{ width: columnWidths.actions }}
              >
                アクション
                <ResizeHandle columnId="actions" />
              </th>
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
                  onHistoryLot={handleHistoryLot}
                  columnWidths={columnWidths}
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

      {/* 履歴カレンダーダイアログ */}
      {selectedHistoryLot && (
        <WithdrawalHistoryDialog
          lot={selectedHistoryLot}
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          onWithdrawalSuccess={handleWithdrawalSuccess}
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
