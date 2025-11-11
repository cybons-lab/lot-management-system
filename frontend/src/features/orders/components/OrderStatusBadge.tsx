import { OrderStatus, ORDER_STATUS_DISPLAY } from "@/shared/types/aliases";

interface OrderStatusBadgeProps {
  status: string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  // ORDER_STATUS_DISPLAY から対応する表示情報を取得
  const display = ORDER_STATUS_DISPLAY[status as OrderStatus];

  // フォールバック（未知のステータスの場合）
  const label = display?.label ?? status;
  const variant = display?.variant ?? "bg-gray-100 text-gray-800";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${variant}`}
    >
      {label}
    </span>
  );
}
