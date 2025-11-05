// frontend/src/features/orders/components/AllocationProgress.tsx
import React from "react";

type Props = {
  lineId?: number;
  progressPct: number;
  allocatedTotal: number;
  totalQty: number;
  unit: string;
  remainingQty: number;
};

export function AllocationProgress({
  progressPct,
  allocatedTotal,
  totalQty,
  unit,
  remainingQty,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">引当進捗</span>
      </div>

      <div className="relative">
        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
          <div
            className="bg-gradient-to-r from-sky-500 to-sky-600 h-full transition-all duration-300 flex items-center justify-end pr-2"
            style={{ width: `${progressPct}%` }}
          >
            <span className="text-xs font-semibold text-white">{progressPct}%</span>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-600 space-y-1">
        <div className="flex justify-between">
          <span>引当済:</span>
          <span className="font-medium">
            {allocatedTotal} {unit}
          </span>
        </div>
        <div className="flex justify-between">
          <span>合計:</span>
          <span className="font-medium">
            {totalQty} {unit}
          </span>
        </div>
        <div className="flex justify-between">
          <span>残数量:</span>
          <span className="font-medium text-amber-600">
            {remainingQty} {unit}
          </span>
        </div>
      </div>
    </div>
  );
}
