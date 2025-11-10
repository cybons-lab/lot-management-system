// frontend/src/features/orders/components/AllocationProgress.tsx

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
        <div className="h-6 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="flex h-full items-center justify-end bg-gradient-to-r from-sky-500 to-sky-600 pr-2 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          >
            <span className="text-xs font-semibold text-white">{progressPct}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-1 text-xs text-gray-600">
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
