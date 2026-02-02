import { ChevronDown, ChevronRight, ExternalLink, PackageSearch } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

import { useLotAllocationForOrder } from "../../hooks/useLotAllocationForOrder";

import { OrderSummaryRow } from "./OrderSummaryRow";

import { Button } from "@/components/ui";
import type { ForecastGroup } from "@/features/forecasts/api";
import type { OrderWithLinesResponse } from "@/shared/types/aliases";
import { formatQuantity } from "@/shared/utils/formatQuantity";

interface RelatedOrdersSectionProps {
  group: ForecastGroup;
  hoveredDate?: string | null;
  onDateHover?: (date: string | null) => void;
}

interface OrderSummary {
  totalRequired: number;
  totalAllocated: number;
  count: number;
}

function useOrderSummary(
  orders: OrderWithLinesResponse[],
  productGroupId: number,
  deliveryPlaceId: number,
): OrderSummary {
  return useMemo(() => {
    let totalRequired = 0;
    let totalAllocated = 0;

    for (const order of orders) {
      for (const line of order.lines || []) {
        if (
          line.supplier_item_id === productGroupId &&
          line.delivery_place_id === deliveryPlaceId
        ) {
          totalRequired += Number(line.order_quantity || 0);
          const allocatedLots =
            (line as { allocated_lots?: { allocated_qty?: number }[] }).allocated_lots || [];
          const allocated = allocatedLots.reduce(
            (sum: number, lot: { allocated_qty?: number }) => sum + Number(lot.allocated_qty || 0),
            0,
          );
          totalAllocated += allocated;
        }
      }
    }

    return { totalRequired, totalAllocated, count: orders.length };
  }, [orders, productGroupId, deliveryPlaceId]);
}

function SummaryHeader({
  summary,
  unit,
  allocationRate,
  ordersPageLink,
  isExpanded,
  onToggle,
}: {
  summary: OrderSummary;
  unit: string;
  allocationRate: number;
  ordersPageLink: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="flex cursor-pointer items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 transition-colors hover:bg-slate-100"
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onToggle();
      }}
    >
      <div className="flex items-center gap-3">
        <PackageSearch className="h-4 w-4 text-slate-500" />
        <h4 className="text-sm font-semibold text-slate-700">仮受注 ({summary.count}件)</h4>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>
            必要: <strong>{formatQuantity(summary.totalRequired, unit)}</strong> {unit}
          </span>
          <span className="text-slate-300">|</span>
          <span>
            引当済:{" "}
            <strong
              className={
                allocationRate >= 100
                  ? "text-green-600"
                  : allocationRate > 0
                    ? "text-amber-600"
                    : "text-slate-500"
              }
            >
              {formatQuantity(summary.totalAllocated, unit)} {unit} ({allocationRate}%)
            </strong>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link to={ordersPageLink} onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
            <ExternalLink className="h-3 w-3" />
            受注管理で開く
          </Button>
        </Link>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </div>
    </div>
  );
}

function OrderSummaryRowWrapper({
  order,
  targetProductGroupId,
  targetDeliveryPlaceId,
  hoveredDate,
  onDateHover,
}: {
  order: OrderWithLinesResponse;
  targetProductGroupId: number;
  targetDeliveryPlaceId: number;
  hoveredDate?: string | null;
  onDateHover?: (date: string | null) => void;
}) {
  const logic = useLotAllocationForOrder(order);

  return (
    <OrderSummaryRow
      order={order}
      targetProductGroupId={targetProductGroupId}
      targetDeliveryPlaceId={targetDeliveryPlaceId}
      logic={logic}
      hoveredDate={hoveredDate}
      onDateHover={onDateHover}
    />
  );
}

export function RelatedOrdersSection({
  group,
  hoveredDate,
  onDateHover,
}: RelatedOrdersSectionProps) {
  const { group_key } = group;
  const orders = useMemo(() => group.related_orders || [], [group.related_orders]);
  const [isExpanded, setIsExpanded] = useState(false);

  const summary = useOrderSummary(orders, group_key.supplier_item_id, group_key.delivery_place_id);

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-gray-500">
        関連する仮受注はありません
      </div>
    );
  }

  const unit = group.forecasts?.[0]?.unit || "PCS";
  const allocationRate =
    summary.totalRequired > 0
      ? Math.round((summary.totalAllocated / summary.totalRequired) * 100)
      : 0;

  const ordersPageLink = `/orders?customer_id=${group_key.customer_id}&supplier_item_id=${group_key.supplier_item_id}&delivery_place_id=${group_key.delivery_place_id}`;

  return (
    <div className="mt-8 rounded-lg border border-slate-200 bg-white">
      <SummaryHeader
        summary={summary}
        unit={unit}
        allocationRate={allocationRate}
        ordersPageLink={ordersPageLink}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />

      {isExpanded && (
        <div className="px-2">
          {orders.map((order) => (
            <OrderSummaryRowWrapper
              key={order.id}
              order={order}
              targetProductGroupId={group_key.supplier_item_id}
              targetDeliveryPlaceId={group_key.delivery_place_id}
              hoveredDate={hoveredDate}
              onDateHover={onDateHover}
            />
          ))}
        </div>
      )}
    </div>
  );
}
