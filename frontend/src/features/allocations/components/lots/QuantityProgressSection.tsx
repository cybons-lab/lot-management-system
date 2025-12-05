/**
 * Quantity progress section for allocation header.
 * Displays quantity info, progress bar, and action buttons.
 */
import { Button } from "@/components/ui";
import { cn } from "@/shared/libs/utils";

interface QuantityProgressSectionProps {
  required: number;
  allocated: number;
  hardAllocated?: number;
  softAllocated?: number;
  unit: string;
  onAutoAllocate: () => void;
  onClear: () => void;
  onSave: () => void;
  onConfirmHard?: () => void;
  isSaving: boolean;
  canSave: boolean;
}

export function QuantityProgressSection({
  required,
  allocated,
  hardAllocated = 0,
  softAllocated = 0,
  unit,
  onAutoAllocate,
  onClear,
  onSave,
  onConfirmHard,
  isSaving,
  canSave,
}: QuantityProgressSectionProps) {
  const remaining = Math.max(0, required - allocated);
  const isComplete = remaining === 0;
  const isOverAllocated = allocated > required;

  // Calculate percentages for stacked bar
  // Ensure we don't divide by zero
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
            <span className="text-3xl font-bold text-slate-900">
              {required.toLocaleString()}
            </span>
            <span className="text-sm font-medium text-slate-500">{unit}</span>
          </div>
        </div>

        <div className="text-right">
          {isComplete ? (
            <div className="mb-1 inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
              仮引当完了
            </div>
          ) : (
            <div className="text-sm font-medium text-slate-500">引当不足</div>
          )}
          <div className="flex items-center justify-end gap-3 text-sm">
            <span className="font-medium text-emerald-600">
              Hard: {hardAllocated.toLocaleString()}
            </span>
            <span className="font-medium text-amber-600">
              Soft: {softAllocated.toLocaleString()}
            </span>
            <span
              className={cn(
                "font-bold",
                isComplete ? "text-blue-600" : "text-slate-900",
                isOverAllocated && "text-red-600",
              )}
            >
              Total: {allocated.toLocaleString()}
            </span>
            <span className="text-slate-400">/</span>
            <span className={cn("font-medium", remaining > 0 ? "text-red-600" : "text-slate-400")}>
              残り: {remaining.toLocaleString()}
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

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={onAutoAllocate}
          disabled={isSaving || isComplete}
          className="h-9"
        >
          自動
        </Button>
        <Button
          variant="outline"
          onClick={onClear}
          disabled={isSaving || allocated === 0}
          className="h-9"
        >
          クリア
        </Button>
        <Button
          onClick={onSave}
          disabled={isSaving || !canSave}
          className="h-9 min-w-[6rem] bg-blue-600 font-bold text-white shadow-sm hover:bg-blue-700"
        >
          {isSaving ? "保存中..." : "保存"}
        </Button>
        {onConfirmHard && (
          <Button
            type="button"
            onClick={onConfirmHard}
            disabled={isSaving || allocated === 0}
            className="h-9 min-w-[4rem] flex-1 bg-purple-600 px-2 font-bold text-white shadow-sm hover:bg-purple-700"
          >
            Hard
          </Button>
        )}
      </div>
    </div>
  );
}
