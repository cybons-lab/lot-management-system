import { Calendar, Lock, PackageMinus, Pencil, Unlock } from "lucide-react";

import { Button } from "@/components/ui";
import type { LotUI } from "@/shared/libs/normalize";
import { calculateAvailable } from "@/shared/utils/decimal";

interface InventoryLotActionsProps {
    lot: LotUI;
    warehouseNameFallback?: string | null;
    onEdit: (lot: LotUI) => void;
    onUnlock: (lot: LotUI) => void;
    onLock: (lot: LotUI) => void;
    onWithdraw: (lot: LotUI) => void;
    onHistory: (lot: LotUI) => void;
}

export function InventoryLotActions({
    lot,
    warehouseNameFallback,
    onEdit,
    onUnlock,
    onLock,
    onWithdraw,
    onHistory,
}: InventoryLotActionsProps) {
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
    );
}
