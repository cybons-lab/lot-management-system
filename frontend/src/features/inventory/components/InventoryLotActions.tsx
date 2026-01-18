import { Calendar, Lock, PackageMinus, Pencil, Unlock, Archive } from "lucide-react";

import { Button } from "@/components/ui";
import type { LotUI } from "@/shared/libs/normalize";
import { parseDecimal } from "@/shared/utils/decimal";

interface InventoryLotActionsProps {
  lot: LotUI;
  warehouseNameFallback?: string | null;
  onEdit: (lot: LotUI) => void;
  onUnlock: (lot: LotUI) => void;
  onLock: (lot: LotUI) => void;
  onWithdraw: (lot: LotUI) => void;
  onHistory: (lot: LotUI) => void;
  onArchive?: (lot: LotUI) => void;
}

// eslint-disable-next-line max-lines-per-function
export function InventoryLotActions({
  lot,
  warehouseNameFallback,
  onEdit,
  onUnlock,
  onLock,
  onWithdraw,
  onHistory,
  onArchive,
}: InventoryLotActionsProps) {
  const lotWithWarehouseName = {
    ...lot,
    warehouse_name: lot.warehouse_name || warehouseNameFallback,
  };

  // Use available_quantity from DB instead of recalculating
  const available = parseDecimal(lot.available_quantity ?? "0");

  return (
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
      {/* Archive Button (only for depleted or expired lots) */}
      {(lot.status === "depleted" || lot.status === "expired") &&
        parseDecimal(lot.current_quantity).eq(0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive?.(lotWithWarehouseName)} // Optional chaining for safe call
            title="アーカイブ"
            className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
          >
            <Archive className="h-4 w-4" />
          </Button>
        )}
    </div>
  );
}
