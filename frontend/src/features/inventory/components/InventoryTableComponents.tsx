/* eslint-disable max-lines-per-function, complexity */
import { format } from "date-fns";
import {
  ArrowUpFromLine,
  ChevronDown,
  ChevronRight,
  Edit,
  History,
  Lock,
  Unlock,
} from "lucide-react";
import { Fragment } from "react";

import { Button } from "@/components/ui";
import type { InventoryItem } from "@/features/inventory/api";
import * as styles from "@/features/inventory/pages/styles";
import { LotStatusIcon } from "@/shared/components/data/LotStatusIcon";
import type { LotUI } from "@/shared/libs/normalize";
import { fmt } from "@/shared/utils/number";
import { getLotStatuses } from "@/shared/utils/status";

export function LoadingState() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-gray-500">読み込み中...</div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-gray-500">データがありません</div>
    </div>
  );
}

interface LotTableRowProps {
  lot: LotUI;
  onEdit: (lot: LotUI) => void;
  onLock: (lot: LotUI) => void;
  onUnlock: (lot: LotUI) => void;
  onWithdraw?: (lot: LotUI) => void;
  onHistory?: (lot: LotUI) => void;
}

export function LotTableRow({
  lot,
  onEdit,
  onLock,
  onUnlock,
  onWithdraw,
  onHistory,
}: LotTableRowProps) {
  const statuses = getLotStatuses(lot);
  const isLocked = lot.status === "locked";
  const availableQty =
    lot.available_quantity !== undefined
      ? Number(lot.available_quantity)
      : Number(lot.current_quantity) -
        Number(lot.allocated_quantity) -
        Number(lot.locked_quantity || 0);

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-100 ${isLocked ? "opacity-60" : ""}`}>
      <td className="py-2 font-medium text-gray-900">{lot.lot_number}</td>
      <td className="py-2 text-sm text-gray-700">
        {(lot.supplier_name || lot.supplier_code || "-") as string}
      </td>
      <td className="py-2 text-right font-semibold">{fmt(Number(lot.current_quantity))}</td>
      <td className="py-2 text-gray-600">{lot.unit}</td>
      <td className="py-2 text-gray-600">
        {lot.received_date && !isNaN(new Date(lot.received_date).getTime())
          ? format(new Date(lot.received_date), "yyyy/MM/dd")
          : "-"}
      </td>
      <td className="py-2 text-gray-600">
        {lot.expiry_date && !isNaN(new Date(lot.expiry_date).getTime())
          ? format(new Date(lot.expiry_date), "yyyy/MM/dd")
          : "-"}
      </td>
      <td className="py-2">
        <div className="flex items-center gap-1">
          {statuses.map((s) => (
            <LotStatusIcon key={s} status={s} />
          ))}
        </div>
      </td>
      <td className="py-2 text-right text-gray-700">{fmt(Number(availableQty))}</td>
      <td className="py-2 text-right text-gray-700">
        {fmt(Number(lot.reserved_quantity_active || 0))}
      </td>
      <td className="py-2 text-right text-gray-700">{fmt(Number(lot.allocated_quantity))}</td>
      <td className="py-2 text-right text-gray-700">{fmt(Number(lot.locked_quantity || 0))}</td>
      <td className="py-2">
        <div className="flex items-center justify-end gap-1">
          {onWithdraw && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onWithdraw(lot);
              }}
              disabled={availableQty <= 0}
              title="出庫"
              className="text-blue-600 hover:text-blue-700"
            >
              <ArrowUpFromLine className="h-4 w-4" />
            </Button>
          )}
          {onHistory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onHistory(lot);
              }}
              title="出庫履歴"
            >
              <History className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(lot);
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
                onUnlock(lot);
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
                onLock(lot);
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
}

interface ExpandedLotDetailsProps {
  lots: LotUI[];
  onEditLot: (lot: LotUI) => void;
  onLockLot: (lot: LotUI) => void;
  onUnlockLot: (lot: LotUI) => void;
  onWithdrawLot?: (lot: LotUI) => void;
  onHistoryLot?: (lot: LotUI) => void;
}

export function ExpandedLotDetails({
  lots,
  onEditLot,
  onLockLot,
  onUnlockLot,
  onWithdrawLot,
  onHistoryLot,
}: ExpandedLotDetailsProps) {
  const availableTooltip = "利用可能 = 残量 − ロック − 確定引当";

  return (
    <tr>
      <td colSpan={10} className="bg-gray-50 p-0">
        <div className="px-12 py-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">ロット一覧 ({lots.length}件)</h4>
          {lots.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 text-left font-medium text-gray-600">ロット番号</th>
                  <th className="pb-2 text-left font-medium text-gray-600">仕入先</th>
                  <th className="pb-2 text-right font-medium text-gray-600">現在在庫</th>
                  <th className="pb-2 text-left font-medium text-gray-600">単位</th>
                  <th className="pb-2 text-left font-medium text-gray-600">入荷日</th>
                  <th className="pb-2 text-left font-medium text-gray-600">有効期限</th>
                  <th className="pb-2 text-left font-medium text-gray-600">ステータス</th>
                  <th
                    className="pb-2 text-right font-medium text-gray-600"
                    title={availableTooltip}
                  >
                    利用可能
                  </th>
                  <th className="pb-2 text-right font-medium text-gray-600">予約（未確定）</th>
                  <th className="pb-2 text-right font-medium text-gray-600">確定引当</th>
                  <th className="pb-2 text-right font-medium text-gray-600">ロック</th>
                  <th className="pb-2 text-right font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <LotTableRow
                    key={lot.id}
                    lot={lot}
                    onEdit={onEditLot}
                    onLock={onLockLot}
                    onUnlock={onUnlockLot}
                    onWithdraw={onWithdrawLot}
                    onHistory={onHistoryLot}
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-500">ロットがありません</p>
          )}
        </div>
      </td>
    </tr>
  );
}

interface InventoryRowProps {
  item: InventoryItem;
  isExpanded: boolean;
  lots: LotUI[];
  onToggleRow: (productId: number, warehouseId: number) => void;
  onRowClick?: (item: InventoryItem) => void;
  onViewDetail: (productId: number, warehouseId: number) => void;
  onEditLot: (lot: LotUI) => void;
  onLockLot: (lot: LotUI) => void;
  onUnlockLot: (lot: LotUI) => void;
  onWithdrawLot?: (lot: LotUI) => void;
  onHistoryLot?: (lot: LotUI) => void;
  columnWidths?: Record<string, string | number>;
}

export function InventoryRow({
  item,
  isExpanded,
  lots,
  onToggleRow,
  onRowClick,
  onViewDetail,
  onEditLot,
  onLockLot,
  onUnlockLot,
  onWithdrawLot,
  onHistoryLot,
  columnWidths,
}: InventoryRowProps) {
  return (
    <Fragment>
      <tr
        className={`${styles.table.tr} ${onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          onRowClick?.(item);
        }}
      >
        <td className={styles.table.td} style={{ width: columnWidths?.expander }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleRow(item.supplier_item_id, item.warehouse_id);
            }}
            className="rounded p-1 hover:bg-gray-100"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            )}
          </button>
        </td>
        <td className={styles.table.td} style={{ width: columnWidths?.product }}>
          <span
            className="block truncate"
            title={item.product_name || item.product_code || `ID: ${item.supplier_item_id}`}
          >
            {item.product_name || item.product_code || `ID: ${item.supplier_item_id}`}
          </span>
        </td>
        <td className={styles.table.td} style={{ width: columnWidths?.warehouse }}>
          <span
            className="block truncate"
            title={item.warehouse_name || item.warehouse_code || `ID: ${item.warehouse_id}`}
          >
            {item.warehouse_name || item.warehouse_code || `ID: ${item.warehouse_id}`}
          </span>
        </td>
        <td className={styles.table.tdRight} style={{ width: columnWidths?.lots }}>
          {lots.length}
        </td>
        <td className={styles.table.tdRight} style={{ width: columnWidths?.total }}>
          {fmt(item.total_quantity)}
        </td>
        <td
          className={`${styles.table.tdRight} text-orange-600`}
          style={{ width: columnWidths?.soft }}
        >
          {fmt(item.soft_allocated_quantity)}
        </td>
        <td
          className={`${styles.table.tdRight} font-medium text-red-600`}
          style={{ width: columnWidths?.hard }}
        >
          {fmt(item.hard_allocated_quantity)}
        </td>
        <td className={styles.table.tdRightGreen} style={{ width: columnWidths?.available }}>
          {fmt(item.available_quantity)}
        </td>
        <td className={styles.table.tdGray} style={{ width: columnWidths?.updated }}>
          {new Date(item.last_updated).toLocaleString("ja-JP")}
        </td>
        <td className={styles.table.tdRight} style={{ width: columnWidths?.actions }}>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail(item.supplier_item_id, item.warehouse_id);
            }}
          >
            詳細
          </Button>
        </td>
      </tr>
      {isExpanded && (
        <ExpandedLotDetails
          lots={lots}
          onEditLot={(lot) =>
            onEditLot({
              ...lot,
              warehouse_name: lot.warehouse_name || item.warehouse_name || item.warehouse_code,
            })
          }
          onLockLot={(lot) =>
            onLockLot({
              ...lot,
              warehouse_name: lot.warehouse_name || item.warehouse_name || item.warehouse_code,
            })
          }
          onUnlockLot={(lot) =>
            onUnlockLot({
              ...lot,
              warehouse_name: lot.warehouse_name || item.warehouse_name || item.warehouse_code,
            })
          }
          onWithdrawLot={
            onWithdrawLot
              ? (lot) =>
                  onWithdrawLot({
                    ...lot,
                    warehouse_name:
                      lot.warehouse_name || item.warehouse_name || item.warehouse_code,
                  })
              : undefined
          }
          onHistoryLot={
            onHistoryLot
              ? (lot) =>
                  onHistoryLot({
                    ...lot,
                    warehouse_name:
                      lot.warehouse_name || item.warehouse_name || item.warehouse_code,
                  })
              : undefined
          }
        />
      )}
    </Fragment>
  );
}
