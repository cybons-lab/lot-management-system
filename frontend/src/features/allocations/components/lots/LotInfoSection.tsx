/**
 * Lot info section component for LotListCard.
 * Displays lot number, warehouse, and expiry date.
 */
import type { CandidateLotItem } from "../../api";

import { Badge } from "@/components/ui";
import { cn } from "@/shared/libs/utils";
import { formatDate } from "@/shared/utils/date";

interface LotInfoSectionProps {
  lot: CandidateLotItem;
  rank: number;
  allocatedQty: number;
  isExpired: boolean;
  freeQty: number;
}

export function LotInfoSection({
  lot,
  rank,
  allocatedQty,
  isExpired,
  freeQty,
}: LotInfoSectionProps) {
  const isLocked = lot.status === "locked" || lot.status === "quarantine";
  const lockReason = lot.lock_reason || (lot.status === "quarantine" ? "検疫中" : "ロック中");

  return (
    <div className="flex min-w-0 flex-grow items-center gap-x-4">
      {/* Rank Badge */}
      {rank && (
        <div className="shrink-0">
          <Badge
            className={cn(
              "hover:bg-opacity-90 h-6 w-8 justify-center rounded px-0 text-xs font-bold",
              rank === 1 && "bg-blue-600 text-white hover:bg-blue-700",
              rank === 2 && "bg-blue-400 text-white hover:bg-blue-500",
              rank === 3 && "bg-blue-300 text-white hover:bg-blue-400",
              rank > 3 && "bg-gray-100 text-gray-500 hover:bg-gray-200",
            )}
          >
            #{rank}
          </Badge>
        </div>
      )}

      <div className="min-w-[120px] shrink-0">
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold text-gray-400">LOT NO</div>
          {allocatedQty > 0 && (
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

      <div className="min-w-[120px] shrink-0">
        <div className="text-xs font-bold text-gray-400">保管倉庫</div>
        <div className="truncate text-sm text-gray-600" title={lot.warehouse_name ?? undefined}>
          {lot.warehouse_name || "未登録"}
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
