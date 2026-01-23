import { Calendar, Lock, PackageMinus, Pencil, Unlock, Archive, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui";
import type { LotUI } from "@/shared/libs/normalize";
import { cn } from "@/shared/libs/utils";
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
  onUnarchive?: (lot: LotUI) => void;
}

export function InventoryLotActions({
  lot,
  warehouseNameFallback,
  onEdit,
  onUnlock,
  onLock,
  onWithdraw,
  onHistory,
  onArchive,
  onUnarchive,
}: InventoryLotActionsProps) {
  const lotWithWarehouseName = {
    ...lot,
    warehouse_name: lot.warehouse_name || warehouseNameFallback,
  };

  const available = parseDecimal(lot.available_quantity ?? "0");
  const isLocked = Number(lot.locked_quantity || 0) > 0;

  return (
    <div className="flex items-center justify-end gap-1">
      <ActionButton onClick={() => onEdit(lotWithWarehouseName)} title="編集" Icon={Pencil} />

      {isLocked ? (
        <ActionButton
          onClick={() => onUnlock(lotWithWarehouseName)}
          title="ロック解除"
          Icon={Unlock}
        />
      ) : (
        <ActionButton onClick={() => onLock(lotWithWarehouseName)} title="ロック" Icon={Lock} />
      )}

      <ActionButton
        onClick={() => onWithdraw(lotWithWarehouseName)}
        title="出庫"
        Icon={PackageMinus}
        disabled={available.lte(0)}
      />

      <ActionButton onClick={() => onHistory(lotWithWarehouseName)} title="履歴" Icon={Calendar} />

      {lot.status === "archived" ? (
        <ActionButton
          onClick={() => onUnarchive?.(lotWithWarehouseName)}
          title="アーカイブ解除"
          Icon={RotateCcw}
          className="text-slate-400 hover:text-green-600"
        />
      ) : (
        <ActionButton
          onClick={() => onArchive?.(lotWithWarehouseName)}
          title="アーカイブ"
          Icon={Archive}
          className="text-gray-400 hover:text-red-500"
        />
      )}
    </div>
  );
}

/**
 * 個別のアクションボタン用内部コンポーネント
 */
interface ActionButtonProps {
  onClick: () => void;
  title: string;
  Icon: React.ElementType;
  disabled?: boolean;
  className?: string;
}

function ActionButton({ onClick, title, Icon, disabled, className }: ActionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={title}
      className={cn("h-7 w-7 p-0", className)}
      disabled={disabled}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
