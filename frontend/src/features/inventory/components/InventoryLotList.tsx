import { Calendar, Lock, PackageMinus, Pencil, Unlock } from "lucide-react";

import { Button } from "@/components/ui";
import type { LotUI } from "@/shared/libs/normalize";
import { calculateAvailable } from "@/shared/utils/decimal";
import { fmt } from "@/shared/utils/number";

interface InventoryLotListProps {
  lots: LotUI[];
  isLoading: boolean;
  /** Fallback warehouse name if not in lot data */
  warehouseNameFallback?: string | null;
  onEdit: (lot: LotUI) => void;
  onUnlock: (lot: LotUI) => void;
  onLock: (lot: LotUI) => void;
  onWithdraw: (lot: LotUI) => void;
  onHistory: (lot: LotUI) => void;
}

export function InventoryLotList({
  lots,
  isLoading,
  warehouseNameFallback,
  onEdit,
  onUnlock,
  onLock,
  onWithdraw,
  onHistory,
}: InventoryLotListProps) {
  if (isLoading && lots.length === 0) {
    return (
      <div className="px-8 py-4">
        <h4 className="mb-3 text-sm font-semibold text-gray-700">ロット一覧 (0件)</h4>
        <p className="text-sm text-gray-500">ロットを取得中...</p>
      </div>
    );
  }

  if (lots.length === 0) {
    return (
      <div className="px-8 py-4">
        <h4 className="mb-3 text-sm font-semibold text-gray-700">ロット一覧 (0件)</h4>
        <p className="text-sm text-gray-500">ロットがありません</p>
      </div>
    );
  }

  return (
    <div className="px-8 py-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-700">ロット一覧 ({lots.length}件)</h4>
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
          {lots.map((lot) => (
            <InventoryLotItem
              key={lot.id}
              lot={lot}
              warehouseNameFallback={warehouseNameFallback}
              onEdit={onEdit}
              onUnlock={onUnlock}
              onLock={onLock}
              onWithdraw={onWithdraw}
              onHistory={onHistory}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface InventoryLotItemProps {
  lot: LotUI;
  warehouseNameFallback?: string | null;
  onEdit: (lot: LotUI) => void;
  onUnlock: (lot: LotUI) => void;
  onLock: (lot: LotUI) => void;
  onWithdraw: (lot: LotUI) => void;
  onHistory: (lot: LotUI) => void;
}

// eslint-disable-next-line max-lines-per-function
function InventoryLotItem({
  lot,
  warehouseNameFallback,
  onEdit,
  onUnlock,
  onLock,
  onWithdraw,
  onHistory,
}: InventoryLotItemProps) {
  const lotWithWarehouseName = {
    ...lot,
    warehouse_name: lot.warehouse_name || warehouseNameFallback,
  };

  const available = calculateAvailable(
    lot.current_quantity,
    lot.allocated_quantity,
    lot.locked_quantity,
  );

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-2 font-medium text-gray-900">{lot.lot_number}</td>
      <td className="py-2 text-right font-semibold">{fmt(Number(lot.current_quantity))}</td>
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
        <span className="text-xs text-gray-500">
          {Number(lot.locked_quantity || 0) > 0 ? "ロック中" : "利用可"}
        </span>
      </td>
      <td className="py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(lotWithWarehouseName)}
            title="編集"
            className="h-7 w-7 p-0"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {Number(lot.locked_quantity || 0) > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUnlock(lotWithWarehouseName)}
              title="ロック解除"
              className="h-7 w-7 p-0"
            >
              <Unlock className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLock(lotWithWarehouseName)}
              title="ロック"
              className="h-7 w-7 p-0"
            >
              <Lock className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onWithdraw(lotWithWarehouseName)}
            title="出庫"
            className="h-7 w-7 p-0"
            disabled={available.lte(0)}
          >
            <PackageMinus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onHistory(lotWithWarehouseName)}
            title="履歴"
            className="h-7 w-7 p-0"
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
