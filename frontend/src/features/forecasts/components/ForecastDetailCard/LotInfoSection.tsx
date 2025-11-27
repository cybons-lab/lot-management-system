import { Badge } from "@/components/ui";
import { type CandidateLotItem } from "@/features/allocations/api";
import { type OrderLine } from "@/shared/types/aliases";
import { formatDate } from "@/shared/utils/date";

interface LotInfoSectionProps {
    lot: CandidateLotItem;
    line: OrderLine;
    currentQty: number;
    isLocked: boolean;
    isExpired: boolean;
}

export function LotInfoSection({
    lot,
    line,
    currentQty,
    isLocked,
    isExpired,
}: LotInfoSectionProps) {
    const lockReason = lot.lock_reason || (lot.status === "quarantine" ? "検疫中" : "ロック中");
    const freeQty = Number(lot.available_quantity ?? 0);

    return (
        <div className="flex min-w-0 flex-grow items-center gap-x-4">
            <div className="min-w-[120px] shrink-0">
                <div className="flex items-center gap-2">
                    <div className="text-xs font-bold text-gray-400">LOT NO</div>
                    {currentQty > 0 && (
                        <Badge className="h-5 bg-blue-500 px-1.5 text-[11px] font-bold text-white hover:bg-blue-600">
                            仮払出
                        </Badge>
                    )}
                    {isLocked && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
                            <span className="i-lucide-lock h-3 w-3" />
                            {lockReason}
                        </div>
                    )}
                </div>
                <div className="truncate text-base font-bold text-gray-900" title={lot.lot_number}>
                    {lot.lot_number}
                </div>
            </div>

            <div className="h-8 w-px shrink-0 bg-gray-100" />

            <div className="min-w-[150px] shrink-0">
                <div className="text-xs font-bold text-gray-400">物流フロー</div>
                <div className="truncate text-sm text-gray-600">
                    <span className="font-medium text-gray-700">
                        {lot.warehouse_name || lot.warehouse_code || lot.delivery_place_name || "倉庫未指定"}
                    </span>
                    <span className="mx-1 text-gray-400">→</span>
                    <span>{line.delivery_place_name || line.delivery_place_code || "納入先未指定"}</span>
                </div>
                {isExpired && freeQty > 0 && (
                    <div className="mt-0.5 flex items-center text-xs font-medium text-red-500">
                        <span className="i-lucide-alert-circle mr-1 h-3 w-3" />
                        期限切れ
                    </div>
                )}
            </div>

            <div className="h-8 w-px shrink-0 bg-gray-100" />

            <div className="min-w-[80px] shrink-0 flex-grow">
                <div className="text-xs font-bold text-gray-400">有効期限</div>
                <div className="text-sm text-gray-500">
                    {formatDate(lot.expiry_date, { fallback: "-" })}
                </div>
            </div>
        </div>
    );
}
