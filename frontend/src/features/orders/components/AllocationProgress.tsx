// frontend/src/features/orders/components/AllocationProgress.tsx
import React from "react";
import { Progress } from "@/components/ui/progress";

export default function AllocationProgress({
  lineId,
  progressPct,
  allocatedTotal,
  totalQty,
  unit,
  remainingQty,
}: {
  lineId?: number;
  progressPct: number;
  allocatedTotal: number;
  totalQty: number;
  unit: string;
  remainingQty: number;
}) {
  return (
    <div className="rounded-lg border p-3 bg-sky-50/40">
      <div className="flex items-center mb-2 text-sm">
        <span className="font-medium">引当進捗（行ID: {lineId ?? "-"}）</span>
      </div>
      <div className="relative">
        <Progress value={progressPct} className="h-2" />
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs font-semibold text-foreground">
          {allocatedTotal} / {totalQty} {unit}
        </div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        残り {remainingQty} {unit}
      </div>
    </div>
  );
}
