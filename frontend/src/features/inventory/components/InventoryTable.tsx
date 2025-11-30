import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ROUTES } from "@/constants/routes";
import type { InventoryItem } from "@/features/inventory/api";
import {
  LoadingState,
  EmptyState,
  InventoryRow,
} from "@/features/inventory/components/InventoryTableComponents";
import { LotEditForm, type LotUpdateData } from "@/features/inventory/components/LotEditForm";
import { LotLockDialog } from "@/features/inventory/components/LotLockDialog";
import * as styles from "@/features/inventory/pages/styles";
import { useLotsQuery } from "@/hooks/api";
import { useUpdateLot, useLockLot, useUnlockLot } from "@/hooks/mutations";
import { useDialog } from "@/hooks/ui";
import { FormDialog } from "@/shared/components/form";
import type { LotUI } from "@/shared/libs/normalize";

interface InventoryTableProps {
  data: InventoryItem[];
  isLoading: boolean;
  onRowClick?: (item: InventoryItem) => void;
}

export function InventoryTable({ data, isLoading, onRowClick }: InventoryTableProps) {
  const navigate = useNavigate();

  // Dialog states
  const editDialog = useDialog();
  const lockDialog = useDialog();
  const [selectedLot, setSelectedLot] = useState<LotUI | null>(null);

  // 展開状態管理（製品ID-倉庫IDのキー）
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // 全ロット取得（展開行のフィルタリング用）
  // Note: This fetches all lots. For large datasets, this should be optimized to fetch only needed lots or use a better API.
  const { data: allLots = [], refetch: refetchLots } = useLotsQuery({});

  // Lot mutations
  const updateLotMutation = useUpdateLot(selectedLot?.id ?? 0, {
    onSuccess: () => {
      toast.success("ロットを更新しました");
      editDialog.close();
      setSelectedLot(null);
      refetchLots();
    },
    onError: (error) => toast.error(`更新に失敗しました: ${error.message}`),
  });

  const lockLotMutation = useLockLot({
    onSuccess: () => {
      toast.success("ロットをロックしました");
      lockDialog.close();
      setSelectedLot(null);
      refetchLots();
    },
    onError: (error) => toast.error(`ロックに失敗しました: ${error.message}`),
  });

  const unlockLotMutation = useUnlockLot({
    onSuccess: () => {
      toast.success("ロットのロックを解除しました");
      refetchLots();
    },
    onError: (error) => toast.error(`ロック解除に失敗しました: ${error.message}`),
  });

  // Lot action handlers
  const handleEditLot = useCallback(
    (lot: LotUI) => {
      setSelectedLot(lot);
      editDialog.open();
    },
    [editDialog],
  );

  const handleLockLot = useCallback(
    (lot: LotUI) => {
      setSelectedLot(lot);
      lockDialog.open();
    },
    [lockDialog],
  );

  const handleUnlockLot = useCallback(
    async (lot: LotUI) => {
      if (confirm(`ロット ${lot.lot_number} のロックを解除しますか?`)) {
        await unlockLotMutation.mutateAsync({ id: lot.id });
      }
    },
    [unlockLotMutation],
  );

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

  const handleViewDetail = (productId: number, warehouseId: number) => {
    navigate(ROUTES.INVENTORY.ITEMS.DETAIL(productId, warehouseId));
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
              <th className={styles.table.thRight}>引当済</th>
              <th className={styles.table.thRight}>利用可能</th>
              <th className={styles.table.th}>最終更新</th>
              <th className={styles.table.thRight}>アクション</th>
            </tr>
          </thead>
          <tbody className={styles.table.tbody}>
            {data.map((item) => {
              const expanded = isRowExpanded(item.product_id, item.warehouse_id);
              const lots = expanded ? getLotsForItem(item.product_id, item.warehouse_id) : [];

              return (
                <InventoryRow
                  key={`${item.product_id}-${item.warehouse_id}`}
                  item={item}
                  isExpanded={expanded}
                  lots={lots as LotUI[]}
                  onToggleRow={toggleRow}
                  onRowClick={onRowClick}
                  onViewDetail={handleViewDetail}
                  onEditLot={handleEditLot}
                  onLockLot={handleLockLot}
                  onUnlockLot={handleUnlockLot}
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
        onCloseEdit={() => {
          editDialog.close();
          setSelectedLot(null);
        }}
        onCloseLock={() => {
          lockDialog.close();
          setSelectedLot(null);
        }}
      />
    </div>
  );
}

interface LotDialogsProps {
  selectedLot: LotUI | null;
  editDialog: ReturnType<typeof useDialog>;
  lockDialog: ReturnType<typeof useDialog>;
  updateLotMutation: ReturnType<typeof useUpdateLot>;
  lockLotMutation: ReturnType<typeof useLockLot>;
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
