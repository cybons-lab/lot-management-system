/**
 * Allocation status badge component.
 * Determines and displays the current allocation status.
 */
import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";

import { cn } from "@/shared/libs/utils";

export type AllocationStatus = "overAllocated" | "confirmed" | "draft" | "partial" | "unallocated";

interface AllocationStatusBadgeProps {
  isOverAllocated: boolean;
  isComplete: boolean;
  totalAllocated: number;
  remainingQty: number;
  justSaved: boolean;
  canSave: boolean;
  lineStatus?: string | null;
}

export function useAllocationStatus({
  isOverAllocated,
  isComplete,
  totalAllocated,
  remainingQty,
  justSaved,
  canSave,
  lineStatus,
}: AllocationStatusBadgeProps): { status: AllocationStatus; colorClass: string } {
  const isPartial = totalAllocated > 0 && remainingQty > 0;

  if (isOverAllocated) {
    return {
      status: "overAllocated",
      colorClass: "bg-orange-100 text-orange-800 border-orange-200",
    };
  }

  if (isComplete) {
    const isConfirmed =
      lineStatus === "allocated" || lineStatus === "completed" || (justSaved && canSave === false);
    if (isConfirmed) {
      return {
        status: "confirmed",
        colorClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
      };
    }
    return { status: "draft", colorClass: "bg-indigo-100 text-indigo-800 border-indigo-200" };
  }

  if (isPartial) {
    return { status: "partial", colorClass: "bg-amber-100 text-amber-800 border-amber-200" };
  }

  return { status: "unallocated", colorClass: "bg-gray-100 text-gray-600 border-gray-200" };
}

interface StatusBadgeDisplayProps {
  status: AllocationStatus;
  colorClass: string;
}

export function AllocationStatusBadge({ status, colorClass }: StatusBadgeDisplayProps) {
  const badgeContent = {
    overAllocated: (
      <>
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-bold">在庫過剰</span>
      </>
    ),
    confirmed: (
      <>
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-bold">引当確定</span>
      </>
    ),
    draft: (
      <>
        <span className="i-lucide-pencil h-4 w-4" />
        <span className="text-sm font-bold">仮引当完了</span>
      </>
    ),
    partial: (
      <>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-bold">一部引当</span>
      </>
    ),
    unallocated: (
      <>
        <span className="i-lucide-circle-dashed h-4 w-4" />
        <span className="text-sm font-bold">未引当</span>
      </>
    ),
  };

  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5", colorClass)}>
      {badgeContent[status]}
    </div>
  );
}
