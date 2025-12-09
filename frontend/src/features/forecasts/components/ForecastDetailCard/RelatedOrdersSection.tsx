import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PackageSearch, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { useLotAllocationForOrder } from "../../hooks/useLotAllocationForOrder";

import { OrderSummaryRow } from "./OrderSummaryRow";

import { Button } from "@/components/ui";
import { autoAllocateOrders } from "@/features/allocations/api";
import type { ForecastGroup } from "@/features/forecasts/api";
import { getAllocationQueryKeys, getForecastQueryKeys } from "@/shared/constants/query-keys";
import type { OrderWithLinesResponse } from "@/shared/types/aliases";

interface RelatedOrdersSectionProps {
  group: ForecastGroup;
  hoveredDate?: string | null;
  onDateHover?: (date: string | null) => void;
}

export function RelatedOrdersSection({
  group,
  hoveredDate,
  onDateHover,
}: RelatedOrdersSectionProps) {
  const { group_key } = group;
  const orders = group.related_orders || [];
  const queryClient = useQueryClient();

  const { mutate: executeAutoAllocate, isPending } = useMutation({
    mutationFn: autoAllocateOrders,
    onSuccess: (data) => {
      if (data.failure_count > 0) {
        toast.warning(data.message);
      } else {
        toast.success(data.message);
      }
      // 包括的にクエリ無効化（forecasts と allocations の両方）
      const allocationKeys = getAllocationQueryKeys();
      const forecastKeys = getForecastQueryKeys();
      [...allocationKeys, ...forecastKeys].forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
    onError: (error) => {
      toast.error("自動引当に失敗しました: " + (error as Error).message);
    },
  });

  const handleAutoAllocate = () => {
    if (orders.length === 0) return;
    const orderIds = orders.map((o) => o.id);
    executeAutoAllocate({ order_ids: orderIds });
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-gray-500">
        関連する受注はありません
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
        <div className="flex items-center gap-2">
          <PackageSearch className="h-4 w-4 text-slate-500" />
          <h4 className="text-sm font-semibold text-slate-700">関連受注 ({orders.length})</h4>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={handleAutoAllocate}
          disabled={isPending}
          title="このフォーキャストグループの全受注に対して自動引当を実行します"
        >
          <Wand2 className="h-3 w-3" />
          自動引当
        </Button>
      </div>

      <div className="px-2">
        {orders.map((order) => (
          <OrderSummaryRowWrapper
            key={order.id}
            order={order}
            targetProductId={group_key.product_id}
            targetDeliveryPlaceId={group_key.delivery_place_id}
            hoveredDate={hoveredDate}
            onDateHover={onDateHover}
          />
        ))}
      </div>
    </div>
  );
}

// Hooksを個別に呼び出すためのラッパー
function OrderSummaryRowWrapper({
  order,
  targetProductId,
  targetDeliveryPlaceId,
  hoveredDate,
  onDateHover,
}: {
  order: OrderWithLinesResponse;
  targetProductId: number;
  targetDeliveryPlaceId: number;
  hoveredDate?: string | null;
  onDateHover?: (date: string | null) => void;
}) {
  const logic = useLotAllocationForOrder(order);

  return (
    <OrderSummaryRow
      order={order}
      targetProductId={targetProductId}
      targetDeliveryPlaceId={targetDeliveryPlaceId}
      logic={logic}
      hoveredDate={hoveredDate}
      onDateHover={onDateHover}
    />
  );
}
