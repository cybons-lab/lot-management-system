/**
 * StatusBadge.tsx
 *
 * ステータス表示用バッジコンポーネント
 * - 汎用ステータスバッジ
 * - ロット専用ステータスバッジ
 * - 受注専用ステータスバッジ
 */

import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@/shared/libs/utils";

// ============================================
// 汎用ステータスバッジ
// ============================================

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-800 border border-gray-300",
        success: "bg-green-100 text-green-800 border border-green-300",
        warning: "bg-yellow-100 text-yellow-800 border border-yellow-300",
        error: "bg-red-100 text-red-800 border border-red-300",
        info: "bg-blue-100 text-blue-800 border border-blue-300",
        purple: "bg-purple-100 text-purple-800 border border-purple-300",
        gray: "bg-gray-100 text-gray-600 border border-gray-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
}

/**
 * 汎用ステータスバッジ
 *
 * @example
 * ```tsx
 * <StatusBadge variant="success">有効</StatusBadge>
 * <StatusBadge variant="warning">警告</StatusBadge>
 * <StatusBadge variant="error">エラー</StatusBadge>
 * ```
 */
export function StatusBadge({ children, variant, className, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}

// ============================================
// ロット専用ステータスバッジ
// ============================================

export type LotStatus = "available" | "allocated" | "shipped" | "expired" | "quarantine";

interface LotStatusConfig {
  label: string;
  variant: VariantProps<typeof statusBadgeVariants>["variant"];
}

const lotStatusConfig: Record<LotStatus, LotStatusConfig> = {
  available: {
    label: "在庫あり",
    variant: "success",
  },
  allocated: {
    label: "引当済",
    variant: "info",
  },
  shipped: {
    label: "出荷済",
    variant: "gray",
  },
  expired: {
    label: "期限切れ",
    variant: "error",
  },
  quarantine: {
    label: "検査中",
    variant: "warning",
  },
};

export interface LotStatusBadgeProps {
  status: LotStatus | string;
  className?: string;
}

/**
 * ロット専用ステータスバッジ
 *
 * @example
 * ```tsx
 * <LotStatusBadge status="available" />
 * <LotStatusBadge status="expired" />
 * ```
 */
export function LotStatusBadge({ status, className }: LotStatusBadgeProps) {
  const config = lotStatusConfig[status as LotStatus] || {
    label: status,
    variant: "default" as const,
  };

  return (
    <StatusBadge variant={config.variant} className={className}>
      {config.label}
    </StatusBadge>
  );
}

// ============================================
// 受注専用ステータスバッジ
// ============================================

export type OrderStatus =
  | "open"
  | "allocated"
  | "partial"
  | "shipped"
  | "closed"
  | "cancelled"
  | "PENDING_PROCUREMENT";

interface OrderStatusConfig {
  label: string;
  variant: VariantProps<typeof statusBadgeVariants>["variant"];
}

const orderStatusConfig: Record<OrderStatus, OrderStatusConfig> = {
  open: {
    label: "未引当",
    variant: "warning",
  },
  allocated: {
    label: "引当済",
    variant: "success",
  },
  partial: {
    label: "一部引当",
    variant: "info",
  },
  shipped: {
    label: "出荷済",
    variant: "gray",
  },
  closed: {
    label: "完了",
    variant: "gray",
  },
  cancelled: {
    label: "キャンセル",
    variant: "error",
  },
  PENDING_PROCUREMENT: {
    label: "発注待ち",
    variant: "purple",
  },
};

export interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

/**
 * 受注専用ステータスバッジ
 *
 * @example
 * ```tsx
 * <OrderStatusBadge status="open" />
 * <OrderStatusBadge status="allocated" />
 * ```
 */
export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = orderStatusConfig[status as OrderStatus] || {
    label: status,
    variant: "default" as const,
  };

  return (
    <StatusBadge variant={config.variant} className={className}>
      {config.label}
    </StatusBadge>
  );
}
