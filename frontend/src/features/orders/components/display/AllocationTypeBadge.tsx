import { Badge } from "@/components/ui";

type AllocationType = "soft" | "hard" | "unallocated";

interface AllocationTypeBadgeProps {
  allocationType: AllocationType;
  className?: string;
}

const allocationTypeConfig: Record<
  AllocationType,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  soft: { label: "Soft", variant: "outline" },
  hard: { label: "Hard", variant: "default" },
  unallocated: { label: "未引当", variant: "secondary" },
};

/**
 * 引当種別バッジ
 */
export function AllocationTypeBadge({ allocationType, className }: AllocationTypeBadgeProps) {
  const config = allocationTypeConfig[allocationType];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
