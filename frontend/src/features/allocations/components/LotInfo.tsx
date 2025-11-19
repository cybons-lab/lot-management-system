import { formatDate } from "@/shared/utils/date";
import type { CandidateLotItem } from "../api";

interface LotInfoProps {
  lot: CandidateLotItem;
}

export function LotInfo({ lot }: LotInfoProps) {
  const lotLabel = lot.lot_number ?? `LOT-${lot.lot_id}`;
  const warehouseCode = lot.warehouse_code ?? null;
  const warehouseName = lot.warehouse_name ?? null;
  const warehouseDisplay =
    warehouseCode && warehouseName
      ? `${warehouseCode} / ${warehouseName}`
      : (warehouseCode ?? warehouseName ?? "-");

  return (
    <div className="flex flex-col gap-1 pb-2">
      {/* 1行目: ロット番号(左) - 期限(右) */}
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-bold text-gray-900" title={lotLabel}>
          {lotLabel}
        </span>
        <span className="text-xs whitespace-nowrap text-gray-500">
          <span className="mr-1 text-[10px] text-gray-400">期限:</span>
          {formatDate(lot.expiry_date, { fallback: "—" })}
        </span>
      </div>

      {/* 2行目: 倉庫情報 */}
      <div className="truncate text-xs text-gray-500" title={warehouseDisplay}>
        <span className="mr-1 text-[10px] text-gray-400">倉庫:</span>
        {warehouseDisplay}
      </div>
    </div>
  );
}
