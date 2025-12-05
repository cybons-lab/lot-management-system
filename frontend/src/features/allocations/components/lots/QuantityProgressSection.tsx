/**
 * Quantity progress section for allocation header.
 * Displays quantity info, progress bar, and action buttons.
 */

interface QuantityProgressSectionProps {
  required: number;
  allocated: number;
  hardAllocated?: number;
  softAllocated?: number;
  unit: string;
}

export function QuantityProgressSection({
  required,
  allocated,
  hardAllocated = 0,
  softAllocated = 0,
  unit,
}: QuantityProgressSectionProps) {
  const safeRequired = required || 1;
  const hardPct = Math.min(100, (hardAllocated / safeRequired) * 100);
  // Soft percentage fills the rest up to total allocated, capped at 100% total
  const softPct = Math.min(100 - hardPct, (softAllocated / safeRequired) * 100);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="text-sm font-medium text-slate-500">必要数</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{required.toLocaleString()}</span>
            <span className="text-sm font-medium text-slate-500">{unit}</span>
          </div>
        </div>

        <div className="text-right">
          <div className="mb-1 flex items-center justify-end gap-3 text-sm">
            <span className="font-medium text-emerald-600">
              Hard: {hardAllocated.toLocaleString()}
            </span>
            <span className="font-medium text-amber-600">
              Soft: {softAllocated.toLocaleString()}
            </span>
            <span className="font-bold text-blue-600">Total: {allocated.toLocaleString()}</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-500">
              残り: {Math.max(0, required - allocated).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="flex h-full w-full">
          {/* Hard Allocation Bar (Green) */}
          <div
            style={{ width: `${hardPct}%` }}
            className="bg-emerald-500 transition-all duration-500 ease-out"
          />
          {/* Soft Allocation Bar (Amber) */}
          <div
            style={{ width: `${softPct}%` }}
            className="bg-amber-400 transition-all duration-500 ease-out"
          />
        </div>
      </div>
    </div>
  );
}
