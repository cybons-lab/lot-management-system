/**
 * Status section for allocation header.
 * Displays main status badge and warning/error indicators.
 */
import type { ReactNode } from "react";

interface StatusSectionProps {
  statusBadge: ReactNode;
  allocationCount: number;
  hasExpiryWarning: boolean;
  hasExpiredError: boolean;
  hasCandidates: boolean;
}

export function StatusSection({
  statusBadge,
  allocationCount,
  hasExpiryWarning,
  hasExpiredError,
  hasCandidates,
}: StatusSectionProps) {
  return (
    <div className="col-span-3 flex flex-col gap-4 pl-2">
      {/* Main Status Badge */}
      <div>{statusBadge}</div>

      {/* Info Tags */}
      <div className="flex flex-col gap-2">
        {allocationCount > 1 && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="i-lucide-layers h-3.5 w-3.5 text-gray-400" />
            <span>複数ロット引当 ({allocationCount})</span>
          </div>
        )}

        {hasExpiredError && (
          <div className="flex items-center gap-2 text-xs font-medium text-red-600">
            <span className="i-lucide-alert-octagon h-3.5 w-3.5" />
            <span>期限切れロットあり</span>
          </div>
        )}

        {hasExpiryWarning && (
          <div className="flex items-center gap-2 text-xs font-medium text-amber-600">
            <span className="i-lucide-alert-triangle h-3.5 w-3.5" />
            <span>期限切迫ロットあり</span>
          </div>
        )}

        {!hasCandidates && (
          <div className="flex items-center gap-2 text-xs font-medium text-red-600">
            <span className="i-lucide-alert-circle h-3.5 w-3.5" />
            <span>引当候補なし</span>
          </div>
        )}
      </div>
    </div>
  );
}
