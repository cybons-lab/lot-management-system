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
      className={`border-amber-300 bg-amber-50 text-xs text-amber-600 ${className ?? ""}`}
    >
      <Crown className="mr-1 h-3 w-3" />
      主担当
    </Badge>
  );
}
