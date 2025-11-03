// frontend/src/features/orders/components/WarehouseBadges.tsx
import React from "react";
import { Badge } from "@/components/ui/badge";

export default function WarehouseBadges({
  list,
  unit,
}: {
  list: any[];
  unit: string;
}) {
  if (!list || list.length === 0) {
    return <span className="text-sm text-muted-foreground">未設定</span>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((a: any, idx: number) => (
        <Badge key={idx} variant="secondary" className="text-sm">
          {a?.warehouse_code}: {a?.quantity ?? a?.default_qty ?? 0} {unit}
        </Badge>
      ))}
    </div>
  );
}
