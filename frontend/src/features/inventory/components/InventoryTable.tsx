/* eslint-disable max-lines */
/**
 * InventoryTable - Main inventory table with expandable lot details.
 * Refactored to use DataTable component.
 */
import { ArrowUpFromLine, History, Lock, Pencil, Unlock } from "lucide-react";
import { useState, useMemo } from "react";

import { Button } from "@/components/ui";
import type { InventoryItem } from "@/features/inventory/api";
import { LoadingState, EmptyState } from "@/features/inventory/components/InventoryTableComponents";
import { LotEditForm, type LotUpdateData } from "@/features/inventory/components/LotEditForm";
import { LotLockDialog } from "@/features/inventory/components/LotLockDialog";
import { useInventoryTableLogic } from "@/features/inventory/hooks/useInventoryTableLogic";
import { QuickWithdrawalDialog, WithdrawalHistoryDialog } from "@/features/withdrawals/components";
import type { Column } from "@/shared/components/data/DataTable";
import { DataTable } from "@/shared/components/data/DataTable";
import { FormDialog } from "@/shared/components/form";
import type { LotUI } from "@/shared/libs/normalize";
import { fmt } from "@/shared/utils/number";

interface InventoryTableProps {
  data: InventoryItem[];
  isLoading: boolean;
  onRowClick?: (item: InventoryItem) => void;
  onRefresh?: () => void;
}

/** 複合キー生成 */
const getItemKey = (item: InventoryItem) => `${item.product_id}-${item.warehouse_id}`;

