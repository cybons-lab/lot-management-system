import { Loader2, PackageSearch, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { useLotAllocationForOrder } from "../../hooks/useLotAllocationForOrder";
import { useOrdersForForecast } from "../../hooks/useOrdersForForecast";

import { OrderSummaryRow } from "./OrderSummaryRow";

import { Button } from "@/components/ui";
import type { ForecastGroup } from "@/features/forecasts/api";
import type { OrderWithLinesResponse } from "@/shared/types/aliases";

interface RelatedOrdersSectionProps {
  group: ForecastGroup;
}

export function RelatedOrdersSection({ group }: RelatedOrdersSectionProps) {
  const { group_key } = group;

  // 関連受注の取得
  const { data: orders, isLoading } = useOrdersForForecast({
    customer_id: group_key.customer_id,
    delivery_place_id: group_key.delivery_place_id,
    product_id: group_key.product_id,
  });

  // 自動引当（未実装）
  const handleAutoAllocate = () => {
    console.log("TODO: Implement auto-allocation for all orders");
    toast.info("一括自動引当機能は現在開発中です。各行を展開して個別に引当を行ってください。");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-gray-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        関連受注を検索中...
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-gray-500">
        関連する受注はありません
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-white">
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
          title="このフォーキャストグループの全受注に対して自動引当を実行します（未実装）"
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
}: {
  order: OrderWithLinesResponse;
  targetProductId: number;
  targetDeliveryPlaceId: number;
}) {
  const logic = useLotAllocationForOrder(order);

  return (
    <OrderSummaryRow
      order={order}
      targetProductId={targetProductId}
      targetDeliveryPlaceId={targetDeliveryPlaceId}
      logic={logic}
    />
  );
}
