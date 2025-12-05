import { Badge } from "@/components/ui";

type OrderType = "FORECAST_LINKED" | "KANBAN" | "SPOT" | "ORDER";

interface OrderTypeBadgeProps {
  orderType: OrderType;
  className?: string;
}

const orderTypeConfig: Record<
  OrderType,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  FORECAST_LINKED: { label: "FC", variant: "secondary" },
  KANBAN: { label: "KB", variant: "default" },
  SPOT: { label: "SP", variant: "outline" },
  ORDER: { label: "通常", variant: "outline" },
};

/**
 * 需要種別バッジ
 */
export function OrderTypeBadge({ orderType, className }: OrderTypeBadgeProps) {
  const config = orderTypeConfig[orderType] || orderTypeConfig.ORDER;

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
