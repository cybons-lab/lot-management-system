/**
 * PlanningAllocationPanel - Shows allocation_suggestions summary for a forecast group
 */

import { useQuery } from "@tanstack/react-query";
import { Package, AlertTriangle, Loader2 } from "lucide-react";

import { getPlanningAllocationSummary } from "@/features/allocations/api";
import { formatQuantity } from "@/shared/utils/formatQuantity";

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

  if (!data || !data.has_data) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
        <Package className="h-3 w-3" />
        <span>計画引当データなし</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h5 className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        <Package className="h-3 w-3" />
        計画引当サマリ
      </h5>

      {/* 合計 */}
      <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1.5">
        <span className="text-xs text-slate-500">計画引当数量</span>
        <span className="text-sm font-bold text-slate-700">
          {formatQuantity(data.total_planned_quantity, "PCS")}
        </span>
      </div>

      {/* ロット別内訳 */}
      {data.lot_breakdown.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-slate-400">ロット別内訳:</div>
          <div className="max-h-24 overflow-y-auto">
            {data.lot_breakdown.map((lot) => (
              <div
                key={lot.lot_id}
                className="flex items-center justify-between rounded px-2 py-0.5 text-xs hover:bg-slate-50"
              >
                <span className="truncate text-slate-600">
                  {lot.lot_number || `Lot #${lot.lot_id}`}
                  {lot.expiry_date && (
                    <span className="ml-1 text-slate-400">
                      (~{lot.expiry_date.substring(0, 10)})
                    </span>
                  )}
                </span>
                <span className="ml-2 font-medium text-slate-700">
                  {formatQuantity(lot.planned_quantity, "PCS")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 期間別 */}
      {data.by_period.length > 1 && (
        <div className="space-y-1">
          <div className="text-xs text-slate-400">期間別:</div>
          <div className="flex flex-wrap gap-1">
            {data.by_period.map((p) => (
              <span
                key={p.forecast_period}
                className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700"
              >
                {p.forecast_period}: {formatQuantity(p.planned_quantity, "PCS")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
