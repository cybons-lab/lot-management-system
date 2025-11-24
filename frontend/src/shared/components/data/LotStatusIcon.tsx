/**
 * LotStatusIcon.tsx
 *
 * ロットステータスをアイコンで表示するコンポーネント
 * ホバーで詳細をツールチップ表示
 */

import { Lock, Package, PackageX, AlertCircle, Clock, Calendar } from "lucide-react";

import { cn } from "@/shared/libs/utils";

export type LotStatusIconType =
    | 'locked'
    | 'inspection_failed'
    | 'inspection_pending'
    | 'expired'
    | 'depleted'
    | 'available';

interface LotStatusIconProps {
    status: LotStatusIconType;
    className?: string;
}

const STATUS_CONFIG: Record<
    LotStatusIconType,
    {
        Icon: typeof Lock;
        label: string;
        color: string;
    }
> = {
    locked: {
        Icon: Lock,
        label: "ロック中",
        color: "text-gray-500",
    },
    inspection_failed: {
        Icon: AlertCircle,
        label: "検査不合格",
        color: "text-red-600",
    },
    inspection_pending: {
        Icon: Clock,
        label: "検査待ち",
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
    depleted: {
        Icon: PackageX,
        label: "在庫なし",
        color: "text-gray-400",
    },
};

export function LotStatusIcon({ status, className }: LotStatusIconProps) {
    const config = STATUS_CONFIG[status];
    const { Icon, label, color } = config;

    return (
        <div
            className={cn("group relative inline-flex items-center", className)}
            title={label}
        >
            <Icon className={cn("h-4 w-4", color)} />
            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
                {label}
                <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
        </div>
    );
}
