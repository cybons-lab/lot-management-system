import { format } from "date-fns";
import { ChevronDown, ChevronRight, Edit, Lock, Unlock } from "lucide-react";
import { Fragment, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import type { InventoryItem } from "@/features/inventory/api";
import { LotEditForm, type LotUpdateData } from "@/features/inventory/components/LotEditForm";
import { LotLockDialog } from "@/features/inventory/components/LotLockDialog";
import * as styles from "@/features/inventory/pages/styles";
import { useLotsQuery } from "@/hooks/api";
import { useUpdateLot, useLockLot, useUnlockLot } from "@/hooks/mutations";
import { useDialog } from "@/hooks/ui";
import { LotStatusIcon } from "@/shared/components/data/LotStatusIcon";
import { FormDialog } from "@/shared/components/form";
import type { LotUI } from "@/shared/libs/normalize";
import { fmt } from "@/shared/utils/number";
import { getLotStatuses } from "@/shared/utils/status";

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
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">データがありません</div>
      </div>
    );
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
                <Fragment key={`${item.product_id}-${item.warehouse_id}`}>
                  <tr
                    className={`${styles.table.tr} ${onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}`}
                    onClick={(e) => {
                      // Prevent triggering when clicking buttons or expander
                      if ((e.target as HTMLElement).closest("button")) return;
                      onRowClick?.(item);
                    }}
                  >
                    <td className={styles.table.td}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(item.product_id, item.warehouse_id);
                        }}
                        className="rounded p-1 hover:bg-gray-100"
                      >
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-600" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                    </td>
                    <td className={styles.table.td}>
                      {item.product_name || item.product_code || `ID: ${item.product_id}`}
                    </td>
                    <td className={styles.table.td}>
                      {item.warehouse_name || item.warehouse_code || `ID: ${item.warehouse_id}`}
                    </td>
                    <td className={styles.table.tdRight}>
                      {getLotsForItem(item.product_id, item.warehouse_id).length}
                    </td>
                    <td className={styles.table.tdRight}>{fmt(item.total_quantity)}</td>
                    <td className={styles.table.tdRightYellow}>{fmt(item.allocated_quantity)}</td>
                    <td className={styles.table.tdRightGreen}>{fmt(item.available_quantity)}</td>
                    <td className={styles.table.tdGray}>
                      {new Date(item.last_updated).toLocaleString("ja-JP")}
                    </td>
                    <td className={styles.table.tdRight}>
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
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={9} className="bg-gray-50 p-0">
                        <div className="px-12 py-4">
                          <h4 className="mb-3 text-sm font-semibold text-gray-700">
                            ロット一覧 ({lots.length}件)
                          </h4>
                          {lots.length > 0 ? (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="pb-2 text-left font-medium text-gray-600">
                                    ロット番号
                                  </th>
                                  <th className="pb-2 text-right font-medium text-gray-600">
                                    現在在庫
                                  </th>
                                  <th className="pb-2 text-left font-medium text-gray-600">単位</th>
                                  <th className="pb-2 text-left font-medium text-gray-600">
                                    入荷日
                                  </th>
                                  <th className="pb-2 text-left font-medium text-gray-600">
                                    有効期限
                                  </th>
                                  <th className="pb-2 text-left font-medium text-gray-600">
                                    ステータス
                                  </th>
                                  <th className="pb-2 text-right font-medium text-gray-600">
                                    操作
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {lots.map((lot) => {
                                  const statuses = getLotStatuses(lot);
                                  const isLocked = statuses.includes("locked");
                                  return (
                                    <tr
                                      key={lot.id}
                                      className={`border-b border-gray-100 hover:bg-gray-100 ${isLocked ? "opacity-60" : ""}`}
                                    >
                                      <td className="py-2 font-medium text-gray-900">
                                        {lot.lot_number}
                                      </td>
                                      <td className="py-2 text-right font-semibold">
                                        {fmt(Number(lot.current_quantity))}
                                      </td>
                                      <td className="py-2 text-gray-600">{lot.unit}</td>
                                      <td className="py-2 text-gray-600">
                                        {lot.received_date
                                          ? format(new Date(lot.received_date), "yyyy/MM/dd")
                                          : "-"}
                                      </td>
                                      <td className="py-2 text-gray-600">
                                        {lot.expiry_date
                                          ? format(new Date(lot.expiry_date), "yyyy/MM/dd")
                                          : "-"}
                                      </td>
                                      <td className="py-2">
                                        <div className="flex items-center gap-1">
                                          {statuses.map((s) => (
                                            <LotStatusIcon
                                              key={s}
                                              status={s as "locked" | "available" | "depleted"}
                                            />
                                          ))}
                                        </div>
                                      </td>
                                      <td className="py-2">
                                        <div className="flex items-center justify-end gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditLot(lot as LotUI);
                                            }}
                                            title="編集"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          {isLocked ? (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleUnlockLot(lot as LotUI);
                                              }}
                                              title="ロック解除"
                                            >
                                              <Unlock className="h-4 w-4" />
                                            </Button>
                                          ) : (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleLockLot(lot as LotUI);
                                              }}
                                              title="ロック"
                                            >
                                              <Lock className="h-4 w-4" />
                                            </Button>
                                          )}
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
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Lot Dialog */}
      {selectedLot && (
        <FormDialog
          open={editDialog.isOpen}
          onClose={() => {
            editDialog.close();
            setSelectedLot(null);
          }}
          title="ロット編集"
          description={`ロット ${selectedLot.lot_number} を編集します`}
          size="lg"
        >
          <LotEditForm
            initialData={selectedLot}
            onSubmit={async (data: LotUpdateData) => {
              await updateLotMutation.mutateAsync(data);
            }}
            onCancel={() => {
              editDialog.close();
              setSelectedLot(null);
            }}
            isSubmitting={updateLotMutation.isPending}
          />
        </FormDialog>
      )}

      {/* Lock Lot Dialog */}
      {selectedLot && (
        <LotLockDialog
          open={lockDialog.isOpen}
          onClose={() => {
            lockDialog.close();
            setSelectedLot(null);
          }}
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
      )}
    </div>
  );
}
