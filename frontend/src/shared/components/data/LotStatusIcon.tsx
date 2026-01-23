/**
 * LotStatusIcon.tsx
 *
 * ロットステータスをアイコンで表示するコンポーネント
 * ホバーで詳細をツールチップ表示
 */

import { Package, PackageX, AlertCircle, Clock, Calendar, Archive } from "lucide-react";

import { cn } from "@/shared/libs/utils";
import type { LotStatus } from "@/shared/utils/status";

export type LotStatusIconType = LotStatus;

interface LotStatusIconProps {
  status: LotStatusIconType;
  className?: string;
}

const STATUS_CONFIG: Record<
  LotStatusIconType,
  {
    Icon: typeof Calendar;
    label: string;
    color: string;
  }
> = {
  rejected: {
    Icon: AlertCircle,
    label: "廃棄/NG",
    color: "text-red-600",
  },
  qc_hold: {
    Icon: Clock,
    label: "検査/保留",
    color: "text-yellow-600",
  },
  expired: {
    Icon: Calendar,
    label: "期限切れ",
    color: "text-orange-600",
  },
  available: {
    Icon: Package,
    label: "在庫あり",
    color: "text-green-600",
  },
  empty: {
    Icon: PackageX,
    label: "在庫なし",
    color: "text-slate-400",
  },
  archived: {
    Icon: Archive,
    label: "アーカイブ",
    color: "text-slate-500",
  },
};

export function LotStatusIcon({ status, className }: LotStatusIconProps) {
  const config = STATUS_CONFIG[status];
  const { Icon, label, color } = config;

  return (
    <div className={cn("group relative inline-flex items-center", className)} title={label}>
      <Icon className={cn("h-4 w-4", color)} />
      {/* Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block">
        {label}
        <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}
