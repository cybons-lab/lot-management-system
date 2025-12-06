/**
 * PrimaryBadge.tsx
 * 
 * 主担当者バッジ
 */

import { Crown } from "lucide-react";

import { Badge } from "@/components/ui";

interface PrimaryBadgeProps {
    className?: string;
}

export function PrimaryBadge({ className }: PrimaryBadgeProps) {
    return (
        <Badge
            variant="outline"
            className={`text-amber-600 border-amber-300 bg-amber-50 text-xs ${className ?? ""}`}
        >
            <Crown className="h-3 w-3 mr-1" />
            主担当
        </Badge>
    );
}
