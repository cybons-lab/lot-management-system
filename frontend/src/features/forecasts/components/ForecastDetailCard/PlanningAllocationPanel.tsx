/**
 * PlanningAllocationPanel - Shows allocation_suggestions summary for a forecast group
 */

import { useQuery } from "@tanstack/react-query";
import { Package, AlertTriangle, Loader2 } from "lucide-react";

import { getPlanningAllocationSummary } from "@/features/allocations/api";
import { formatQuantity } from "@/shared/utils/formatQuantity";

interface LotBreakdownItem {
  lot_id: number;
  lot_number?: string | null;
  expiry_date?: string | null;
  planned_quantity: number;
}

interface PeriodItem {
  forecast_period: string;
  planned_quantity: number;
}

function LotBreakdownSection({ lots }: { lots: LotBreakdownItem[] }) {
  if (lots.length === 0) return null;
  return (
    <div className="space-y-1">
      <div className="text-xs text-slate-400">ロット別内訳:</div>
      <div className="max-h-24 overflow-y-auto">
        {lots.map((lot) => (
          <div
            key={lot.lot_id}
            className="flex items-center justify-between rounded px-2 py-0.5 text-xs hover:bg-slate-50"
          >
            <span className="truncate text-slate-600">
              {lot.lot_number || `Lot #${lot.lot_id}`}
              {lot.expiry_date && (
                <span className="ml-1 text-slate-400">(~{lot.expiry_date.substring(0, 10)})</span>
              )}
            </span>
            <span className="ml-2 font-medium text-slate-700">
              {formatQuantity(lot.planned_quantity, "PCS")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PeriodSection({ periods }: { periods: PeriodItem[] }) {
  if (periods.length <= 1) return null;
  return (
    <div className="space-y-1">
      <div className="text-xs text-slate-400">期間別:</div>
      <div className="flex flex-wrap gap-1">
        {periods.map((p) => (
          <span
            key={p.forecast_period}
            className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700"
          >
            {p.forecast_period}: {formatQuantity(p.planned_quantity, "PCS")}
          </span>
        ))}
      </div>
    </div>
  );
}

interface PlanningAllocationPanelProps {
  customerId: number;
  deliveryPlaceId: number;
  productId: number;
}

export function PlanningAllocationPanel({
  customerId,
  deliveryPlaceId,
  productId,
}: PlanningAllocationPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["planning-allocation-summary", customerId, deliveryPlaceId, productId],
    queryFn: () =>
      getPlanningAllocationSummary({
        customer_id: customerId,
        delivery_place_id: deliveryPlaceId,
        product_id: productId,
      }),
    staleTime: 30000, // 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>計画引当を読み込み中...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-red-400">
        <AlertTriangle className="h-3 w-3" />
        <span>計画引当の取得に失敗しました</span>
      </div>
    );
  }

  // データがないか、計画0かつ不足0の場合
  if (!data || (!data.has_data && !data.shortage_quantity)) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
        <Package className="h-3 w-3" />
        <span>計画引当データなし</span>
      </div>
    );
  }

  const hasShortage = (data.shortage_quantity || 0) > 0;

  return (
    <div className="space-y-2">
      <h5 className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        <Package className="h-3 w-3" />
        計画引当サマリ
        {hasShortage && (
          <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
            在庫不足
          </span>
        )}
      </h5>

      {/* 合計 */}
      <div className="space-y-1 rounded bg-slate-50 px-2 py-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">計画引当数量</span>
          <span className="text-sm font-bold text-slate-700">
            {formatQuantity(data.total_planned_quantity, "PCS")}
          </span>
        </div>

        {hasShortage && (
          <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-1">
            <span className="text-xs font-medium text-red-500">不足数量</span>
            <span className="text-sm font-bold text-red-600">
              -{formatQuantity(data.shortage_quantity, "PCS")}
            </span>
          </div>
        )}
      </div>

      <LotBreakdownSection lots={data.lot_breakdown} />
      <PeriodSection periods={data.by_period} />
    </div>
  );
}