// eslint-disable-next-line max-lines-per-function
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

  // 列定義
  const columns = useMemo<Column<InventoryItem>[]>(
    // eslint-disable-next-line max-lines-per-function
    () => [
      {
        id: "product",
        header: "製品",
        accessor: (row) =>
          row.product_name
            ? `${row.product_name} (${row.product_code || ""})`
            : row.product_code || `ID: ${row.product_id}`,
        cell: (row) => (
          <div className="flex flex-col">
            <span
              className="block truncate font-medium text-slate-900"
              title={row.product_name || ""}
            >
              {row.product_name || "名称未設定"}
            </span>
            <span className="text-[11px] text-slate-500">{row.product_code || "-"}</span>
          </div>
        ),
        width: 250,
        sortable: true,
      },
      {
        id: "warehouse",
        header: "倉庫",
        accessor: (row) =>
          row.warehouse_name
            ? `${row.warehouse_name} (${row.warehouse_code || ""})`
            : row.warehouse_code || `ID: ${row.warehouse_id}`,
        cell: (row) => (
          <div className="flex flex-col">
            <span
              className="block truncate font-medium text-slate-700"
              title={row.warehouse_name || ""}
            >
              {row.warehouse_name || "名称未設定"}
            </span>
            <span className="text-[11px] text-slate-500">{row.warehouse_code || "-"}</span>
          </div>
        ),
        width: 180,
        sortable: true,
      },
      {
        id: "lots",
        header: "ロット数",
        accessor: (row) => row.lot_count,
        width: 80,
        align: "right",
        sortable: true,
      },
      {
        id: "total",
        header: "総在庫数",
        accessor: (row) => row.total_quantity,
        cell: (row) => fmt(row.total_quantity),
        width: 100,
        align: "right",
        sortable: true,
      },
      {
        id: "soft",
        header: "仮引当",
        accessor: (row) => row.soft_allocated_quantity,
        cell: (row) => <span className="text-orange-600">{fmt(row.soft_allocated_quantity)}</span>,
        width: 100,
        align: "right",
        sortable: true,
      },
      {
        id: "hard",
        header: "確定引当",
        accessor: (row) => row.hard_allocated_quantity,
        cell: (row) => (
          <span className="font-medium text-red-600">{fmt(row.hard_allocated_quantity)}</span>
        ),
        width: 100,
        align: "right",
        sortable: true,
      },
      {
        id: "available",
        header: "利用可能",
        accessor: (row) => row.available_quantity,
        cell: (row) => (
          <span className="font-medium text-green-600">{fmt(row.available_quantity)}</span>
        ),
        width: 100,
        align: "right",
        sortable: true,
      },
      {
        id: "updated",
        header: "最終更新",
        accessor: (row) => row.last_updated,
        cell: (row) => (
          <span className="text-gray-600">
            {new Date(row.last_updated).toLocaleString("ja-JP")}
          </span>
        ),
        width: 180,
        sortable: true,
      },
    ],
    [],
  );

  // アクションボタン
  const renderRowActions = (item: InventoryItem) => {
    return (
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
    );
  };

  // 展開された行のコンテンツ
  // eslint-disable-next-line max-lines-per-function
  const renderExpandedRow = (item: InventoryItem) => {
    const lots = getLotsForItem(item.product_id, item.warehouse_id);
    const loadingLots = isLotsLoading(item.product_id, item.warehouse_id);

    return (
      <div className="px-8 py-4">
        <h4 className="mb-3 text-sm font-semibold text-gray-700">ロット一覧 ({lots.length}件)</h4>
        {loadingLots && lots.length === 0 ? (
          <p className="text-sm text-gray-500">ロットを取得中...</p>
        ) : lots.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-2 text-left font-medium text-gray-600">ロット番号</th>
                <th className="pb-2 text-right font-medium text-gray-600">現在在庫</th>
                <th className="pb-2 text-left font-medium text-gray-600">単位</th>
                <th className="pb-2 text-left font-medium text-gray-600">入荷日</th>
                <th className="pb-2 text-left font-medium text-gray-600">有効期限</th>
                <th className="pb-2 text-left font-medium text-gray-600">ステータス</th>
                <th className="pb-2 text-right font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line max-lines-per-function */}
              {lots.map((lot) => {
                const lotWithWarehouseName = {
                  ...lot,
                  warehouse_name: lot.warehouse_name || item.warehouse_name || item.warehouse_code,
                };
                return (
                  <tr key={lot.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-900">{lot.lot_number}</td>
                    <td className="py-2 text-right font-semibold">
                      {fmt(Number(lot.current_quantity))}
                    </td>
                    <td className="py-2 text-gray-600">{lot.unit}</td>
                    <td className="py-2 text-gray-600">
                      {lot.received_date && !isNaN(new Date(lot.received_date).getTime())
                        ? new Date(lot.received_date).toLocaleDateString("ja-JP")
                        : "-"}
                    </td>
                    <td className="py-2 text-gray-600">
                      {lot.expiry_date && !isNaN(new Date(lot.expiry_date).getTime())
                        ? new Date(lot.expiry_date).toLocaleDateString("ja-JP")
                        : "-"}
                    </td>
                    <td className="py-2">
                      {/* ステータスアイコンは省略 - 必要に応じて追加 */}
                      <span className="text-xs text-gray-500">
                        {Number(lot.locked_quantity || 0) > 0 ? "ロック中" : "利用可"}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLot(lotWithWarehouseName)}
                          title="編集"
                          className="h-7 w-7 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {Number(lot.locked_quantity || 0) > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnlockLot(lotWithWarehouseName)}
                            title="ロック解除"
                            className="h-7 w-7 p-0"
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLockLot(lotWithWarehouseName)}
                            title="ロック"
                            className="h-7 w-7 p-0"
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleWithdrawLot(lotWithWarehouseName)}
                          title="出庫"
                          className="h-7 w-7 p-0"
                          disabled={
                            Number(lot.current_quantity) -
                              Number(lot.allocated_quantity) -
                              Number(lot.locked_quantity || 0) <=
                            0
                          }
                        >
                          <ArrowUpFromLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleHistoryLot(lotWithWarehouseName)}
                          title="履歴"
                          className="h-7 w-7 p-0"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">ロットがありません</p>
        )}
      </div>
    );
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

      <DataTable
        data={data}
        columns={columns}
        getRowId={getItemKey}
        onRowClick={onRowClick}
        rowActions={renderRowActions}
        expandable
        expandedRowIds={expandedRowIds}
        onExpandedRowsChange={handleExpandedRowsChange}
        renderExpandedRow={renderExpandedRow}
      />

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
