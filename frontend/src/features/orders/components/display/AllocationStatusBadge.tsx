import { Badge } from "@/components/ui";

/**
 * 引当状況タイプ
 * - unallocated: 未引当
 * - soft: 仮引当のみ
 * - hard: 確定済のみ
 * - mixed: 仮引当+確定済混在
 */
export type AllocationStatusType = "unallocated" | "soft" | "hard" | "mixed";

interface AllocationStatusBadgeProps {
  softAllocated: number;
  hardAllocated: number;
  className?: string;
}

const statusConfig: Record<
  AllocationStatusType,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  unallocated: {
    label: "未引当",
    variant: "secondary",
    className: "bg-gray-100 text-gray-700",
  },
  soft: {
    label: "仮引当",
    variant: "outline",
    className: "bg-amber-100 text-amber-700 border-amber-300",
  },
  hard: {
    label: "確定済",
    variant: "default",
    className: "bg-emerald-100 text-emerald-700",
  },
  mixed: {
    label: "一部仮引当",
    variant: "outline",
    className: "bg-blue-100 text-blue-700 border-blue-300",
  },
};

/**
 * 引当状況を判定
 */
export function determineAllocationStatus(
  softAllocated: number,
  hardAllocated: number,
): AllocationStatusType {
  if (hardAllocated > 0 && softAllocated > 0) {
    return "mixed";
  }
  if (hardAllocated > 0) {
    return "hard";
  }
  if (softAllocated > 0) {
    return "soft";
  }
  return "unallocated";
}

/**
 * 引当状況バッジ
 *
 * SOFT/HARD引当の区別を表示:
 * - 未引当: グレー
 * - 仮引当: オレンジ (SOFTのみ)
 * - 確定済: 緑 (HARDのみ)
 * - 一部仮引当: 青 (SOFT + HARD混在)
 */
export function AllocationStatusBadge({
  softAllocated,
  hardAllocated,
  className,
}: AllocationStatusBadgeProps) {
  const status = determineAllocationStatus(softAllocated, hardAllocated);
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={`${config.className} ${className ?? ""}`}>
      {config.label}
    </Badge>
  );
}
