// frontend/src/features/orders/components/OrderLineHeader.tsx
import React from "react";
import { Calendar, CheckCircle2, AlertTriangle, Package } from "lucide-react";
import type { AllocationStatus } from "@/features/orders/hooks/useOrderLineComputed";

function formatYmd(value?: string | Date | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function StatusIcon({
  className,
  status,
}: {
  className?: string;
  status: AllocationStatus["key"];
}) {
  if (status === "done") return <CheckCircle2 className={className} />;
  if (status === "partial") return <Package className={className} />;
  return <AlertTriangle className={className} />;
}

export default function OrderLineHeader({
  productName,
  productCode,
  status,
  orderDate,
}: {
  productName?: string;
  productCode?: string;
  status: AllocationStatus;
  orderDate?: string | Date | null;
}) {
  return (
    <div
      className={`flex items-center justify-between border-b p-4 ${status.color} bg-opacity-10`}>
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold truncate">
            {productName ?? ""}{" "}
            <span className="text-muted-foreground">({productCode})</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1 text-sm">
          <StatusIcon
            className={`h-4 w-4 ${status.color.replace("bg-", "text-")}`}
            status={status.key}
          />
          <span className="font-medium">{status.label}</span>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          受注日:{" "}
          <span className="font-medium text-foreground">
            {formatYmd(orderDate)}
          </span>
        </div>
      </div>
    </div>
  );
}
