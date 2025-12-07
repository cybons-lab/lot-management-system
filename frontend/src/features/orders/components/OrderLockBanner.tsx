import { AlertCircle } from "lucide-react";

import type { OrderResponse } from "@/shared/types/aliases";

interface OrderLockBannerProps {
  order: OrderResponse;
  currentUserId: number;
}

export function OrderLockBanner({ order, currentUserId }: OrderLockBannerProps) {
  // Check if locked by another user
  if (!order.locked_by_user_id || order.locked_by_user_id === currentUserId) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-yellow-800">
      <AlertCircle className="h-5 w-5" />
      <div>
        <p className="font-medium">{order.locked_by_user_name || "別のユーザー"}が編集中です</p>
        <p className="text-sm">保存時に競合が発生する可能性があります。</p>
      </div>
    </div>
  );
}
